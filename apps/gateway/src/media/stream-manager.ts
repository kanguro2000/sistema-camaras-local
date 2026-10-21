import { FfmpegStream } from "./ffmpeg-stream.js";
import path from "node:path";
import { config } from "../config.js";

const IDLE_TIMEOUT_MS = 30_000;

export class StreamManager {
  private streams = new Map<string, FfmpegStream>();
  private idleTimers = new Map<string, NodeJS.Timeout>();
  private baseDir: string;

  constructor(baseDir = path.resolve("./data/streams")) {
    this.baseDir = baseDir;
  }

  get(cameraId: string): FfmpegStream {
    let s = this.streams.get(cameraId);
    if (!s) {
      s = new FfmpegStream(cameraId, path.join(this.baseDir, cameraId));
      this.streams.set(cameraId, s);
    }
    return s;
  }

  async ensureRunning(cameraId: string): Promise<FfmpegStream> {
    const s = this.get(cameraId);
    if (!s.isRunning()) s.start();
    this.resetIdle(cameraId);
    return s;
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

  health(cameraId: string) {
    const s = this.streams.get(cameraId);
    return s ? s.health : { status: "stopped", restarts: 0 };
  }
}

export const streamManager = new StreamManager();
