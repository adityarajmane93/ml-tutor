let sharedStream: MediaStream | null = null;
let pendingStream: Promise<MediaStream> | null = null;
const owners = new Set<string>();

/**
 * Return one managed camera stream.  Callers must provide a stable owner name
 * and later release that same name; one consumer must not stop a track still
 * used by WebGazer or a modality collector.
 */
export async function acquireCamera(owner: string): Promise<MediaStream> {
  owners.add(owner);
  if (sharedStream?.active) {
    console.info("[camera] reusing managed stream", { owner, owners: owners.size });
    return sharedStream;
  }

  if (!pendingStream) {
    console.info("[camera] requesting managed stream", { owner });
    pendingStream = navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "user" } },
      audio: false,
    }).then((stream) => {
      sharedStream = stream;
      stream.getTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          if (sharedStream === stream) {
            console.warn("[camera] managed track ended", { kind: track.kind });
            sharedStream = null;
            owners.clear();
          }
        });
      });
      console.info("[camera] managed stream active", { videoTracks: stream.getVideoTracks().length });
      return stream;
    }).finally(() => { pendingStream = null; });
  }

  try {
    return await pendingStream;
  } catch (error) {
    owners.delete(owner);
    console.error("[camera] unable to activate managed stream", { owner, error });
    throw error;
  }
}

export function releaseCamera(owner: string): void {
  owners.delete(owner);
  if (owners.size > 0) {
    console.info("[camera] retained for another owner", { owner, owners: owners.size });
    return;
  }
  console.info("[camera] releasing managed stream", { owner });
  sharedStream?.getTracks().forEach((track) => track.stop());
  sharedStream = null;
}
