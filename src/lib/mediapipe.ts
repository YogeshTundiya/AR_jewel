/**
 * MediaPipe Vision utilities for AR jewelry try-on.
 * 
 * - HandLandmarker: Detects 21 landmarks per hand for ring placement
 * - FaceLandmarker: Detects 468 facial landmarks for necklace placement
 * 
 * WASM + model files are loaded from Google's CDN (free, no API key).
 */

import {
  HandLandmarker,
  FaceLandmarker,
  FilesetResolver,
  type HandLandmarkerResult,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

const VISION_WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

let handLandmarker: HandLandmarker | null = null;
let faceLandmarker: FaceLandmarker | null = null;

/**
 * Initialise and return the HandLandmarker singleton.
 */
export async function getHandLandmarker(): Promise<HandLandmarker> {
  if (handLandmarker) return handLandmarker;

  const vision = await FilesetResolver.forVisionTasks(VISION_WASM_CDN);

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  return handLandmarker;
}

/**
 * Initialise and return the FaceLandmarker singleton.
 */
export async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (faceLandmarker) return faceLandmarker;

  const vision = await FilesetResolver.forVisionTasks(VISION_WASM_CDN);

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });

  return faceLandmarker;
}

/**
 * Clean up singleton instances to free GPU resources.
 */
export function disposeDetectors() {
  if (handLandmarker) {
    handLandmarker.close();
    handLandmarker = null;
  }
  if (faceLandmarker) {
    faceLandmarker.close();
    faceLandmarker = null;
  }
}

// Re-export result types for convenience
export type { HandLandmarkerResult, FaceLandmarkerResult };
