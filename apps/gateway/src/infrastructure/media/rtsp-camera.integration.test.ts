import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { FfmpegStream, hasPlayableHlsOutput } from "./ffmpeg-stream.js";

// Requiere un servidor RTSP (MediaMTX) y FFmpeg; se activa con RTSP_INTEGRATION=1.
const enabled = process.env.RTSP_INTEGRATION === "1";
const rtspServer = process.env.RTSP_SERVER ?? "rtsp://127.0.0.1:8554";
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "camera-rtsp-it-"));
const publishers: ChildProcess[] = [];

function publishTestCamera(pathName: string): ChildProcess {
  const publisher = spawn("ffmpeg", [
    "-hide_banner", "-loglevel", "error",
    "-re", "-f", "lavfi", "-i", "testsrc=size=640x360:rate=15",
    "-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency",
    "-g", "15", "-pix_fmt", "yuv420p",
    "-f", "rtsp", "-rtsp_transport", "tcp", `${rtspServer}/${pathName}`,
  ], { stdio: "ignore" });
  publishers.push(publisher);
  return publisher;
}

async function waitFor(condition: () => boolean, timeoutMs: number, label: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for: ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

function killPublisher(publisher: ChildProcess) {
  if (publisher.exitCode === null) publisher.kill("SIGKILL");
}

after(() => {
  publishers.forEach(killPublisher);
  fs.rmSync(workDir, { recursive: true, force: true });
});

test("gateway turns a real RTSP camera into playable HLS", { skip: !enabled, timeout: 60_000 }, async () => {
  const outputDir = path.join(workDir, "cam-ok");
  const publisher = publishTestCamera("cam-ok");
  const stream = new FfmpegStream("cam-ok", outputDir);
  try {
    stream.start(`${rtspServer}/cam-ok`);
    await waitFor(() => stream.refreshHealth().status === "running", 40_000, "stream running");

    assert.equal(hasPlayableHlsOutput(outputDir), true);
    const playlist = fs.readFileSync(path.join(outputDir, "index.m3u8"), "utf8");
    const segment = playlist.split(/\r?\n/).find((line) => line.endsWith(".ts"));
    assert.ok(segment, "playlist references a segment");
    const bytes = fs.readFileSync(path.join(outputDir, segment));
    assert.equal(bytes[0], 0x47, "segment is MPEG-TS");
  } finally {
    stream.stop();
    killPublisher(publisher);
  }
});

test("stream recovers by itself after the camera goes offline and returns", { skip: !enabled, timeout: 90_000 }, async () => {
  const outputDir = path.join(workDir, "cam-restart");
  const first = publishTestCamera("cam-restart");
  const stream = new FfmpegStream("cam-restart", outputDir, undefined, { stallTimeoutMs: 5_000 });
  try {
    stream.start(`${rtspServer}/cam-restart`);
    await waitFor(() => stream.refreshHealth().status === "running", 40_000, "first run");

    killPublisher(first);
    await waitFor(() => stream.health.restarts >= 1, 30_000, "restart after camera loss");

    publishTestCamera("cam-restart");
    await waitFor(() => stream.refreshHealth().status === "running", 60_000, "recovery after camera returns");
    assert.equal(hasPlayableHlsOutput(outputDir), true);
  } finally {
    stream.stop();
    publishers.forEach(killPublisher);
  }
});

test(
  "a frozen camera is detected and the stream resumes when it wakes up",
  { skip: !enabled || process.platform === "win32", timeout: 90_000 },
  async () => {
    const outputDir = path.join(workDir, "cam-frozen");
    const publisher = publishTestCamera("cam-frozen");
    const failures: string[] = [];
    const stream = new FfmpegStream("cam-frozen", outputDir, (failure) => {
      failures.push(failure.error);
    }, { stallTimeoutMs: 4_000, startupTimeoutMs: 10_000, watchdogIntervalMs: 500 });
    try {
      stream.start(`${rtspServer}/cam-frozen`);
      await waitFor(() => stream.refreshHealth().status === "running", 40_000, "stream running");

      publisher.kill("SIGSTOP");
      await waitFor(() => failures.length > 0, 30_000, "stall detection");

      publisher.kill("SIGCONT");
      await waitFor(() => stream.refreshHealth().status === "running", 60_000, "resume after thaw");
      assert.equal(hasPlayableHlsOutput(outputDir), true);
    } finally {
      stream.stop();
      killPublisher(publisher);
    }
  },
);
