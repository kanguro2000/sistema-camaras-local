import { spawn, ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { getCameraWithSecret } from "../repositories/cameras.js";

export interface StreamHealth {
  status: "starting" | "running" | "stopped" | "error";
  pid?: number;
  restarts: number;
  lastError?: string;
  startedAt?: string;
}

export class FfmpegStream {
  private proc: ChildProcess | null = null;
  private restarts = 0;
  private stopping = false;
  private restartTimer: NodeJS.Timeout | null = null;
  health: StreamHealth = { status: "stopped", restarts: 0 };

  constructor(
    public readonly cameraId: string,
    private readonly outputDir: string,
  ) {}

  get hlsPath() {
    return path.join(this.outputDir, "index.m3u8");
  }

  start() {
    if (this.proc) return;
    this.stopping = false;
    const secret = getCameraWithSecret(this.cameraId);
    if (!secret) {
      this.health = { ...this.health, status: "error", lastError: "Camera not found" };
      return;
    }
    // Pick stream by channel
    const streamPath = secret.dto.channel === "sd" ? "/stream2" : "/stream1";
    const url = `rtsp://${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password)}@${secret.dto.ip}:554${streamPath}`;

    fs.mkdirSync(this.outputDir, { recursive: true });
    // clean old segments
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
      this.health = { status: "error", restarts: this.restarts, lastError: String(e) };
      this.scheduleRestart();
      return;
    }
    this.health.pid = this.proc.pid;
    this.proc.on("error", (err) => {
      this.proc = null;
      this.health.status = "error";
      this.health.lastError = `Failed to spawn ffmpeg: ${err.message}`;
      this.scheduleRestart();
    });
    this.proc.stdout?.on("data", () => {
      if (this.health.status === "starting") this.health.status = "running";
    });
    this.proc.stderr?.on("data", (d: Buffer) => {
      const msg = d.toString().trim();
      if (msg) this.health.lastError = msg.slice(-500);
    });
    this.proc.on("exit", (code) => {
      this.proc = null;
      if (this.stopping) {
        this.health.status = "stopped";
        return;
      }
      this.health.status = "error";
      this.health.lastError = `ffmpeg exited with code ${code}`;
      this.scheduleRestart();
    });
  }

  private scheduleRestart() {
    if (this.stopping) return;
    const delay = Math.min(1000 * Math.pow(2, this.restarts), 30000);
    this.restarts++;
    this.health.restarts = this.restarts;
    this.restartTimer = setTimeout(() => this.start(), delay);
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
