let sharedStream: MediaStream | null = null;

export async function acquireCamera(): Promise<MediaStream> {
  if (sharedStream?.active) return sharedStream;
  sharedStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  return sharedStream;
}

export function releaseCamera(): void {
  sharedStream?.getTracks().forEach((track) => track.stop());
  sharedStream = null;
}
