"use client";

import { useEffect, useRef, useState, useCallback, useMemo, Suspense } from "react";
import Image from "next/image";
import { getHandLandmarker, getFaceLandmarker, disposeDetectors } from "@/lib/mediapipe";
import type { JewelryProduct, CategoryInfo } from "@/lib/jewelry-catalog";
import { PRODUCTS } from "@/lib/jewelry-catalog";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, ContactShadows, useGLTF } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Preload all GLB models at module level to avoid per-switch delay   */
/* ------------------------------------------------------------------ */
PRODUCTS.forEach((p) => {
  const url = p.model || p.image.replace("/images/", "/models/").replace(".png", ".glb");
  useGLTF.preload(url);
});

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

const SMOOTH_FACTOR = 0.15; // Lowered for extremely smooth tracking with less jitter

/* ------------------------------------------------------------------ */
/*  CameraSync — keeps OrthographicCamera frustum in pixel units       */
/* ------------------------------------------------------------------ */
function CameraSync({
  domSizeRef,
}: {
  domSizeRef: React.MutableRefObject<{ w: number; h: number }>;
}) {
  const { size } = useThree();
  const set = useThree((s) => s.set);

  useFrame(() => {
    // Keep orthographic camera frustum in sync with DOM pixel dimensions
    set(({ camera }) => {
      if (!(camera instanceof THREE.OrthographicCamera)) return {};
      camera.left = -size.width / 2;
      camera.right = size.width / 2;
      camera.top = size.height / 2;
      camera.bottom = -size.height / 2;
      camera.near = -1000;
      camera.far = 1000;
      camera.position.set(0, 0, 100);
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      domSizeRef.current = { w: size.width, h: size.height };
      return {};
    });
  });

  return null;
}

/* ------------------------------------------------------------------ */
/*  3D Model Component                                                 */
/* ------------------------------------------------------------------ */
function ARModel({
  product,
  smoothRef,
  domSizeRef,
  onLoaded,
}: {
  product: JewelryProduct;
  smoothRef: React.MutableRefObject<SmoothedValues>;
  domSizeRef: React.MutableRefObject<{ w: number; h: number }>;
  onLoaded: () => void;
}) {
  // Fix: correct fallback path uses /models/ not /images/
  const modelUrl = product.model || product.image.replace("/images/", "/models/").replace(".png", ".glb");
  const { scene } = useGLTF(modelUrl);
  const meshRef1 = useRef<THREE.Group>(null);
  const meshRef2 = useRef<THREE.Group>(null);

  // Deep clone for the second earring — avoids shared material artifacts
  const clonedScene = useMemo(() => {
    if (product.placement !== "ears" || !scene) return null;
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => m.clone());
        } else {
          mesh.material = (mesh.material as THREE.Material).clone();
        }
      }
    });
    return clone;
  }, [scene, product.placement]);

  const baseScaleRef = useRef(1);

  useEffect(() => {
    if (!scene) return;
    
    // Enhance 3D Materials for High-Quality Jewelry Rendering
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const enhanceMaterial = (mat: THREE.Material) => {
          if ('envMapIntensity' in mat) {
            (mat as THREE.MeshStandardMaterial).envMapIntensity = 3.5; // Boost environment reflections for maximum shine
          }
          if ('metalness' in mat) {
            (mat as THREE.MeshStandardMaterial).metalness = 1.0; // Force full metallic appearance
            (mat as THREE.MeshStandardMaterial).roughness = Math.min((mat as THREE.MeshStandardMaterial).roughness, 0.15); // Ensure surface is polished
          }
          mat.needsUpdate = true;
        };

        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(enhanceMaterial);
        } else {
          enhanceMaterial(mesh.material);
        }
      }
    });

    // Compute normalized scale so model fits a ~1 unit bounding box
    const box = new THREE.Box3().setFromObject(scene);
    const sizeVec = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
    if (maxDim > 0) { baseScaleRef.current = 1 / maxDim; }
    onLoaded();
  }, [scene, onLoaded]);

  useFrame(() => {
    const s = smoothRef.current;
    const dom = domSizeRef.current;
    if (dom.w === 0 || dom.h === 0) return;

    const updateMesh = (mesh: THREE.Group | null, index: number) => {
      if (!mesh) return;
      const x = index === 1 ? s.x : s.x2;
      const y = index === 1 ? s.y : s.y2;
      const w = index === 1 ? s.w : s.w2;
      const angle = index === 1 ? s.angle : s.angle2;

      if (w === 0) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;

      const worldX = x - dom.w / 2;
      const worldY = dom.h / 2 - y;

      mesh.position.set(worldX, worldY, 0);

      // Rotation adjustments per jewelry type
      let rotX = 0;
      let rotY = 0;

      if (product.placement === "ring-finger") {
        rotX = Math.PI / 2.5;
      } else if (product.placement === "wrist") {
        rotX = Math.PI / 2;
      } else if (product.placement === "ears") {
        rotY = index === 1 ? -Math.PI / 8 : Math.PI / 8;
      }

      mesh.rotation.set(rotX, rotY, angle);

      let scaleMultiplier = 1.0;
      if (product.placement === "ears") scaleMultiplier = 1.5;
      if (product.placement === "wrist") scaleMultiplier = 1.2;

      const finalScale = baseScaleRef.current * w * scaleMultiplier;
      mesh.scale.set(finalScale, finalScale, finalScale);
    };

    updateMesh(meshRef1.current, 1);
    if (product.placement === "ears") {
      updateMesh(meshRef2.current, 2);
    }
  });

  return (
    <group>
      <group ref={meshRef1}>
        <primitive object={scene} />
        {/* Occlusion mask to hide the back of the ring so it wraps around the finger */}
        {product.placement === "ring-finger" && (
          <mesh renderOrder={-1} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.1]}>
            <cylinderGeometry args={[0.38, 0.38, 2, 32]} />
            <meshBasicMaterial colorWrite={false} depthWrite={true} />
          </mesh>
        )}
        {/* Realistic contact shadow on the skin */}
        <ContactShadows position={[0, 0, -0.3]} opacity={0.6} scale={2} blur={1.5} far={1} />
      </group>

      {product.placement === "ears" && clonedScene && (
        <group ref={meshRef2}>
          <primitive object={clonedScene} />
          <ContactShadows position={[0, 0, -0.3]} opacity={0.6} scale={2} blur={1.5} far={1} />
        </group>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function ARViewport({ product, categoryInfo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(-1);
  const streamRef = useRef<MediaStream | null>(null);
  const initCountRef = useRef(0);

  const domSizeRef = useRef({ w: 0, h: 0 });
  const smoothRef = useRef<SmoothedValues>({
    x: 0, y: 0, w: 0, h: 0, angle: 0,
    x2: 0, y2: 0, w2: 0, h2: 0, angle2: 0,
  });

  const [status, setStatus] = useState<ARStatus>("loading");
  const [detected, setDetected] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);

  const isMirrored = categoryInfo.camera === "user";

  // Reset model loading state when product changes
  const [prevProductId, setPrevProductId] = useState(product.id);
  if (product.id !== prevProductId) {
    setPrevProductId(product.id);
    setModelLoading(true);
  }

  const getDomCoords = useCallback((nx: number, ny: number, domW: number, domH: number, vw: number, vh: number) => {
    const S = Math.max(domW / vw, domH / vh);
    const offsetX = (domW - vw * S) / 2;
    const offsetY = (domH - vh * S) / 2;
    return {
      x: offsetX + nx * vw * S,
      y: offsetY + ny * vh * S,
    };
  }, []);

  /* ================================================================ */
  /*  Detection loop                                                   */
  /* ================================================================ */
  const detect = useCallback(async () => {
    const video = videoRef.current;
    const container = containerRef.current;

    if (!video || !container || video.readyState < 2) {
      return;
    }

    const domW = container.clientWidth;
    const domH = container.clientHeight;
    domSizeRef.current = { w: domW, h: domH };

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const timestamp = performance.now();
    if (timestamp <= lastTimestampRef.current) {
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
            const mcp = landmarks[13];
            const pip = landmarks[14];

            const p1 = getDomCoords(mcp.x, mcp.y, domW, domH, vw, vh);
            const p2 = getDomCoords(pip.x, pip.y, domW, domH, vw, vh);

            const cx = (p1.x + p2.x) / 2;
            const cy = (p1.y + p2.y) / 2;
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const angle = Math.atan2(dy, dx) + Math.PI / 2;
            const size = Math.hypot(dx, dy) * 2.2;

            const s = smoothRef.current;
            s.x = s.w === 0 ? cx : lerp(s.x, cx, SMOOTH_FACTOR);
            s.y = s.w === 0 ? cy : lerp(s.y, cy, SMOOTH_FACTOR);
            s.w = s.w === 0 ? size : lerp(s.w, size, SMOOTH_FACTOR);
            s.angle = s.w === 0 ? angle : lerp(s.angle, angle, SMOOTH_FACTOR);

          } else if (product.placement === "wrist") {
            const wrist = landmarks[0];
            const mcp5 = landmarks[17];
            const mcp2 = landmarks[5];

            const c = getDomCoords(wrist.x, wrist.y, domW, domH, vw, vh);
            const pMcp5 = getDomCoords(mcp5.x, mcp5.y, domW, domH, vw, vh);
            const pMcp2 = getDomCoords(mcp2.x, mcp2.y, domW, domH, vw, vh);

            const wristWidth = Math.hypot(pMcp5.x - pMcp2.x, pMcp5.y - pMcp2.y) * 1.5;
            const angle = Math.atan2(pMcp5.y - pMcp2.y, pMcp5.x - pMcp2.x);

            const s = smoothRef.current;
            s.x = s.w === 0 ? c.x : lerp(s.x, c.x, SMOOTH_FACTOR);
            s.y = s.w === 0 ? c.y : lerp(s.y, c.y, SMOOTH_FACTOR);
            s.w = s.w === 0 ? wristWidth : lerp(s.w, wristWidth, SMOOTH_FACTOR);
            s.angle = s.w === 0 ? angle : lerp(s.angle, angle, SMOOTH_FACTOR);
          }
        } else {
          setDetected(false);
          smoothRef.current.w = 0;
        }
      } else {
        // face tracking
        const faceLandmarker = await getFaceLandmarker();
        const results = faceLandmarker.detectForVideo(video, timestamp);

        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          setDetected(true);
          const landmarks = results.faceLandmarks[0];

          if (product.placement === "neck") {
            const chin = landmarks[152];
            const forehead = landmarks[10];
            const leftJaw = landmarks[234];
            const rightJaw = landmarks[454];

            const pChin = getDomCoords(chin.x, chin.y, domW, domH, vw, vh);
            const pForehead = getDomCoords(forehead.x, forehead.y, domW, domH, vw, vh);
            const pLeftJaw = getDomCoords(leftJaw.x, leftJaw.y, domW, domH, vw, vh);
            const pRightJaw = getDomCoords(rightJaw.x, rightJaw.y, domW, domH, vw, vh);

            const faceWidth = Math.abs(pRightJaw.x - pLeftJaw.x);
            const faceHeight = Math.abs(pForehead.y - pChin.y);

            const cx = (pLeftJaw.x + pRightJaw.x) / 2;
            const cy = pChin.y + faceHeight * 0.22;
            const neckW = faceWidth * 1.4;
            const angle = Math.atan2(pRightJaw.y - pLeftJaw.y, pRightJaw.x - pLeftJaw.x);

            const s = smoothRef.current;
            s.x = s.w === 0 ? cx : lerp(s.x, cx, SMOOTH_FACTOR);
            s.y = s.w === 0 ? cy : lerp(s.y, cy, SMOOTH_FACTOR);
            s.w = s.w === 0 ? neckW : lerp(s.w, neckW, SMOOTH_FACTOR);
            s.angle = s.w === 0 ? angle : lerp(s.angle, angle, SMOOTH_FACTOR);

          } else if (product.placement === "ears") {
            const leftEar = landmarks[177]; // Lower earlobe left
            const rightEar = landmarks[401]; // Lower earlobe right
            const forehead = landmarks[10];
            const chin = landmarks[152];

            const pLeftEar = getDomCoords(leftEar.x, leftEar.y, domW, domH, vw, vh);
            const pRightEar = getDomCoords(rightEar.x, rightEar.y, domW, domH, vw, vh);
            const pForehead = getDomCoords(forehead.x, forehead.y, domW, domH, vw, vh);
            const pChin = getDomCoords(chin.x, chin.y, domW, domH, vw, vh);

            const faceHeight = Math.abs(pForehead.y - pChin.y);
            const earringSize = faceHeight * 0.25;
            const angle = Math.atan2(pRightEar.y - pLeftEar.y, pRightEar.x - pLeftEar.x);

            const lx = pLeftEar.x;
            const ly = pLeftEar.y + earringSize * 0.1;

            const rx = pRightEar.x;
            const ry = pRightEar.y + earringSize * 0.1;

            const s = smoothRef.current;
            s.x = s.w === 0 ? lx : lerp(s.x, lx, SMOOTH_FACTOR);
            s.y = s.w === 0 ? ly : lerp(s.y, ly, SMOOTH_FACTOR);
            s.w = s.w === 0 ? earringSize : lerp(s.w, earringSize, SMOOTH_FACTOR);
            s.angle = s.w === 0 ? angle : lerp(s.angle, angle, SMOOTH_FACTOR);

            s.x2 = s.w2 === 0 ? rx : lerp(s.x2, rx, SMOOTH_FACTOR);
            s.y2 = s.w2 === 0 ? ry : lerp(s.y2, ry, SMOOTH_FACTOR);
            s.w2 = s.w2 === 0 ? earringSize : lerp(s.w2, earringSize, SMOOTH_FACTOR);
            s.angle2 = s.w2 === 0 ? angle : lerp(s.angle2, angle, SMOOTH_FACTOR);
          }
        } else {
          setDetected(false);
          smoothRef.current.w = 0;
          smoothRef.current.w2 = 0;
        }
      }
    } catch (err) {
      console.error("Detection error:", err);
    }
  }, [product.trackingMode, product.placement, getDomCoords]);

  // Dedicated loop effect — manages the requestAnimationFrame cycle safely
  useEffect(() => {
    if (status !== "ready") return;

    let active = true;
    const loop = async () => {
      if (!active) return;
      await detect();
      if (active) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [detect, status]);

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

      smoothRef.current = {
        x: 0, y: 0, w: 0, h: 0, angle: 0,
        x2: 0, y2: 0, w2: 0, h2: 0, angle2: 0,
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
  }, [categoryInfo.camera, product.trackingMode]);

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

  const takeScreenshot = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const container = containerRef.current;
    if (!container) return;
    // Fix: preserveDrawingBuffer:true ensures this canvas has pixels
    const r3fCanvas = container.querySelector("canvas");

    const shotCanvas = document.createElement("canvas");
    
    // Match the exact DOM dimensions where the user sees the output
    const domW = container.clientWidth;
    const domH = container.clientHeight;
    shotCanvas.width = domW;
    shotCanvas.height = domH;
    const ctx = shotCanvas.getContext("2d")!;

    // Calculate object-cover dimensions to correctly slice the raw video
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const S = Math.max(domW / vw, domH / vh);
    const drawW = vw * S;
    const drawH = vh * S;
    const offsetX = (domW - drawW) / 2;
    const offsetY = (domH - drawH) / 2;

    if (isMirrored) {
      ctx.translate(domW, 0);
      ctx.scale(-1, 1);
    }
    // Draw cropped video exactly as object-cover does
    ctx.drawImage(video, offsetX, offsetY, drawW, drawH);
    if (isMirrored) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    if (r3fCanvas) {
      if (isMirrored) {
        ctx.translate(domW, 0);
        ctx.scale(-1, 1);
      }
      // R3F canvas natively matches the DOM container dimensions
      ctx.drawImage(r3fCanvas, 0, 0, domW, domH);
      if (isMirrored) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }

    const link = document.createElement("a");
    link.download = `${product.category}-tryon-${Date.now()}.png`;
    link.href = shotCanvas.toDataURL("image/png");
    link.click();
  }, [product.category, isMirrored]);

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

        {/* High-Quality 3D AR Overlay */}
        <div
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={isMirrored ? { transform: "scaleX(-1)" } : undefined}
        >
          {/* Fix: preserveDrawingBuffer:true — screenshots capture the 3D layer */}
          <Canvas
            orthographic
            camera={{ position: [0, 0, 100], near: -1000, far: 1000, zoom: 1 }}
            gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
          >
            {/* Sync camera frustum to exact DOM pixel dimensions */}
            <CameraSync domSizeRef={domSizeRef} />

            {/* High-End Jewelry Studio Lighting */}
            <ambientLight intensity={0.8} />
            <spotLight position={[10, 20, 10]} intensity={3} angle={0.2} penumbra={1} decay={0} />
            <pointLight position={[-10, -10, -10]} intensity={1.5} decay={0} />
            <Environment preset="studio" />

            {/* Post-Processing for Diamond Sparkle/Bloom */}
            <EffectComposer>
              <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.9} intensity={1.2} />
            </EffectComposer>

            <Suspense fallback={null}>
              <ARModel
                product={product}
                smoothRef={smoothRef}
                domSizeRef={domSizeRef}
                onLoaded={() => setModelLoading(false)}
              />
            </Suspense>
          </Canvas>
        </div>

        {/* GLB loading overlay — shown while the large model file downloads */}
        {modelLoading && status !== "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
            <div className="relative w-12 h-12 mb-3">
              <div className="absolute inset-0 rounded-full border border-white/10" />
              <div className="absolute inset-0 rounded-full border border-t-amber-400/80 animate-spin" />
            </div>
            <p className="text-[10px] text-white/40 tracking-[0.2em] uppercase">Loading 3D Model…</p>
          </div>
        )}

        {/* UI corner frame elements */}
        <div className="absolute inset-0 border-2 border-white/10 rounded-3xl pointer-events-none z-20" />
        <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-white/20 rounded-tl-lg pointer-events-none z-20" />
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-white/20 rounded-tr-lg pointer-events-none z-20" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-white/20 rounded-bl-lg pointer-events-none z-20" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-white/20 rounded-br-lg pointer-events-none z-20" />

        {/* Status badge */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
          <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full backdrop-blur-xl text-xs tracking-[0.15em] uppercase border transition-all duration-500 ${statusColor}`}>
            <span className={`w-2 h-2 rounded-full ${dotColor}`} />
            {statusText}
          </span>
        </div>

        {/* Product info chip */}
        <div className="absolute bottom-4 left-4 z-30">
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10">
            <div className="relative w-8 h-8 rounded-lg bg-white/10 overflow-hidden flex-shrink-0">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="32px"
                className="object-contain p-0.5"
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
            className="absolute bottom-4 right-4 z-30 w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all active:scale-90"
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
