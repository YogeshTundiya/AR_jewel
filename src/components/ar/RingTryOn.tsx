"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getHandLandmarker, disposeDetectors } from "@/lib/mediapipe";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";

/* ------------------------------------------------------------------ */
/*  Ring product catalogue                                             */
/* ------------------------------------------------------------------ */
const RINGS = [
  { id: "diamond", label: "Diamond Solitaire", src: "/images/ring-diamond.png" },
  { id: "sapphire", label: "Royal Sapphire", src: "/images/ring-sapphire.png" },
];

/* ------------------------------------------------------------------ */
/*  Smoothing helper — exponential moving average to reduce jitter     */
/* ------------------------------------------------------------------ */
interface SmoothedPoint { x: number; y: number; scale: number; angle: number }

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function RingTryOn() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const smoothRef = useRef<SmoothedPoint>({ x: 0, y: 0, scale: 1, angle: 0 });
  const ringImageRef = useRef<HTMLImageElement | null>(null);
  const lastTimestampRef = useRef<number>(-1);

  const [status, setStatus] = useState<"loading" | "ready" | "detecting" | "error">("loading");
  const [selectedRing, setSelectedRing] = useState(RINGS[0]);
  const [handsDetected, setHandsDetected] = useState(false);

  /* ---------- Preload ring image ---------- */
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = selectedRing.src;
    img.onload = () => { ringImageRef.current = img; };
    img.onerror = () => { ringImageRef.current = null; };
  }, [selectedRing]);

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
      const handLandmarker = await getHandLandmarker();
      const timestamp = performance.now();

      // MediaPipe requires strictly increasing timestamps
      if (timestamp <= lastTimestampRef.current) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      lastTimestampRef.current = timestamp;

      const results: HandLandmarkerResult = handLandmarker.detectForVideo(video, timestamp);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.landmarks && results.landmarks.length > 0) {
        setHandsDetected(true);
        if (status !== "detecting") setStatus("detecting");

        for (const landmarks of results.landmarks) {
          drawRingOnHand(ctx, landmarks, canvas.width, canvas.height);
        }
      } else {
        setHandsDetected(false);
        if (status === "detecting") setStatus("ready");
      }
    } catch (err) {
      console.error("Hand detection error:", err);
    }

    rafRef.current = requestAnimationFrame(detect);
  }, [status]);

  /* ---------- Draw ring at ring-finger base ---------- */
  const drawRingOnHand = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      landmarks: { x: number; y: number; z: number }[],
      w: number,
      h: number
    ) => {
      const img = ringImageRef.current;
      if (!img) return;

      // Ring finger landmarks: 13=MCP, 14=PIP, 15=DIP, 16=TIP
      const mcp = landmarks[13]; // base of ring finger
      const pip = landmarks[14]; // first joint

      // Place ring between MCP and PIP
      const cx = ((mcp.x + pip.x) / 2) * w;
      const cy = ((mcp.y + pip.y) / 2) * h;

      // Calculate rotation from finger direction
      const dx = (pip.x - mcp.x) * w;
      const dy = (pip.y - mcp.y) * h;
      const angle = Math.atan2(dy, dx) + Math.PI / 2; // perpendicular to finger

      // Scale based on distance between landmarks (finger thickness proxy)
      const fingerLen = Math.hypot(dx, dy);
      const ringSize = fingerLen * 2.2; // scale factor

      // Smooth values to reduce jitter
      const s = smoothRef.current;
      const t = 0.35; // smoothing factor (lower = smoother but laggier)
      s.x = lerp(s.x, cx, t);
      s.y = lerp(s.y, cy, t);
      s.scale = lerp(s.scale, ringSize, t);
      s.angle = lerp(s.angle, angle, t);

      // Draw ring
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.drawImage(img, -s.scale / 2, -s.scale / 2, s.scale, s.scale);
      ctx.restore();

      // Optional: draw subtle landmark dots for debug
      // drawLandmarkDots(ctx, landmarks, w, h);
    },
    []
  );

  /* ---------- Camera + Detector init ---------- */
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    const init = async () => {
      try {
        // Start camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
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

        // Warm up detector (loads model from CDN — can take a few seconds)
        await getHandLandmarker();

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

    // Draw video frame
    ctx.drawImage(video, 0, 0);
    // Draw AR overlay on top
    ctx.drawImage(overlay, 0, 0);

    // Download
    const link = document.createElement("a");
    link.download = `ring-tryon-${Date.now()}.png`;
    link.href = shotCanvas.toDataURL("image/png");
    link.click();
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-black rounded-3xl">
      {/* Camera feed */}
      <div className="relative flex-1 min-h-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* AR overlay canvas — same size as video, drawn on top */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
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
                : handsDetected
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
                  : handsDetected
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-white/40"
              }`}
            />
            {status === "loading"
              ? "Loading AI Model…"
              : status === "error"
              ? "Camera Error"
              : handsDetected
              ? "Hand Detected — Ring Placed"
              : "Show Your Hand"}
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

      {/* Ring selector strip */}
      <div className="flex-shrink-0 p-3 bg-black/60 backdrop-blur-xl border-t border-white/10">
        <div className="flex gap-2 justify-center">
          {RINGS.map((ring) => (
            <button
              key={ring.id}
              onClick={() => setSelectedRing(ring)}
              className={`relative px-4 py-2 rounded-xl text-xs tracking-wider uppercase transition-all duration-300 ${
                selectedRing.id === ring.id
                  ? "bg-white text-black font-medium"
                  : "bg-white/5 text-white/50 hover:bg-white/10 border border-white/10"
              }`}
            >
              {ring.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
