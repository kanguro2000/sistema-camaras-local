import type { CameraStreamHealth } from "@sistema-camaras/shared";

export type { CameraStreamHealth } from "@sistema-camaras/shared";

export interface CameraStreamManager {
  ensureRunning(cameraId: string, rtspUrl: string): Promise<void>;
  resetIdle(cameraId: string): void;
  stop(cameraId: string): void;
  health(cameraId: string): CameraStreamHealth;
  playlistPath(cameraId: string): string;
}
