# WebGazer integration

ML-Tutor pins `webgazer@3.5.3` for browser-only approximate gaze estimates.
The package states that upstream maintenance ended in February 2026; retain the
pin and reassess the dependency before changing browser or MediaPipe versions.

The browser uploads only sampled gaze coordinates, calibration summaries, AOI
labels, and timestamps. It never uploads camera frames or WebGazer video.

## Camera limitation

WebGazer 3.5.3 creates and owns its own `getUserMedia` video element. Its
public API has no supported way to inject the `MediaStream` used by
`VideoStream.tsx`, so direct track sharing is not implemented or claimed.
ML-Tutor releases its shared MediaPipe camera track before WebGazer begins
calibration and stops all modalities on End Session. Browser/device-specific
testing is still required to establish reliable concurrent WebGazer,
MediaPipe/HSEmotion, and rPPG operation; the browser may expose separate tracks
for the same physical camera after calibration.

Nine-point calibration and five-point validation provide usability feedback
only. They are not evidence of research-grade eye-tracking accuracy.
