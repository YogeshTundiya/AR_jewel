"use client";

import { useEffect, useRef, useState, useCallback, useMemo, Suspense } from "react";
import Image from "next/image";
import { getHandLandmarker, getFaceLandmarker, disposeDetectors } from "@/lib/mediapipe";
import type { JewelryProduct, CategoryInfo } from "@/lib/jewelry-catalog";
import { getProductsByCategory } from "@/lib/jewelry-catalog";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, ContactShadows, useGLTF } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { RefreshCcw, CameraOff, ShieldAlert, Video, Square, Download } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Landmark Constants                                                */
/* ------------------------------------------------------------------ */
const FACE = {
  FOREHEAD: 10,
  CHIN: 152,
  LEFT_JAW: 234,
  RIGHT_JAW: 454,
  LEFT_EAR: 177,
  RIGHT_EAR: 401,
};

const HAND = {
  WRIST: 0,
  INDEX_MCP: 5,
  RING_MCP: 13,
  RING_PIP: 14,
  PINKY_MCP: 17,
};

const SMOOTH_FACTOR = 0.15;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Props {
  product: JewelryProduct;
  categoryInfo: CategoryInfo;
}

type ARStatus = "loading" | "ready" | "detecting" | "error" | "denied";

interface SmoothedValues {
  x: number; y: number; w: number; h: number; angle: number;
  x2: number; y2: number; w2: number; h2: number; angle2: number;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/* ------------------------------------------------------------------ */
/*  CameraSync                                                         */
/* ------------------------------------------------------------------ */
function CameraSync({ domSizeRef }: { domSizeRef: React.MutableRefObject<{ w: number; h: number }> }) {
  const { size } = useThree();
  const set = useThree((s) => s.set);
  useFrame(() => {
    set(({ camera }) => {
      if (!(camera instanceof THREE.OrthographicCamera)) return {};
      camera.left = -size.width / 2;
      camera.right = size.width / 2;
      camera.top = size.height / 2;
      camera.bottom = -size.height / 2;
      camera.near = -1000;
      camera.far = 1000;
      camera.position.set(0, 0, 100);
      camera.updateProjectionMatrix();
      domSizeRef.current = { w: size.width, h: size.height };
      return {};
    });
  });
  return null;
}

/* ------------------------------------------------------------------ */
/*  3D Model Component with High-End Materials                         */
/* ------------------------------------------------------------------ */
function ARModel({ product, smoothRef, domSizeRef, onLoaded }: {
  product: JewelryProduct;
  smoothRef: React.MutableRefObject<SmoothedValues>;
  domSizeRef: React.MutableRefObject<{ w: number; h: number }>;
  onLoaded: () => void;
}) {
  const modelUrl = product.model || product.image.replace("/images/", "/models/").replace(".png", ".glb");
  const { scene } = useGLTF(modelUrl);
  const meshRef1 = useRef<THREE.Group>(null);
  const meshRef2 = useRef<THREE.Group>(null);

  const clonedScene = useMemo(() => {
    if (product.placement !== "ears" || !scene) return null;
    const clone = scene.clone(true);
    return clone;
  }, [scene, product.placement]);

  const baseScaleRef = useRef(1);

  const upgradeMaterials = useCallback((obj: THREE.Object3D) => {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const upgrade = (mat: THREE.Material) => {
          const name = mat.name.toLowerCase();
          if (name.includes("diamond") || name.includes("gem") || name.includes("stone") || name.includes("crystal")) {
            const gemstone = new THREE.MeshPhysicalMaterial({
              color: (mat as THREE.MeshStandardMaterial).color || 0xffffff,
              metalness: 0,
              roughness: 0,
              transmission: 1,
              thickness: 1.5,
              ior: 2.417, // Real diamond IOR
              //@ts-expect-error - dispersion is available in r170+
              dispersion: 15.0, // High dispersion for fire/sparkle
              envMapIntensity: 5.0,
              transparent: true,
            });
            mesh.material = gemstone;
          } 
          // Metal Enhancement
          else if (name.includes("gold") || name.includes("silver") || name.includes("metal") || name.includes("chrome")) {
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.envMapIntensity = 4.0;
              mat.metalness = 1.0;
              mat.roughness = 0.1;
            }
          }
        };

        if (Array.isArray(mesh.material)) mesh.material = mesh.material.map(m => { upgrade(m); return m; });
        else upgrade(mesh.material);
      }
    });
  }, []);

  useEffect(() => {
    if (!scene) return;
    upgradeMaterials(scene);
    if (clonedScene) upgradeMaterials(clonedScene);

    const box = new THREE.Box3().setFromObject(scene);
    const sizeVec = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
    if (maxDim > 0) baseScaleRef.current = 1 / maxDim;
    onLoaded();
  }, [scene, clonedScene, upgradeMaterials, onLoaded]);

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

      if (w === 0) { mesh.visible = false; return; }
      mesh.visible = true;

      mesh.position.set(x - dom.w / 2, dom.h / 2 - y, 0);

      let rotX = 0, rotY = 0;
      if (product.placement === "ring-finger") rotX = Math.PI / 2.5;
      else if (product.placement === "wrist") rotX = Math.PI / 2;
      else if (product.placement === "ears") rotY = index === 1 ? -Math.PI / 8 : Math.PI / 8;

      mesh.rotation.set(rotX, rotY, angle);

      let scaleMultiplier = 1.0;
      if (product.placement === "ears") scaleMultiplier = 1.6;
      if (product.placement === "wrist") scaleMultiplier = 1.3;
      if (product.placement === "neck") scaleMultiplier = 1.1;

      const finalScale = baseScaleRef.current * w * scaleMultiplier;
      mesh.scale.set(finalScale, finalScale, finalScale);
    };

    updateMesh(meshRef1.current, 1);
    if (product.placement === "ears") updateMesh(meshRef2.current, 2);
  });

  return (
    <group>
      <group ref={meshRef1}>
        <primitive object={scene} />
        {/* Advanced Occlusion Masks */}
        {product.placement === "ring-finger" && (
          <mesh renderOrder={-1} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.15]}>
            <cylinderGeometry args={[0.35, 0.35, 3, 32]} />
            <meshBasicMaterial colorWrite={false} depthWrite={true} />
          </mesh>
        )}
        {product.placement === "neck" && (
          <mesh renderOrder={-1} position={[0, 1.2, -0.8]} rotation={[-Math.PI / 6, 0, 0]}>
            <cylinderGeometry args={[1.5, 1.3, 3, 32]} />
            <meshBasicMaterial colorWrite={false} depthWrite={true} />
          </mesh>
        )}
        {product.placement === "ears" && (
          <mesh renderOrder={-1} position={[0.6, 0.2, -0.6]} rotation={[0, -Math.PI/6, 0]}>
            <boxGeometry args={[1, 2, 1.5]} />
            <meshBasicMaterial colorWrite={false} depthWrite={true} />
          </mesh>
        )}
        <ContactShadows position={[0, 0, -0.4]} opacity={0.6} scale={2} blur={1.5} far={1} />
      </group>

      {product.placement === "ears" && clonedScene && (
        <group ref={meshRef2}>
          <primitive object={clonedScene} />
          <mesh renderOrder={-1} position={[-0.6, 0.2, -0.6]} rotation={[0, Math.PI/6, 0]}>
            <boxGeometry args={[1, 2, 1.5]} />
            <meshBasicMaterial colorWrite={false} depthWrite={true} />
          </mesh>
          <ContactShadows position={[0, 0, -0.4]} opacity={0.6} scale={2} blur={1.5} far={1} />
        </group>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function ARViewport({ product, categoryInfo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(-1);
  const streamRef = useRef<MediaStream | null>(null);
  const initCountRef = useRef(0);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const domSizeRef = useRef({ w: 0, h: 0 });
  const smoothRef = useRef<SmoothedValues>({
    x: 0, y: 0, w: 0, h: 0, angle: 0, x2: 0, y2: 0, w2: 0, h2: 0, angle2: 0,
  });

  const [status, setStatus] = useState<ARStatus>("loading");
  const [detected, setDetected] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isMirrored = categoryInfo.camera === "user";

  const [prevProductId, setPrevProductId] = useState(product.id);
  if (product.id !== prevProductId) {
    setPrevProductId(product.id);
    setModelLoading(true);
  }

  useEffect(() => {
    const catProducts = getProductsByCategory(categoryInfo.id);
    catProducts.forEach((p) => {
      const url = p.model || p.image.replace("/images/", "/models/").replace(".png", ".glb");
      useGLTF.preload(url);
    });
  }, [categoryInfo.id]);

  const getDomCoords = useCallback((nx: number, ny: number, domW: number, domH: number, vw: number, vh: number) => {
    const S = Math.max(domW / vw, domH / vh);
    const offsetX = (domW - vw * S) / 2;
    const offsetY = (domH - vh * S) / 2;
    return { x: offsetX + nx * vw * S, y: offsetY + ny * vh * S };
  }, []);

  const detect = useCallback(async () => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container || video.readyState < 2) return;

    const domW = container.clientWidth;
    const domH = container.clientHeight;
    domSizeRef.current = { w: domW, h: domH };

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const timestamp = performance.now();
    if (timestamp <= lastTimestampRef.current) return;
    lastTimestampRef.current = timestamp;

    try {
      if (product.trackingMode === "hand") {
        const handLandmarker = await getHandLandmarker();
        const results = handLandmarker.detectForVideo(video, timestamp);
        if (results.landmarks && results.landmarks.length > 0) {
          setDetected(true);
          const landmarks = results.landmarks[0];
          if (product.placement === "ring-finger") {
            const mcp = landmarks[HAND.RING_MCP], pip = landmarks[HAND.RING_PIP];
            const p1 = getDomCoords(mcp.x, mcp.y, domW, domH, vw, vh), p2 = getDomCoords(pip.x, pip.y, domW, domH, vw, vh);
            const cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2, dx = p2.x - p1.x, dy = p2.y - p1.y;
            const angle = Math.atan2(dy, dx) + Math.PI / 2, size = Math.hypot(dx, dy) * 2.3;
            const s = smoothRef.current;
            s.x = s.w === 0 ? cx : lerp(s.x, cx, SMOOTH_FACTOR);
            s.y = s.w === 0 ? cy : lerp(s.y, cy, SMOOTH_FACTOR);
            s.w = s.w === 0 ? size : lerp(s.w, size, SMOOTH_FACTOR);
            s.angle = s.w === 0 ? angle : lerp(s.angle, angle, SMOOTH_FACTOR);
          } else if (product.placement === "wrist") {
            const wrist = landmarks[HAND.WRIST], mcp5 = landmarks[HAND.PINKY_MCP], mcp2 = landmarks[HAND.INDEX_MCP];
            const c = getDomCoords(wrist.x, wrist.y, domW, domH, vw, vh), pMcp5 = getDomCoords(mcp5.x, mcp5.y, domW, domH, vw, vh), pMcp2 = getDomCoords(mcp2.x, mcp2.y, domW, domH, vw, vh);
            const wristWidth = Math.hypot(pMcp5.x - pMcp2.x, pMcp5.y - pMcp2.y) * 1.6, angle = Math.atan2(pMcp5.y - pMcp2.y, pMcp5.x - pMcp2.x);
            const s = smoothRef.current;
            s.x = s.w === 0 ? c.x : lerp(s.x, c.x, SMOOTH_FACTOR); s.y = s.w === 0 ? c.y : lerp(s.y, c.y, SMOOTH_FACTOR);
            s.w = s.w === 0 ? wristWidth : lerp(s.w, wristWidth, SMOOTH_FACTOR); s.angle = s.w === 0 ? angle : lerp(s.angle, angle, SMOOTH_FACTOR);
          }
        } else { setDetected(false); smoothRef.current.w = 0; }
      } else {
        const faceLandmarker = await getFaceLandmarker();
        const results = faceLandmarker.detectForVideo(video, timestamp);
        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          setDetected(true);
          const landmarks = results.faceLandmarks[0];
          if (product.placement === "neck") {
            const chin = landmarks[FACE.CHIN], forehead = landmarks[FACE.FOREHEAD], leftJaw = landmarks[FACE.LEFT_JAW], rightJaw = landmarks[FACE.RIGHT_JAW];
            const pChin = getDomCoords(chin.x, chin.y, domW, domH, vw, vh), pForehead = getDomCoords(forehead.x, forehead.y, domW, domH, vw, vh), pLeftJaw = getDomCoords(leftJaw.x, leftJaw.y, domW, domH, vw, vh), pRightJaw = getDomCoords(rightJaw.x, rightJaw.y, domW, domH, vw, vh);
            const faceWidth = Math.abs(pRightJaw.x - pLeftJaw.x), faceHeight = Math.abs(pForehead.y - pChin.y);
            const cx = (pLeftJaw.x + pRightJaw.x) / 2, cy = pChin.y + faceHeight * 0.25, neckW = faceWidth * 1.45, angle = Math.atan2(pRightJaw.y - pLeftJaw.y, pRightJaw.x - pLeftJaw.x);
            const s = smoothRef.current;
            s.x = s.w === 0 ? cx : lerp(s.x, cx, SMOOTH_FACTOR); s.y = s.w === 0 ? cy : lerp(s.y, cy, SMOOTH_FACTOR);
            s.w = s.w === 0 ? neckW : lerp(s.w, neckW, SMOOTH_FACTOR); s.angle = s.w === 0 ? angle : lerp(s.angle, angle, SMOOTH_FACTOR);
          } else if (product.placement === "ears") {
            const leftEar = landmarks[FACE.LEFT_EAR], rightEar = landmarks[FACE.RIGHT_EAR], forehead = landmarks[FACE.FOREHEAD], chin = landmarks[FACE.CHIN];
            const pLeftEar = getDomCoords(leftEar.x, leftEar.y, domW, domH, vw, vh), pRightEar = getDomCoords(rightEar.x, rightEar.y, domW, domH, vw, vh), pForehead = getDomCoords(forehead.x, forehead.y, domW, domH, vw, vh), pChin = getDomCoords(chin.x, chin.y, domW, domH, vw, vh);
            const faceHeight = Math.abs(pForehead.y - pChin.y), earringSize = faceHeight * 0.28, angle = Math.atan2(pRightEar.y - pLeftEar.y, pRightEar.x - pLeftEar.x);
            const s = smoothRef.current;
            s.x = s.w === 0 ? pLeftEar.x : lerp(s.x, pLeftEar.x, SMOOTH_FACTOR); s.y = s.w === 0 ? pLeftEar.y + earringSize * 0.1 : lerp(s.y, pLeftEar.y + earringSize * 0.1, SMOOTH_FACTOR);
            s.w = s.w === 0 ? earringSize : lerp(s.w, earringSize, SMOOTH_FACTOR); s.angle = s.w === 0 ? angle : lerp(s.angle, angle, SMOOTH_FACTOR);
            s.x2 = s.w2 === 0 ? pRightEar.x : lerp(s.x2, pRightEar.x, SMOOTH_FACTOR); s.y2 = s.w2 === 0 ? pRightEar.y + earringSize * 0.1 : lerp(s.y2, pRightEar.y + earringSize * 0.1, SMOOTH_FACTOR);
            s.w2 = s.w2 === 0 ? earringSize : lerp(s.w2, earringSize, SMOOTH_FACTOR); s.angle2 = s.w2 === 0 ? angle : lerp(s.angle2, angle, SMOOTH_FACTOR);
          }
        } else { setDetected(false); smoothRef.current.w = 0; smoothRef.current.w2 = 0; }
      }
    } catch (err) { console.error("Detection error:", err); }
  }, [product.trackingMode, product.placement, getDomCoords]);

  useEffect(() => {
    if (status !== "ready") return;
    let active = true;
    const loop = async () => {
      if (!active) return;
      await detect();
      if (active) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { active = false; cancelAnimationFrame(rafRef.current); };
  }, [detect, status]);

  const initAR = useCallback(async () => {
    const currentInit = ++initCountRef.current;
    setStatus("loading"); setDetected(false); lastTimestampRef.current = -1;
    smoothRef.current = { x: 0, y: 0, w: 0, h: 0, angle: 0, x2: 0, y2: 0, w2: 0, h2: 0, angle2: 0 };
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    cancelAnimationFrame(rafRef.current);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: categoryInfo.camera, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (currentInit !== initCountRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      if (product.trackingMode === "hand") await getHandLandmarker(); else await getFaceLandmarker();
      if (currentInit === initCountRef.current) setStatus("ready");
    } catch (err: unknown) {
      console.error("Init error:", err);
      const error = err as Error;
      if (currentInit === initCountRef.current) setStatus(error.name === "NotAllowedError" ? "denied" : "error");
    }
  }, [categoryInfo.camera, product.trackingMode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initAR();
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
      disposeDetectors();
    };
  }, [initAR]);

  /* ------------------------------------------------------------------ */
  /*  Composite Helper (for Screenshots & Video)                         */
  /* ------------------------------------------------------------------ */
  const drawComposite = useCallback((ctx: CanvasRenderingContext2D, domW: number, domH: number) => {
    const video = videoRef.current;
    const r3fCanvas = containerRef.current?.querySelector("canvas");
    if (!video) return;

    const vw = video.videoWidth, vh = video.videoHeight;
    const S = Math.max(domW / vw, domH / vh);
    const drawW = vw * S, drawH = vh * S;
    const offsetX = (domW - drawW) / 2, offsetY = (domH - drawH) / 2;

    if (isMirrored) { ctx.translate(domW, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, offsetX, offsetY, drawW, drawH);
    if (isMirrored) ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (r3fCanvas) {
      if (isMirrored) { ctx.translate(domW, 0); ctx.scale(-1, 1); }
      ctx.drawImage(r3fCanvas, 0, 0, domW, domH);
      if (isMirrored) ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }, [isMirrored]);

  const takeScreenshot = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const shotCanvas = document.createElement("canvas");
    const domW = container.clientWidth, domH = container.clientHeight;
    shotCanvas.width = domW; shotCanvas.height = domH;
    const ctx = shotCanvas.getContext("2d")!;
    drawComposite(ctx, domW, domH);
    const link = document.createElement("a");
    link.download = `charmant-${product.category}-${Date.now()}.png`;
    link.href = shotCanvas.toDataURL("image/png");
    link.click();
  }, [product.category, drawComposite]);

  /* ------------------------------------------------------------------ */
  /*  Video Recording Implementation                                     */
  /* ------------------------------------------------------------------ */
  const startRecording = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const domW = container.clientWidth, domH = container.clientHeight;
    const compositeCanvas = document.createElement("canvas");
    compositeCanvas.width = domW; compositeCanvas.height = domH;
    compositeCanvasRef.current = compositeCanvas;
    const ctx = compositeCanvas.getContext("2d")!;

    const recordStream = compositeCanvas.captureStream(30);
    const recorder = new MediaRecorder(recordStream, { mimeType: 'video/webm;codecs=vp9' });
    
    chunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `charmant-tryon-${Date.now()}.webm`;
      link.click();
      compositeCanvasRef.current = null;
    };

    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    recorder.start();

    // Composite loop for recording
    const recordLoop = () => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
      drawComposite(ctx, domW, domH);
      requestAnimationFrame(recordLoop);
    };
    recordLoop();
  }, [drawComposite]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col overflow-hidden bg-[#050505] rounded-3xl group/viewport">
      <div className="relative flex-1 min-h-0">
        <video
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          disablePictureInPicture
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${status === "ready" ? "opacity-100" : "opacity-0"}`}
          style={isMirrored ? { transform: "scaleX(-1)" } : undefined}
        />

        {(status === "error" || status === "denied") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/90 backdrop-blur-xl p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
              {status === "denied" ? <CameraOff className="w-10 h-10 text-red-400" /> : <ShieldAlert className="w-10 h-10 text-red-400" />}
            </div>
            <h3 className="text-2xl font-light mb-4 tracking-tight">Camera Unavailable</h3>
            <p className="text-white/40 text-sm max-w-[320px] leading-relaxed mb-10">
              {status === "denied" ? "Please enable camera access to try on our exquisite collections." : "We encountered an error connecting to your camera."}
            </p>
            <button onClick={() => initAR()} className="flex items-center gap-4 px-10 py-4 bg-white text-black rounded-full text-xs uppercase tracking-[0.25em] font-semibold hover:bg-neutral-200 transition-all active:scale-95 shadow-2xl">
              <RefreshCcw className="w-4 h-4" /> Retry
            </button>
          </div>
        )}

        <div className="absolute inset-0 w-full h-full pointer-events-none z-10" style={isMirrored ? { transform: "scaleX(-1)" } : undefined}>
          <Canvas orthographic camera={{ position: [0, 0, 100], near: -1000, far: 1000, zoom: 1 }} gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }}>
            <CameraSync domSizeRef={domSizeRef} />
            <ambientLight intensity={1.5} />
            <spotLight position={[15, 25, 15]} intensity={6} angle={0.3} penumbra={1} decay={0} />
            <pointLight position={[-15, -15, -15]} intensity={3} decay={0} />
            <Environment preset="studio" />
            <EffectComposer multisampling={4}>
              <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.95} intensity={2.0} radius={0.5} />
            </EffectComposer>
            <Suspense fallback={null}>
              {status === "ready" && <ARModel product={product} smoothRef={smoothRef} domSizeRef={domSizeRef} onLoaded={() => setModelLoading(false)} />}
            </Suspense>
          </Canvas>
        </div>

        {(status === "loading" || modelLoading) && status !== "error" && status !== "denied" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none bg-black/40 backdrop-blur-md">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-white/5" />
              <div className="absolute inset-0 rounded-full border-2 border-t-amber-400 animate-spin" />
            </div>
            <p className="text-[11px] text-white/60 tracking-[0.4em] uppercase font-light animate-pulse">Refining AR Experience</p>
          </div>
        )}

        {/* Viewport UI Overlay */}
        <div className="absolute inset-0 border border-white/10 rounded-3xl pointer-events-none z-20" />
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-30">
          <span className={`inline-flex items-center gap-2.5 px-4 py-2 sm:px-6 sm:py-3 rounded-full backdrop-blur-3xl text-[9px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.25em] uppercase border transition-all duration-1000 ${status === "ready" && detected ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/10 text-white/40"}`}>
            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${status === "ready" && detected ? "bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "bg-white/20"}`} />
            {status === "ready" && detected ? categoryInfo.detectedLabel : (status === "loading" ? "Initialising" : "Looking for tracking")}
          </span>
        </div>

        {/* Actions Menu */}
        {status === "ready" && !modelLoading && (
          <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-30 flex flex-col items-center gap-3 sm:gap-5">
            {/* Video Record Toggle */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl group/rec ${isRecording ? "bg-red-500 animate-pulse" : "bg-white/10 hover:bg-white/20 border border-white/20"}`}
              title={isRecording ? "Stop Recording" : "Record Video"}
              aria-label={isRecording ? "Stop Recording" : "Record Video"}
            >
              {isRecording ? <Square className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" /> : <Video className="w-5 h-5 sm:w-7 sm:h-7 text-white" />}
            </button>

            {/* Photo Capture */}
            <button
              onClick={takeScreenshot}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-90 transition-all duration-300 shadow-[0_0_50px_rgba(255,255,255,0.15)] group/cam"
              title="Capture Image"
              aria-label="Capture Image"
            >
              <Download className="w-5 h-5 sm:w-7 sm:h-7 group-hover/cam:translate-y-1 transition-transform" />
            </button>
          </div>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-30 flex items-center gap-2 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full bg-red-500/20 border border-red-500/30 backdrop-blur-md">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[8px] sm:text-[10px] text-red-400 tracking-[0.1em] sm:tracking-[0.2em] uppercase font-bold">Recording</span>
          </div>
        )}

        {/* Product Card */}
        <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 z-30 max-w-[calc(100%-140px)]">
          <div className="flex items-center gap-3 sm:gap-5 p-2 sm:p-3 pr-4 sm:pr-8 rounded-2xl sm:rounded-3xl bg-black/60 backdrop-blur-3xl border border-white/10 shadow-2xl group/card hover:bg-black/80 transition-all duration-500">
            <div className="relative w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/5 overflow-hidden flex-shrink-0 border border-white/5 group-hover/card:scale-105 transition-transform duration-500">
              <Image src={product.image} alt={product.name} fill sizes="(max-width: 640px) 40px, 56px" className="object-contain p-1.5 sm:p-2" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-white/90 font-medium tracking-tight mb-0.5 sm:mb-1 truncate">{product.name}</p>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[9px] sm:text-[10px] text-amber-400 font-medium tracking-[0.1em]">{product.price}</span>
                <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-white/20" />
                <span className="text-[8px] sm:text-[9px] text-white/30 uppercase tracking-widest truncate">{product.category}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

