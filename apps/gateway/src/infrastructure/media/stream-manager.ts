import { FfmpegStream, StreamFailure } from "./ffmpeg-stream.js";
import path from "node:path";
import { CameraStreamHealth } from "../../domain/services/camera-stream-manager.js";

const IDLE_TIMEOUT_MS = 30_000;
const CAMERA_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class StreamManager {
  private streams = new Map<string, FfmpegStream>();
  private idleTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly baseDir = path.resolve("./data/streams"),
    private readonly onFailure?: (failure: StreamFailure) => void,
  ) {}

  get(cameraId: string): FfmpegStream {
    let s = this.streams.get(cameraId);
    if (!s) {
      // El id forma parte de una ruta en disco: solo se aceptan UUID para evitar path traversal.
      if (!CAMERA_ID_PATTERN.test(cameraId)) throw new Error("Invalid camera id");
      s = new FfmpegStream(cameraId, path.join(this.baseDir, cameraId), this.onFailure);
      this.streams.set(cameraId, s);
    }
    return s;
  }

  async ensureRunning(cameraId: string, rtspUrl: string): Promise<void> {
    const stream = this.get(cameraId);
    if (!stream.isRunning()) stream.start(rtspUrl);
    this.resetIdle(cameraId);
  }

  playlistPath(cameraId: string): string {
    return this.get(cameraId).hlsPath;
  }

  resetIdle(cameraId: string) {
    const t = this.idleTimers.get(cameraId);
    if (t) clearTimeout(t);
    this.idleTimers.set(
      cameraId,
      setTimeout(() => {
        const s = this.streams.get(cameraId);
        if (s) s.stop();
      }, IDLE_TIMEOUT_MS),
    );
  }

  stop(cameraId: string) {
    const s = this.streams.get(cameraId);
    if (s) s.stop();
    const t = this.idleTimers.get(cameraId);
    if (t) clearTimeout(t);
    this.idleTimers.delete(cameraId);
  }

  stopAll() {
    for (const id of this.streams.keys()) this.stop(id);
  }

  health(cameraId: string): CameraStreamHealth {
    const s = this.streams.get(cameraId);
    return s ? s.refreshHealth() : { status: "stopped", restarts: 0 };
  }
}
