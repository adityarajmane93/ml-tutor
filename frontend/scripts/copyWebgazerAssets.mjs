import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const webgazerRoot = resolve(frontendRoot, "node_modules/webgazer");
const targetRoot = resolve(frontendRoot, "public/vendor/webgazer-3.5.3");
const tasksVisionRoot = resolve(frontendRoot, "node_modules/@mediapipe/tasks-vision/wasm");
const tasksVisionTarget = resolve(frontendRoot, "public/vendor/mediapipe-tasks-vision-0.10.35/wasm");
const faceMeshRoot = "src/mediapipe/face_mesh";
const faceMeshFiles = [
  "face_mesh.binarypb",
  "face_mesh_solution_packed_assets.data",
  "face_mesh_solution_packed_assets_loader.js",
  "face_mesh_solution_simd_wasm_bin.data",
  "face_mesh_solution_simd_wasm_bin.js",
  "face_mesh_solution_simd_wasm_bin.wasm",
  "face_mesh_solution_wasm_bin.js",
  "face_mesh_solution_wasm_bin.wasm",
];

rmSync(targetRoot, { recursive: true, force: true });
rmSync(resolve(tasksVisionTarget, ".."), { recursive: true, force: true });
mkdirSync(resolve(targetRoot, "mediapipe/face_mesh"), { recursive: true });
mkdirSync(tasksVisionTarget, { recursive: true });
copyFileSync(resolve(webgazerRoot, "dist/webgazer.js"), resolve(targetRoot, "webgazer.js"));
for (const filename of faceMeshFiles) {
  copyFileSync(
    resolve(webgazerRoot, faceMeshRoot, filename),
    resolve(targetRoot, "mediapipe/face_mesh", filename),
  );
}
for (const filename of ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_module_internal.js", "vision_wasm_module_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"]) {
  copyFileSync(resolve(tasksVisionRoot, filename), resolve(tasksVisionTarget, filename));
}
