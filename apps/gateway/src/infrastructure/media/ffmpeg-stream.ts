import { spawn, ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { redactRtspCredentials } from "../security/secret-redaction.js";

export interface StreamHealth {
  status: "starting" | "running" | "stopped" | "error";
  pid?: number;
  restarts: number;
  lastError?: string;
  startedAt?: string;
}

export interface StreamFailure {
  cameraId: string;
  error: string;
  restarts: number;
}

export class FfmpegStream {
  private proc: ChildProcess | null = null;
  private restarts = 0;
  private stopping = false;
  private restartTimer: NodeJS.Timeout | null = null;
  private currentUrl: string | null = null;
  health: StreamHealth = { status: "stopped", restarts: 0 };

  constructor(
    public readonly cameraId: string,
    private readonly outputDir: string,
    private readonly onFailure?: (failure: StreamFailure) => void,
  ) {}

  get hlsPath() {
    return path.join(this.outputDir, "index.m3u8");
  }

  start(rtspUrl?: string) {
    if (this.proc) return;
    this.stopping = false;
    if (rtspUrl) this.currentUrl = rtspUrl;
    const url = this.currentUrl;
    if (!url) {
      this.reportFailure("Missing RTSP URL");
      return;
    }

    fs.mkdirSync(this.outputDir, { recursive: true });
    for (const f of fs.readdirSync(this.outputDir)) {
      if (f.endsWith(".ts") || f.endsWith(".m3u8")) fs.rmSync(path.join(this.outputDir, f), { force: true });
    }

    const args = [
      "-hide_banner",
      "-loglevel", "warning",
      "-rtsp_transport", "tcp",
      "-i", url,
      "-c:v", "copy",
      "-c:a", "aac",
      "-f", "hls",
      "-hls_time", "1",
      "-hls_list_size", "3",
      "-hls_flags", "delete_segments+append_list+omit_endlist",
      this.hlsPath,
    ];

    this.health = { status: "starting", restarts: this.restarts, startedAt: new Date().toISOString() };
    try {
      this.proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      this.reportFailure(`Failed to start ffmpeg: ${String(e)}`);
      this.scheduleRestart();
      return;
    }
    this.health.pid = this.proc.pid;
    this.proc.on("error", (err) => {
      this.proc = null;
      this.reportFailure(`Failed to spawn ffmpeg: ${err.message}`);
      this.scheduleRestart();
    });
    this.proc.stdout?.on("data", () => {
      if (this.health.status === "starting") this.health.status = "running";
    });
    this.proc.stderr?.on("data", (d: Buffer) => {
      const msg = d.toString().trim();
      if (msg) this.health.lastError = redactRtspCredentials(msg).slice(-500);
    });
    this.proc.on("exit", (code) => {
      this.proc = null;
      if (this.stopping) {
        this.health.status = "stopped";
        return;
      }
      this.reportFailure(this.health.lastError ?? `ffmpeg exited with code ${code}`);
      this.scheduleRestart();
    });
  }

  private reportFailure(message: string) {
    const error = redactRtspCredentials(message).slice(-500);
    this.health = {
      ...this.health,
      status: "error",
      restarts: this.restarts,
      lastError: error,
    };
    this.onFailure?.({ cameraId: this.cameraId, error, restarts: this.restarts });
  }

  private scheduleRestart() {
    if (this.stopping) return;
    const delay = Math.min(1000 * Math.pow(2, this.restarts), 30000);
    this.restarts++;
    this.health.restarts = this.restarts;
    this.restartTimer = setTimeout(() => this.start(this.currentUrl ?? undefined), delay);
  }

  stop() {
    this.stopping = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.proc) {
      this.proc.kill("SIGTERM");
      this.proc = null;
    }
    this.health.status = "stopped";
  }

  isRunning() {
    return this.proc !== null;
  }
}
