import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

export const TASKS_VISION_VERSION = "0.10.35";
const WASM_ROOT = `/vendor/mediapipe-tasks-vision-${TASKS_VISION_VERSION}/wasm`;
const FACE_DETECTOR_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

let detectorPromise: Promise<FaceDetector> | null = null;

export function mediaPipeErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: "NonError", message: String(error) };
}

async function createFaceDetector(): Promise<FaceDetector> {
  console.info("[mediapipe] loading Tasks Vision assets", { version: TASKS_VISION_VERSION, wasmRoot: WASM_ROOT });
  let vision;
  try {
    vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
    console.info("[mediapipe] Tasks Vision assets ready", { version: TASKS_VISION_VERSION });
  } catch (error) {
    console.error("[mediapipe] Tasks Vision asset initialization failed", mediaPipeErrorDetails(error));
    throw error;
  }

  try {
    console.info("[mediapipe] initializing face detector", { delegate: "GPU" });
    const detector = await FaceDetector.createFromOptions(vision, {
      baseOptions: { modelAssetPath: FACE_DETECTOR_MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
    });
    console.info("[mediapipe] face detector ready", { delegate: "GPU" });
    return detector;
  } catch (gpuError) {
    console.warn("[mediapipe] GPU initialization failed; retrying on CPU", mediaPipeErrorDetails(gpuError));
  }

  try {
    console.info("[mediapipe] initializing face detector", { delegate: "CPU" });
    const detector = await FaceDetector.createFromOptions(vision, {
      baseOptions: { modelAssetPath: FACE_DETECTOR_MODEL_URL, delegate: "CPU" },
      runningMode: "VIDEO",
    });
    console.info("[mediapipe] face detector ready", { delegate: "CPU" });
    return detector;
  } catch (cpuError) {
    console.error("[mediapipe] CPU initialization failed", mediaPipeErrorDetails(cpuError));
    throw cpuError;
  }
}

/**
 * The singleton prevents a second Emscripten runtime from being created after
 * WebGazer has loaded its legacy Face Mesh bundle.
 */
export function getFaceDetector(): Promise<FaceDetector> {
  if (!detectorPromise) {
    detectorPromise = createFaceDetector().catch((error) => {
      detectorPromise = null;
      throw error;
    });
  }
  return detectorPromise;
}
