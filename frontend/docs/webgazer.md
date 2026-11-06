# WebGazer runtime

ML-Tutor uses the prebuilt browser bundle from the pinned `webgazer@3.5.3`
package. `predev` and `prebuild` copy that bundle plus its matching MediaPipe
FaceMesh graph, packed data, and WASM files into the versioned same-origin
`/vendor/webgazer-3.5.3` path. This avoids Vite's ESM path, which resolves the
package's MediaPipe `FaceMesh` constructor as undefined.

The generated vendor directory is intentionally ignored: it is reproducibly
created from the lockfile during every local development or Vercel build. The
browser loader configures WebGazer with the exact local FaceMesh path before
calling `begin()`; no webcam frames or model assets are fetched by Railway.

WebGazer is an older upstream dependency. Updating it requires pinning the new
package version and validating its prebuilt bundle, FaceMesh assets, and camera
behavior in real supported browsers before deployment.
