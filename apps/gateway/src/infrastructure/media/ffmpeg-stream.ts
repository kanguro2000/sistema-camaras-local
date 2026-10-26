import { spawn, ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { redactRtspCredentials } from "../security/secret-redaction.js";

export function hasPlayableHlsOutput(outputDir: string): boolean {
  const playlistPath = path.join(outputDir, "index.m3u8");
  if (!fs.existsSync(playlistPath)) return false;

  let playlist: string;
  try {
    playlist = fs.readFileSync(playlistPath, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) return false;
    throw error;
  }
  if (!playlist.startsWith("#EXTM3U")) return false;

  const segments = playlist
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  return segments.some((segment) => {
    if (path.basename(segment) !== segment || !segment.endsWith(".ts")) return false;
    const segmentPath = path.join(outputDir, segment);
    if (!fs.existsSync(segmentPath)) return false;
    try {
      const stat = fs.statSync(segmentPath);
      return stat.isFile() && stat.size > 0;
    } catch (error) {
      if (isMissingFileError(error)) return false;
      throw error;
    }
  });
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

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

export interface FfmpegStreamOptions {
  command?: string;
  commandArgs?: string[];
  stallTimeoutMs?: number;
  startupTimeoutMs?: number;
  watchdogIntervalMs?: number;
}

const DEFAULT_STALL_TIMEOUT_MS = 15_000;
const DEFAULT_STARTUP_TIMEOUT_MS = 30_000;
const DEFAULT_WATCHDOG_INTERVAL_MS = 5_000;

export class FfmpegStream {
  private proc: ChildProcess | null = null;
  private restarts = 0;
  private stopping = false;
  private restartTimer: NodeJS.Timeout | null = null;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private startedAtMs = 0;
  private currentUrl: string | null = null;
  private readonly command: string;
  private readonly commandArgs: string[];
  private readonly stallTimeoutMs: number;
  private readonly startupTimeoutMs: number;
  private readonly watchdogIntervalMs: number;
  health: StreamHealth = { status: "stopped", restarts: 0 };

  constructor(
    public readonly cameraId: string,
    private readonly outputDir: string,
    private readonly onFailure?: (failure: StreamFailure) => void,
    options: FfmpegStreamOptions = {},
  ) {
    this.command = options.command ?? "ffmpeg";
    this.commandArgs = options.commandArgs ?? [];
    this.stallTimeoutMs = options.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT_MS;
    this.startupTimeoutMs = options.startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS;
    this.watchdogIntervalMs = options.watchdogIntervalMs ?? DEFAULT_WATCHDOG_INTERVAL_MS;
  }

  get hlsPath() {
    return path.join(this.outputDir, "index.m3u8");
  }

  refreshHealth() {
    if (this.proc && this.health.status === "starting") {
      if (hasPlayableHlsOutput(this.outputDir)) {
        this.health = { ...this.health, status: "running", lastError: undefined };
      }
    }
    return this.health;
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
    this.startedAtMs = Date.now();
    try {
      this.proc = spawn(this.command, [...this.commandArgs, ...args], { stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      this.reportFailure(`Failed to start ffmpeg: ${String(e)}`);
      this.scheduleRestart();
      return;
    }
    this.health.pid = this.proc.pid;
    this.startWatchdog();
    this.proc.on("error", (err) => {
      this.proc = null;
      this.stopWatchdog();
      this.reportFailure(`Failed to spawn ffmpeg: ${err.message}`);
      this.scheduleRestart();
    });
    this.proc.stderr?.on("data", (d: Buffer) => {
      const msg = d.toString().trim();
      if (msg) this.health.lastError = redactRtspCredentials(msg).slice(-500);
    });
    this.proc.on("exit", (code) => {
      this.proc = null;
      this.stopWatchdog();
      if (this.stopping) {
        this.health.status = "stopped";
        return;
      }
      this.reportFailure(this.health.lastError ?? `ffmpeg exited with code ${code}`);
      this.scheduleRestart();
    });
  }

  // FFmpeg puede quedarse colgado sin terminar si la cámara deja de enviar datos;
  // sin este vigilante nunca se reiniciaría y el HLS se congelaría.
  private startWatchdog() {
    this.stopWatchdog();
    this.watchdogTimer = setInterval(() => this.checkForStall(), this.watchdogIntervalMs);
    this.watchdogTimer.unref();
  }

  private stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private checkForStall() {
    const proc = this.proc;
    if (!proc || this.stopping) return;
    this.refreshHealth();

    let stalledFor: number;
    let limit: number;
    if (this.health.status === "running") {
      try {
        stalledFor = Date.now() - fs.statSync(this.hlsPath).mtimeMs;
      } catch {
        stalledFor = Number.POSITIVE_INFINITY;
      }
      limit = this.stallTimeoutMs;
    } else {
      stalledFor = Date.now() - this.startedAtMs;
      limit = this.startupTimeoutMs;
    }
    if (stalledFor < limit) return;

    this.health.lastError = this.health.status === "running"
      ? "Stream stalled: no new HLS segments were produced"
      : "Stream did not produce video in time";
    proc.kill("SIGKILL");
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
    this.stopWatchdog();
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
