import type { WebGazer } from "../types/webgazer";

const BUNDLE_URL = "/vendor/webgazer-3.5.3/webgazer.js";
const FACE_MESH_ASSET_PATH = "/vendor/webgazer-3.5.3/mediapipe/face_mesh";
const SCRIPT_ID = "ml-tutor-webgazer-3-5-3";

let loading: Promise<WebGazer> | null = null;

function configuredInstance(): WebGazer | null {
  const instance = window.webgazer;
  if (!instance) return null;
  instance.params.faceMeshSolutionPath = FACE_MESH_ASSET_PATH;
  return instance;
}

/**
 * Loads WebGazer's pinned browser bundle without sending it through Vite's ESM
 * dependency optimizer. The FaceMesh runtime assets are served from the same
 * versioned application path, so no external model URL is required.
 */
export function loadWebGazer(): Promise<WebGazer> {
  const existing = configuredInstance();
  if (existing) return Promise.resolve(existing);
  if (loading) return loading;

  loading = new Promise<WebGazer>((resolve, reject) => {
    const fail = (message: string) => {
      loading = null;
      reject(new Error(message));
    };
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = BUNDLE_URL;
    script.async = true;
    script.onload = () => {
      const instance = configuredInstance();
      if (instance) resolve(instance);
      else {
        script.remove();
        fail("The WebGazer browser bundle did not expose its API.");
      }
    };
    script.onerror = () => {
      script.remove();
      fail("The WebGazer browser bundle could not be loaded.");
    };
    document.head.appendChild(script);
  });

  return loading;
}
