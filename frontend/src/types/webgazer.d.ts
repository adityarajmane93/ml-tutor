declare module "webgazer" {
  export type GazeData = { x: number; y: number } | null;
  export interface WebGazer {
    begin(): Promise<WebGazer>;
    end(): void;
    clearData(): Promise<void>;
    saveDataAcrossSessions(value: boolean): WebGazer;
    showVideoPreview(value: boolean): WebGazer;
    showPredictionPoints(value: boolean): WebGazer;
    showFaceOverlay(value: boolean): WebGazer;
    showFaceFeedbackBox(value: boolean): WebGazer;
    setGazeListener(listener: (data: GazeData, elapsedTime: number) => void): WebGazer;
    clearGazeListener(): WebGazer;
    recordScreenPosition(x: number, y: number, eventType?: string): void;
  }
  const webgazer: WebGazer;
  export default webgazer;
}
