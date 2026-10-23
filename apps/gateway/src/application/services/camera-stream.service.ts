import { CameraRepository } from "../../domain/repositories/camera.repository.js";
import {
  CameraStreamHealth,
  CameraStreamManager,
} from "../../domain/services/camera-stream-manager.js";

export class CameraStreamService {
  constructor(
    private readonly cameras: CameraRepository,
    private readonly streams: CameraStreamManager,
  ) {}

  async start(cameraId: string): Promise<{ health: CameraStreamHealth } | null> {
    const secret = this.cameras.getWithSecret(cameraId);
    if (!secret) return null;

    const streamPath = secret.camera.channel === "sd" ? "/stream2" : "/stream1";
    const rtspUrl = `rtsp://${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password)}@${secret.camera.ip}:554${streamPath}`;
    await this.streams.ensureRunning(cameraId, rtspUrl);
    return { health: this.streams.health(cameraId) };
  }

  async playlistPath(cameraId: string): Promise<string | null> {
    if (!(await this.start(cameraId))) return null;
    this.streams.resetIdle(cameraId);
    return this.streams.playlistPath(cameraId);
  }

  exists(cameraId: string): boolean {
    return this.cameras.getById(cameraId) !== null;
  }

  health(cameraId: string): CameraStreamHealth {
    return this.streams.health(cameraId);
  }

  keepAlive(cameraId: string): void {
    this.streams.resetIdle(cameraId);
  }

  stop(cameraId: string): void {
    this.streams.stop(cameraId);
  }
}
