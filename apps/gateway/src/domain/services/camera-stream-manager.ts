export interface CameraStreamHealth {
  status: "starting" | "running" | "stopped" | "error";
  pid?: number;
  restarts: number;
  lastError?: string;
  startedAt?: string;
}

export interface CameraStreamManager {
  ensureRunning(cameraId: string, rtspUrl: string): Promise<void>;
  resetIdle(cameraId: string): void;
  stop(cameraId: string): void;
  health(cameraId: string): CameraStreamHealth;
  playlistPath(cameraId: string): string;
}
