"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getFaceLandmarker, disposeDetectors } from "@/lib/mediapipe";
import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";

/* ------------------------------------------------------------------ */
/*  Necklace product catalogue                                         */
/* ------------------------------------------------------------------ */
const NECKLACES = [
  { id: "gold", label: "Gold Chain", src: "/images/necklace-gold.png" },
  { id: "pearl", label: "Pearl Strand", src: "/images/necklace-pearl.png" },
];

/* ------------------------------------------------------------------ */
/*  Smoothing                                                          */
/* ------------------------------------------------------------------ */
interface SmoothedPoint { x: number; y: number; scaleW: number; scaleH: number; angle: number }

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function NecklaceTryOn() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const smoothRef = useRef<SmoothedPoint>({ x: 0, y: 0, scaleW: 1, scaleH: 1, angle: 0 });
  const necklaceImageRef = useRef<HTMLImageElement | null>(null);
  const lastTimestampRef = useRef<number>(-1);

  const [status, setStatus] = useState<"loading" | "ready" | "detecting" | "error">("loading");
  const [selectedNecklace, setSelectedNecklace] = useState(NECKLACES[0]);
  const [faceDetected, setFaceDetected] = useState(false);

  /* ---------- Preload necklace image ---------- */
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = selectedNecklace.src;
    img.onload = () => { necklaceImageRef.current = img; };
    img.onerror = () => { necklaceImageRef.current = null; };
  }, [selectedNecklace]);

  /* ---------- Main AR loop ---------- */
  const detect = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    const ctx = canvas.getContext("2d")!;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    try {
      const faceLandmarker = await getFaceLandmarker();
      const timestamp = performance.now();

      if (timestamp <= lastTimestampRef.current) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      lastTimestampRef.current = timestamp;

      const results: FaceLandmarkerResult = faceLandmarker.detectForVideo(video, timestamp);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        setFaceDetected(true);
        if (status !== "detecting") setStatus("detecting");

        const landmarks = results.faceLandmarks[0];
        drawNecklaceOnFace(ctx, landmarks, canvas.width, canvas.height);
      } else {
        setFaceDetected(false);
        if (status === "detecting") setStatus("ready");
      }
    } catch (err) {
      console.error("Face detection error:", err);
    }

    rafRef.current = requestAnimationFrame(detect);
  }, [status]);

  /* ---------- Draw necklace below chin ---------- */
  const drawNecklaceOnFace = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      landmarks: { x: number; y: number; z: number }[],
      w: number,
      h: number
    ) => {
      const img = necklaceImageRef.current;
      if (!img) return;

      /*
       * Key face landmarks:
       *  - 152: chin bottom
       *  - 10:  forehead top
       *  - 234: left cheek (outer)
       *  - 454: right cheek (outer)
       *  - 149: left jawline lower
       *  - 378: right jawline lower
       */

      const chin = landmarks[152];
      const forehead = landmarks[10];
      const leftJaw = landmarks[234];
      const rightJaw = landmarks[454];

      // Face measurements
      const faceWidth = Math.abs(rightJaw.x - leftJaw.x) * w;
      const faceHeight = Math.abs(forehead.y - chin.y) * h;

      // Necklace position: below chin, centred horizontally
      const cx = ((leftJaw.x + rightJaw.x) / 2) * w;
      // Place the necklace a bit below the chin
      const cy = chin.y * h + faceHeight * 0.22;

      // Necklace dimensions — scale relative to face width
      const neckWidth = faceWidth * 1.6;  // wider than face
      const neckHeight = neckWidth * (img.height / img.width); // maintain aspect ratio

      // Head tilt angle (roll)
      const dx = (rightJaw.x - leftJaw.x) * w;
      const dy = (rightJaw.y - leftJaw.y) * h;
      const angle = Math.atan2(dy, dx);

      // Smooth
      const s = smoothRef.current;
      const t = 0.3;
      s.x = lerp(s.x, cx, t);
      s.y = lerp(s.y, cy, t);
      s.scaleW = lerp(s.scaleW, neckWidth, t);
      s.scaleH = lerp(s.scaleH, neckHeight, t);
      s.angle = lerp(s.angle, angle, t);

      // Draw necklace
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.drawImage(img, -s.scaleW / 2, -s.scaleH / 4, s.scaleW, s.scaleH);
      ctx.restore();
    },
    []
  );

  /* ---------- Camera + Detector init ---------- */
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    const init = async () => {
      try {
        // Front-facing camera for necklace (user can see their face)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Warm up detector
        await getFaceLandmarker();

        if (!cancelled) {
          setStatus("ready");
          rafRef.current = requestAnimationFrame(detect);
        }
      } catch (err) {
        console.error("Init error:", err);
        if (!cancelled) setStatus("error");
      }
    };

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      disposeDetectors();
    };
  }, [detect]);

  /* ---------- Screenshot ---------- */
  const takeScreenshot = useCallback(() => {
    const video = videoRef.current;
    const overlay = canvasRef.current;
    if (!video || !overlay) return;

    const shotCanvas = document.createElement("canvas");
    shotCanvas.width = video.videoWidth;
    shotCanvas.height = video.videoHeight;
    const ctx = shotCanvas.getContext("2d")!;

    // Mirror the video (since front-facing is mirrored)
    ctx.translate(shotCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset

    // The overlay canvas already accounts for mirroring in landmark coords,
    // but we need to mirror it for the screenshot too
    ctx.translate(shotCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(overlay, 0, 0);

    const link = document.createElement("a");
    link.download = `necklace-tryon-${Date.now()}.png`;
    link.href = shotCanvas.toDataURL("image/png");
    link.click();
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-black rounded-3xl">
      {/* Camera feed (mirrored for selfie view) */}
      <div className="relative flex-1 min-h-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />

        {/* AR overlay canvas — also mirrored to match video */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ transform: "scaleX(-1)" }}
        />

        {/* Scan border */}
        <div className="absolute inset-0 border-2 border-white/10 rounded-3xl pointer-events-none" />

        {/* Status pill */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <span
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-full backdrop-blur-xl text-xs tracking-[0.15em] uppercase border transition-all duration-500 ${
              status === "loading"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                : status === "error"
                ? "bg-red-500/20 text-red-300 border-red-500/30"
                : faceDetected
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-white/10 text-white/60 border-white/10"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                status === "loading"
                  ? "bg-amber-400 animate-pulse"
                  : status === "error"
                  ? "bg-red-400"
                  : faceDetected
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-white/40"
              }`}
            />
            {status === "loading"
              ? "Loading AI Model…"
              : status === "error"
              ? "Camera Error"
              : faceDetected
              ? "Face Detected — Necklace Placed"
              : "Look at the Camera"}
          </span>
        </div>

        {/* Screenshot button */}
        {status !== "loading" && status !== "error" && (
          <button
            onClick={takeScreenshot}
            className="absolute bottom-4 right-4 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
            title="Capture screenshot"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          </button>
        )}
      </div>

      {/* Necklace selector strip */}
      <div className="flex-shrink-0 p-3 bg-black/60 backdrop-blur-xl border-t border-white/10">
        <div className="flex gap-2 justify-center">
          {NECKLACES.map((necklace) => (
            <button
              key={necklace.id}
              onClick={() => setSelectedNecklace(necklace)}
              className={`relative px-4 py-2 rounded-xl text-xs tracking-wider uppercase transition-all duration-300 ${
                selectedNecklace.id === necklace.id
                  ? "bg-white text-black font-medium"
                  : "bg-white/5 text-white/50 hover:bg-white/10 border border-white/10"
              }`}
            >
              {necklace.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
