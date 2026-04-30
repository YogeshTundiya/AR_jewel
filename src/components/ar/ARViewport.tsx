"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getHandLandmarker, getFaceLandmarker, disposeDetectors } from "@/lib/mediapipe";
import type { JewelryProduct, CategoryInfo } from "@/lib/jewelry-catalog";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Props {
  product: JewelryProduct;
  categoryInfo: CategoryInfo;
}

type ARStatus = "loading" | "ready" | "detecting" | "error";

interface SmoothedValues {
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  // Earring second point
  x2: number;
  y2: number;
  w2: number;
  h2: number;
  angle2: number;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const SMOOTH_FACTOR = 0.3;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function ARViewport({ product, categoryInfo }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(-1);
  const overlayImageRef = useRef<HTMLImageElement | null>(null);
  const smoothRef = useRef<SmoothedValues>({
    x: 0, y: 0, w: 100, h: 100, angle: 0,
    x2: 0, y2: 0, w2: 100, h2: 100, angle2: 0,
  });
  const streamRef = useRef<MediaStream | null>(null);
  const initCountRef = useRef(0);

  const [status, setStatus] = useState<ARStatus>("loading");
  const [detected, setDetected] = useState(false);

  const isMirrored = categoryInfo.camera === "user";

  /* ---------- Preload overlay image on product change ---------- */
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = product.image;
    img.onload = () => { overlayImageRef.current = img; };
    img.onerror = () => { overlayImageRef.current = null; };
  }, [product.image]);

  /* ================================================================ */
  /*  PLACEMENT STRATEGIES                                             */
  /* ================================================================ */

  /** Ring: place between ring finger MCP (13) and PIP (14) */
  const drawRing = useCallback(
    (ctx: CanvasRenderingContext2D, landmarks: { x: number; y: number; z: number }[], w: number, h: number) => {
      const img = overlayImageRef.current;
      if (!img) return;

      const mcp = landmarks[13];
      const pip = landmarks[14];
      const cx = ((mcp.x + pip.x) / 2) * w;
      const cy = ((mcp.y + pip.y) / 2) * h;
      const dx = (pip.x - mcp.x) * w;
      const dy = (pip.y - mcp.y) * h;
      const angle = Math.atan2(dy, dx) + Math.PI / 2;
      const size = Math.hypot(dx, dy) * 2.2;

      const s = smoothRef.current;
      s.x = lerp(s.x, cx, SMOOTH_FACTOR);
      s.y = lerp(s.y, cy, SMOOTH_FACTOR);
      s.w = lerp(s.w, size, SMOOTH_FACTOR);
      s.angle = lerp(s.angle, angle, SMOOTH_FACTOR);

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.drawImage(img, -s.w / 2, -s.w / 2, s.w, s.w);
      ctx.restore();
    },
    []
  );

  /** Bracelet: place at wrist (landmark 0) */
  const drawBracelet = useCallback(
    (ctx: CanvasRenderingContext2D, landmarks: { x: number; y: number; z: number }[], w: number, h: number) => {
      const img = overlayImageRef.current;
      if (!img) return;

      const wrist = landmarks[0];
      const mcp5 = landmarks[17]; // pinky MCP for scale reference
      const cx = wrist.x * w;
      const cy = wrist.y * h;

      // Wrist width estimate
      const dx = (mcp5.x - landmarks[5].x) * w; // pinky MCP to index MCP
      const dy = (mcp5.y - landmarks[5].y) * h;
      const wristWidth = Math.hypot(dx, dy) * 1.5;
      const braceletH = wristWidth * (img.height / img.width);
      const angle = Math.atan2(dy, dx);

      const s = smoothRef.current;
      s.x = lerp(s.x, cx, SMOOTH_FACTOR);
      s.y = lerp(s.y, cy, SMOOTH_FACTOR);
      s.w = lerp(s.w, wristWidth, SMOOTH_FACTOR);
      s.h = lerp(s.h, braceletH, SMOOTH_FACTOR);
      s.angle = lerp(s.angle, angle, SMOOTH_FACTOR);

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.drawImage(img, -s.w / 2, -s.h / 2, s.w, s.h);
      ctx.restore();
    },
    []
  );

  /** Necklace: place below chin */
  const drawNecklace = useCallback(
    (ctx: CanvasRenderingContext2D, landmarks: { x: number; y: number; z: number }[], w: number, h: number) => {
      const img = overlayImageRef.current;
      if (!img) return;

      const chin = landmarks[152];
      const forehead = landmarks[10];
      const leftJaw = landmarks[234];
      const rightJaw = landmarks[454];

      const faceWidth = Math.abs(rightJaw.x - leftJaw.x) * w;
      const faceHeight = Math.abs(forehead.y - chin.y) * h;

      const cx = ((leftJaw.x + rightJaw.x) / 2) * w;
      const cy = chin.y * h + faceHeight * 0.22;
      const neckW = faceWidth * 1.6;
      const neckH = neckW * (img.height / img.width);
      const dx = (rightJaw.x - leftJaw.x) * w;
      const dy = (rightJaw.y - leftJaw.y) * h;
      const angle = Math.atan2(dy, dx);

      const s = smoothRef.current;
      s.x = lerp(s.x, cx, SMOOTH_FACTOR);
      s.y = lerp(s.y, cy, SMOOTH_FACTOR);
      s.w = lerp(s.w, neckW, SMOOTH_FACTOR);
      s.h = lerp(s.h, neckH, SMOOTH_FACTOR);
      s.angle = lerp(s.angle, angle, SMOOTH_FACTOR);

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.drawImage(img, -s.w / 2, -s.h / 4, s.w, s.h);
      ctx.restore();
    },
    []
  );

  /** Earrings: place at left and right ear tragus landmarks */
  const drawEarrings = useCallback(
    (ctx: CanvasRenderingContext2D, landmarks: { x: number; y: number; z: number }[], w: number, h: number) => {
      const img = overlayImageRef.current;
      if (!img) return;

      // Ear tragus landmarks
      const leftEar = landmarks[234];   // left ear
      const rightEar = landmarks[454];  // right ear
      const forehead = landmarks[10];
      const chin = landmarks[152];

      const faceHeight = Math.abs(forehead.y - chin.y) * h;
      const earringSize = faceHeight * 0.3;
      const earringH = earringSize * (img.height / img.width);

      // Head tilt
      const dx = (rightEar.x - leftEar.x) * w;
      const dy = (rightEar.y - leftEar.y) * h;
      const angle = Math.atan2(dy, dx);

      // Left earring position (slightly below and outside the ear)
      const lx = leftEar.x * w - earringSize * 0.15;
      const ly = leftEar.y * h + earringSize * 0.4;

      // Right earring position
      const rx = rightEar.x * w + earringSize * 0.15;
      const ry = rightEar.y * h + earringSize * 0.4;

      const s = smoothRef.current;
      // Left earring
      s.x = lerp(s.x, lx, SMOOTH_FACTOR);
      s.y = lerp(s.y, ly, SMOOTH_FACTOR);
      s.w = lerp(s.w, earringSize, SMOOTH_FACTOR);
      s.h = lerp(s.h, earringH, SMOOTH_FACTOR);
      s.angle = lerp(s.angle, angle, SMOOTH_FACTOR);
      // Right earring
      s.x2 = lerp(s.x2, rx, SMOOTH_FACTOR);
      s.y2 = lerp(s.y2, ry, SMOOTH_FACTOR);
      s.w2 = lerp(s.w2, earringSize, SMOOTH_FACTOR);
      s.h2 = lerp(s.h2, earringH, SMOOTH_FACTOR);
      s.angle2 = lerp(s.angle2, angle, SMOOTH_FACTOR);

      // Draw left earring
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.drawImage(img, -s.w / 2, 0, s.w, s.h);
      ctx.restore();

      // Draw right earring (mirrored horizontally)
      ctx.save();
      ctx.translate(s.x2, s.y2);
      ctx.rotate(s.angle2);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -s.w2 / 2, 0, s.w2, s.h2);
      ctx.restore();
    },
    []
  );

  /* ================================================================ */
  /*  Detection loop                                                   */
  /* ================================================================ */
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

    const timestamp = performance.now();
    if (timestamp <= lastTimestampRef.current) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }
    lastTimestampRef.current = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      if (product.trackingMode === "hand") {
        const handLandmarker = await getHandLandmarker();
        const results = handLandmarker.detectForVideo(video, timestamp);

        if (results.landmarks && results.landmarks.length > 0) {
          setDetected(true);
          for (const landmarks of results.landmarks) {
            if (product.placement === "ring-finger") {
              drawRing(ctx, landmarks, canvas.width, canvas.height);
            } else if (product.placement === "wrist") {
              drawBracelet(ctx, landmarks, canvas.width, canvas.height);
            }
          }
        } else {
          setDetected(false);
        }
      } else {
        // face tracking
        const faceLandmarker = await getFaceLandmarker();
        const results = faceLandmarker.detectForVideo(video, timestamp);

        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          setDetected(true);
          const landmarks = results.faceLandmarks[0];
          if (product.placement === "neck") {
            drawNecklace(ctx, landmarks, canvas.width, canvas.height);
          } else if (product.placement === "ears") {
            drawEarrings(ctx, landmarks, canvas.width, canvas.height);
          }
        } else {
          setDetected(false);
        }
      }
    } catch (err) {
      console.error("Detection error:", err);
    }

    rafRef.current = requestAnimationFrame(detect);
  }, [product.trackingMode, product.placement, drawRing, drawBracelet, drawNecklace, drawEarrings]);

  /* ================================================================ */
  /*  Camera + Detector init                                           */
  /* ================================================================ */
  useEffect(() => {
    let cancelled = false;
    const currentInit = ++initCountRef.current;

    const init = async () => {
      setStatus("loading");
      setDetected(false);
      lastTimestampRef.current = -1;

      // Reset smooth values
      smoothRef.current = {
        x: 0, y: 0, w: 100, h: 100, angle: 0,
        x2: 0, y2: 0, w2: 100, h2: 100, angle2: 0,
      };

      // Stop previous stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      cancelAnimationFrame(rafRef.current);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: categoryInfo.camera,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (cancelled || currentInit !== initCountRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Warm up the right detector
        if (product.trackingMode === "hand") {
          await getHandLandmarker();
        } else {
          await getFaceLandmarker();
        }

        if (!cancelled && currentInit === initCountRef.current) {
          setStatus("ready");
          rafRef.current = requestAnimationFrame(detect);
        }
      } catch (err) {
        console.error("Init error:", err);
        if (!cancelled && currentInit === initCountRef.current) {
          setStatus("error");
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      disposeDetectors();
    };
  }, [categoryInfo.camera, product.trackingMode, detect]);

  /* ---------- Screenshot ---------- */
  const takeScreenshot = useCallback(() => {
    const video = videoRef.current;
    const overlay = canvasRef.current;
    if (!video || !overlay) return;

    const shot = document.createElement("canvas");
    shot.width = video.videoWidth;
    shot.height = video.videoHeight;
    const ctx = shot.getContext("2d")!;

    if (isMirrored) {
      ctx.translate(shot.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    if (isMirrored) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(shot.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(overlay, 0, 0);

    const link = document.createElement("a");
    link.download = `${product.category}-tryon-${Date.now()}.png`;
    link.href = shot.toDataURL("image/png");
    link.click();
  }, [product.category, isMirrored]);

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  const statusColor = status === "loading"
    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
    : status === "error"
    ? "bg-red-500/20 text-red-300 border-red-500/30"
    : detected
    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    : "bg-white/10 text-white/60 border-white/10";

  const dotColor = status === "loading"
    ? "bg-amber-400 animate-pulse"
    : status === "error"
    ? "bg-red-400"
    : detected
    ? "bg-emerald-400 animate-pulse"
    : "bg-white/40";

  const statusText = status === "loading"
    ? "Loading AI Model…"
    : status === "error"
    ? "Camera Error"
    : detected
    ? categoryInfo.detectedLabel
    : categoryInfo.waitingLabel;

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-black rounded-3xl">
      <div className="relative flex-1 min-h-0">
        {/* Video feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={isMirrored ? { transform: "scaleX(-1)" } : undefined}
        />

        {/* AR overlay canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={isMirrored ? { transform: "scaleX(-1)" } : undefined}
        />

        {/* Scan border */}
        <div className="absolute inset-0 border-2 border-white/10 rounded-3xl pointer-events-none" />

        {/* Corner scan markers */}
        <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-white/20 rounded-tl-lg pointer-events-none" />
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-white/20 rounded-tr-lg pointer-events-none" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-white/20 rounded-bl-lg pointer-events-none" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-white/20 rounded-br-lg pointer-events-none" />

        {/* Status pill */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full backdrop-blur-xl text-xs tracking-[0.15em] uppercase border transition-all duration-500 ${statusColor}`}>
            <span className={`w-2 h-2 rounded-full ${dotColor}`} />
            {statusText}
          </span>
        </div>

        {/* Current product info badge */}
        <div className="absolute bottom-4 left-4 z-10">
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10">
            <div className="w-8 h-8 rounded-lg bg-white/10 overflow-hidden flex-shrink-0">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div>
              <p className="text-[11px] text-white/80 font-medium leading-tight">{product.name}</p>
              <p className="text-[10px] text-white/30">{product.price}</p>
            </div>
          </div>
        </div>

        {/* Screenshot button */}
        {status !== "loading" && status !== "error" && (
          <button
            onClick={takeScreenshot}
            className="absolute bottom-4 right-4 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all active:scale-90"
            title="Capture screenshot"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
