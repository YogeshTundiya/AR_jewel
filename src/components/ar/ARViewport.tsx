"use client";

import { useEffect, useRef, useState, useCallback, Suspense, useMemo } from "react";
import { getHandLandmarker, getFaceLandmarker, disposeDetectors } from "@/lib/mediapipe";
import type { JewelryProduct, CategoryInfo } from "@/lib/jewelry-catalog";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrthographicCamera, ContactShadows, useGLTF } from "@react-three/drei";
import * as THREE from "three";

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

// Global tracking data to avoid React state overhead
const trackingData = {
  active: false,
  x: 0, y: 0, w: 100, h: 100, angle: 0,
  x2: 0, y2: 0, w2: 100, h2: 100, angle2: 0,
};

/* ------------------------------------------------------------------ */
/*  3D Model Configuration                                            */
/* ------------------------------------------------------------------ */
const modelConfig: Record<string, { url: string; baseScale: number; baseRotation: [number, number, number] }> = {
  "ring-diamond": { url: "/3D/ring-diamond.glb", baseScale: 1.8, baseRotation: [Math.PI / 2, 0, 0] },
  "ring-sapphire": { url: "/3D/ring-diamond.glb", baseScale: 1.8, baseRotation: [Math.PI / 2, 0, 0] },
  "bracelet-gold": { url: "/3D/bracelet-gold.glb", baseScale: 2.5, baseRotation: [Math.PI / 2, 0, 0] },
  "necklace-gold": { url: "/3D/necklace-gold.glb", baseScale: 3.0, baseRotation: [0, 0, 0] },
  "necklace-pearl": { url: "/3D/necklace-pearl.glb", baseScale: 3.0, baseRotation: [0, 0, 0] },
  "earring-diamond": { url: "/3D/earrings-diamond.glb", baseScale: 1.5, baseRotation: [0, 0, 0] },
  "earring-hoop": { url: "/3D/earrings-hoop.glb", baseScale: 1.5, baseRotation: [0, 0, 0] }
};

function GLTFModelNode({ url }: { url: string }) {
  // Pass `true` as 2nd arg to enable Draco decoding via CDN WASM
  const { scene } = useGLTF(url, true);
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    // Center the model at origin based on its bounding box
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.sub(center);
    return clone;
  }, [scene]);
  return <primitive object={clonedScene} />;
}

/* ------------------------------------------------------------------ */
/*  3D Model Component (Phase 3 HDRI Lighting)                         */
/* ------------------------------------------------------------------ */
function ARModel({ product }: { product: JewelryProduct }) {
  const meshRef1 = useRef<THREE.Group>(null);
  const meshRef2 = useRef<THREE.Group>(null);
  const { size } = useThree();

  const config = modelConfig[product.id] || modelConfig["ring-diamond"];

  useFrame(() => {
    if (!trackingData.active) {
      if (meshRef1.current) meshRef1.current.visible = false;
      if (meshRef2.current) meshRef2.current.visible = false;
      return;
    }
    
    // trackingData contains coordinates relative to the DOM container
    const w = size.width;
    const h = size.height;
    
    const px1 = trackingData.x - w / 2;
    const py1 = -(trackingData.y - h / 2);
    
    if (meshRef1.current) {
      meshRef1.current.visible = true;
      meshRef1.current.position.set(px1, py1, 0);
      meshRef1.current.rotation.set(config.baseRotation[0], config.baseRotation[1], config.baseRotation[2] - trackingData.angle);
      
      const scale = trackingData.w * config.baseScale;
      meshRef1.current.scale.set(scale, scale, scale);
    }
    
    if (meshRef2.current && product.placement === "ears") {
      meshRef2.current.visible = true;
      const px2 = trackingData.x2 - w / 2;
      const py2 = -(trackingData.y2 - h / 2);
      meshRef2.current.position.set(px2, py2, 0);
      meshRef2.current.rotation.set(config.baseRotation[0], config.baseRotation[1], config.baseRotation[2] - trackingData.angle2);
      
      const scale2 = trackingData.w2 * config.baseScale;
      meshRef2.current.scale.set(scale2, scale2, scale2);
    } else if (meshRef2.current) {
      meshRef2.current.visible = false;
    }
  });

  return (
    <>
      <group ref={meshRef1}>
        <GLTFModelNode url={config.url} />
      </group>
      {product.placement === "ears" && (
        <group ref={meshRef2}>
          <GLTFModelNode url={config.url} />
        </group>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function ARViewport({ product, categoryInfo }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(-1);
  const smoothRef = useRef<SmoothedValues>({
    x: 0, y: 0, w: 100, h: 100, angle: 0,
    x2: 0, y2: 0, w2: 100, h2: 100, angle2: 0,
  });
  const streamRef = useRef<MediaStream | null>(null);
  const initCountRef = useRef(0);

  const [status, setStatus] = useState<ARStatus>("loading");
  const [detected, setDetected] = useState(false);

  const isMirrored = categoryInfo.camera === "user";

  /* ================================================================ */
  /*  COORDINATE MAPPING (Normalized to Object-Cover Container)       */
  /* ================================================================ */
  const mapCoordinates = useCallback((nx: number, ny: number) => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return { x: 0, y: 0 };

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    const videoAspect = vw / vh;
    const containerAspect = cw / ch;

    let renderWidth, renderHeight;
    if (containerAspect > videoAspect) {
      renderWidth = cw;
      renderHeight = cw / videoAspect;
    } else {
      renderHeight = ch;
      renderWidth = ch * videoAspect;
    }

    const offsetX = (cw - renderWidth) / 2;
    const offsetY = (ch - renderHeight) / 2;

    // Flip X if mirrored
    const xRatio = isMirrored ? (1 - nx) : nx;
    
    return {
      x: offsetX + xRatio * renderWidth,
      y: offsetY + ny * renderHeight,
      renderWidth,
      renderHeight
    };
  }, [isMirrored]);

  /* ================================================================ */
  /*  PLACEMENT STRATEGIES                                             */
  /* ================================================================ */

  const updateRing = useCallback(
    (landmarks: { x: number; y: number; z: number }[]) => {
      const mcp = landmarks[13];
      const pip = landmarks[14];
      const pt1 = mapCoordinates(mcp.x, mcp.y);
      const pt2 = mapCoordinates(pip.x, pip.y);

      const cx = (pt1.x + pt2.x) / 2;
      const cy = (pt1.y + pt2.y) / 2;
      const dx = pt2.x - pt1.x;
      const dy = pt2.y - pt1.y;
      
      const angle = Math.atan2(dy, dx) + Math.PI / 2;
      const size = Math.hypot(dx, dy) * 2.2;

      const s = smoothRef.current;
      s.x = lerp(s.x, cx, SMOOTH_FACTOR);
      s.y = lerp(s.y, cy, SMOOTH_FACTOR);
      s.w = lerp(s.w, size, SMOOTH_FACTOR);
      s.angle = lerp(s.angle, angle, SMOOTH_FACTOR);
      
      Object.assign(trackingData, s, { active: true });
    },
    [mapCoordinates]
  );

  const updateBracelet = useCallback(
    (landmarks: { x: number; y: number; z: number }[]) => {
      const wrist = landmarks[0];
      const indexMcp = landmarks[5];
      const pinkyMcp = landmarks[17];
      
      const ptWrist = mapCoordinates(wrist.x, wrist.y);
      const ptIndex = mapCoordinates(indexMcp.x, indexMcp.y);
      const ptPinky = mapCoordinates(pinkyMcp.x, pinkyMcp.y);

      const cx = ptWrist.x;
      const cy = ptWrist.y;

      const dx = ptPinky.x - ptIndex.x;
      const dy = ptPinky.y - ptIndex.y;
      const wristWidth = Math.hypot(dx, dy) * 1.5;
      const angle = Math.atan2(dy, dx);

      const s = smoothRef.current;
      s.x = lerp(s.x, cx, SMOOTH_FACTOR);
      s.y = lerp(s.y, cy, SMOOTH_FACTOR);
      s.w = lerp(s.w, wristWidth, SMOOTH_FACTOR);
      s.angle = lerp(s.angle, angle, SMOOTH_FACTOR);

      Object.assign(trackingData, s, { active: true });
    },
    [mapCoordinates]
  );

  const updateNecklace = useCallback(
    (landmarks: { x: number; y: number; z: number }[]) => {
      const chin = landmarks[152];
      const forehead = landmarks[10];
      const leftJaw = landmarks[234];
      const rightJaw = landmarks[454];

      const ptChin = mapCoordinates(chin.x, chin.y);
      const ptForehead = mapCoordinates(forehead.x, forehead.y);
      const ptLeft = mapCoordinates(leftJaw.x, leftJaw.y);
      const ptRight = mapCoordinates(rightJaw.x, rightJaw.y);

      const faceWidth = Math.abs(ptRight.x - ptLeft.x);
      const faceHeight = Math.abs(ptForehead.y - ptChin.y);

      const cx = (ptLeft.x + ptRight.x) / 2;
      const cy = ptChin.y + faceHeight * 0.22;
      const neckW = faceWidth * 0.8;
      
      const dx = ptRight.x - ptLeft.x;
      const dy = ptRight.y - ptLeft.y;
      const angle = Math.atan2(dy, dx);

      const s = smoothRef.current;
      s.x = lerp(s.x, cx, SMOOTH_FACTOR);
      s.y = lerp(s.y, cy, SMOOTH_FACTOR);
      s.w = lerp(s.w, neckW, SMOOTH_FACTOR);
      s.angle = lerp(s.angle, angle, SMOOTH_FACTOR);

      Object.assign(trackingData, s, { active: true });
    },
    [mapCoordinates]
  );

  const updateEarrings = useCallback(
    (landmarks: { x: number; y: number; z: number }[]) => {
      const leftEar = landmarks[234];
      const rightEar = landmarks[454];
      const forehead = landmarks[10];
      const chin = landmarks[152];

      const ptLeft = mapCoordinates(leftEar.x, leftEar.y);
      const ptRight = mapCoordinates(rightEar.x, rightEar.y);
      const ptForehead = mapCoordinates(forehead.x, forehead.y);
      const ptChin = mapCoordinates(chin.x, chin.y);

      const faceHeight = Math.abs(ptForehead.y - ptChin.y);
      const earringSize = faceHeight * 0.3;

      const dx = ptRight.x - ptLeft.x;
      const dy = ptRight.y - ptLeft.y;
      const angle = Math.atan2(dy, dx);

      // Left earring
      const lx = ptLeft.x - earringSize * 0.15 * Math.cos(angle);
      const ly = ptLeft.y + earringSize * 0.4;

      // Right earring
      const rx = ptRight.x + earringSize * 0.15 * Math.cos(angle);
      const ry = ptRight.y + earringSize * 0.4;

      const s = smoothRef.current;
      s.x = lerp(s.x, lx, SMOOTH_FACTOR);
      s.y = lerp(s.y, ly, SMOOTH_FACTOR);
      s.w = lerp(s.w, earringSize, SMOOTH_FACTOR);
      s.angle = lerp(s.angle, angle, SMOOTH_FACTOR);
      
      s.x2 = lerp(s.x2, rx, SMOOTH_FACTOR);
      s.y2 = lerp(s.y2, ry, SMOOTH_FACTOR);
      s.w2 = lerp(s.w2, earringSize, SMOOTH_FACTOR);
      s.angle2 = lerp(s.angle2, angle, SMOOTH_FACTOR);

      Object.assign(trackingData, s, { active: true });
    },
    [mapCoordinates]
  );

  /* ================================================================ */
  /*  Detection loop                                                   */
  /* ================================================================ */
  const detect = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    const timestamp = performance.now();
    if (timestamp <= lastTimestampRef.current) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }
    lastTimestampRef.current = timestamp;

    try {
      if (product.trackingMode === "hand") {
        const handLandmarker = await getHandLandmarker();
        const results = handLandmarker.detectForVideo(video, timestamp);

        if (results.landmarks && results.landmarks.length > 0) {
          setDetected(true);
          const landmarks = results.landmarks[0];
          if (product.placement === "ring-finger") {
            updateRing(landmarks);
          } else if (product.placement === "wrist") {
            updateBracelet(landmarks);
          }
        } else {
          setDetected(false);
          trackingData.active = false;
        }
      } else {
        const faceLandmarker = await getFaceLandmarker();
        const results = faceLandmarker.detectForVideo(video, timestamp);

        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          setDetected(true);
          const landmarks = results.faceLandmarks[0];
          if (product.placement === "neck") {
            updateNecklace(landmarks);
          } else if (product.placement === "ears") {
            updateEarrings(landmarks);
          }
        } else {
          setDetected(false);
          trackingData.active = false;
        }
      }
    } catch (err) {
      console.error("Detection error:", err);
      trackingData.active = false;
    }

    rafRef.current = requestAnimationFrame(detect);
  }, [product.trackingMode, product.placement, updateRing, updateBracelet, updateNecklace, updateEarrings]);

  /* ================================================================ */
  /*  Camera + Detector init                                           */
  /* ================================================================ */
  useEffect(() => {
    let cancelled = false;
    const currentInit = ++initCountRef.current;

    const init = async () => {
      setStatus("loading");
      setDetected(false);
      trackingData.active = false;
      lastTimestampRef.current = -1;

      smoothRef.current = {
        x: 0, y: 0, w: 100, h: 100, angle: 0,
        x2: 0, y2: 0, w2: 100, h2: 100, angle2: 0,
      };

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
    <div ref={containerRef} className="relative w-full h-full flex flex-col overflow-hidden bg-black rounded-3xl">
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

        {/* 3D Canvas Overlay (replaces 2D canvas) */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <Canvas gl={{ alpha: true, antialias: true }}>
            <OrthographicCamera makeDefault position={[0, 0, 1000]} zoom={1} near={0.1} far={2000} />
            <Suspense fallback={null}>
              <Environment preset="studio" />
              <ARModel product={product} />
            </Suspense>
            <ambientLight intensity={1.5} />
            <directionalLight position={[10, 10, 5]} intensity={2} />
          </Canvas>
        </div>

        {/* Scan border */}
        <div className="absolute inset-0 border-2 border-white/10 rounded-3xl pointer-events-none z-20" />

        {/* Corner scan markers */}
        <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-white/20 rounded-tl-lg pointer-events-none z-20" />
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-white/20 rounded-tr-lg pointer-events-none z-20" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-white/20 rounded-bl-lg pointer-events-none z-20" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-white/20 rounded-br-lg pointer-events-none z-20" />

        {/* Status pill */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
          <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full backdrop-blur-xl text-xs tracking-[0.15em] uppercase border transition-all duration-500 ${statusColor}`}>
            <span className={`w-2 h-2 rounded-full ${dotColor}`} />
            {statusText}
          </span>
        </div>

        {/* Current product info badge */}
        <div className="absolute bottom-4 left-4 z-30">
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
      </div>
    </div>
  );
}
