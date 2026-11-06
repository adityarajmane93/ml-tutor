export type GazeData = { x: number; y: number } | null;

export interface WebGazer {
  begin(onFailure?: () => void): Promise<WebGazer>;
  end(): void;
  stopVideo(): WebGazer;
  clearData(): Promise<void>;
  saveDataAcrossSessions(value: boolean): WebGazer;
  showVideoPreview(value: boolean): WebGazer;
  showPredictionPoints(value: boolean): WebGazer;
  showFaceOverlay(value: boolean): WebGazer;
  showFaceFeedbackBox(value: boolean): WebGazer;
  setGazeListener(listener: (data: GazeData, elapsedTime: number) => void): WebGazer;
  clearGazeListener(): WebGazer;
  recordScreenPosition(x: number, y: number, eventType?: string): WebGazer;
  setStaticVideo(stream: MediaStream): WebGazer;
  params: { faceMeshSolutionPath: string; videoElementId: string };
}

declare global {
  interface Window {
    webgazer?: WebGazer;
  }
}
