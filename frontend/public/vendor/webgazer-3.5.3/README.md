# WebGazer 3.5.3 browser bundle

`webgazer.js` and the adjacent `mediapipe/face_mesh` files are copied unchanged
from the pinned `webgazer@3.5.3` npm package. They are deliberately served as
same-origin static assets rather than processed by Vite: Vite's ESM resolution
of this package makes the MediaPipe `FaceMesh` constructor undefined.

The package is browser-side only. The loader sets the exact same-origin
FaceMesh asset directory before `begin()` so its JavaScript, graph, packed
assets, and WASM binaries stay version-aligned. WebGazer is an older upstream
dependency; upgrades require validating the bundle and its FaceMesh assets in
real browsers before replacing this directory.
