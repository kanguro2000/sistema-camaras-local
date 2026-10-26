import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FfmpegStream, hasPlayableHlsOutput } from "./ffmpeg-stream.js";

test("HLS output is not ready until a playlist references a non-empty segment", () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "camera-stream-health-"));
  try {
    assert.equal(hasPlayableHlsOutput(outputDir), false);

    fs.writeFileSync(path.join(outputDir, "index.m3u8"), "#EXTM3U\n#EXTINF:1,\nsegment0.ts\n");
    assert.equal(hasPlayableHlsOutput(outputDir), false);

    fs.writeFileSync(path.join(outputDir, "segment0.ts"), "");
    assert.equal(hasPlayableHlsOutput(outputDir), false);

    fs.writeFileSync(path.join(outputDir, "segment0.ts"), "media-segment");
    assert.equal(hasPlayableHlsOutput(outputDir), true);
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
});

test("HLS readiness rejects malformed playlists and unreferenced stale segments", () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "camera-stream-health-"));
  try {
    fs.writeFileSync(path.join(outputDir, "old.ts"), "stale-segment");
    fs.writeFileSync(path.join(outputDir, "index.m3u8"), "not-a-playlist\nold.ts\n");
    assert.equal(hasPlayableHlsOutput(outputDir), false);

    fs.writeFileSync(path.join(outputDir, "index.m3u8"), "#EXTM3U\n#EXTINF:1,\nmissing.ts\n");
    assert.equal(hasPlayableHlsOutput(outputDir), false);
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
});

test("stream health becomes running only after the first referenced segment appears", () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "camera-stream-health-"));
  try {
    const stream = new FfmpegStream("camera-id", outputDir);
    Object.defineProperty(stream, "proc", { value: {}, configurable: true });
    stream.health = { status: "starting", restarts: 0 };

    assert.equal(stream.refreshHealth().status, "starting");

    fs.writeFileSync(path.join(outputDir, "index.m3u8"), "#EXTM3U\n#EXTINF:1,\nsegment0.ts\n");
    fs.writeFileSync(path.join(outputDir, "segment0.ts"), "media-segment");
    assert.equal(stream.refreshHealth().status, "running");
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
});

const HANGING_FFMPEG = `
const fs = require("node:fs");
const path = require("node:path");
const playlist = process.argv[process.argv.length - 1];
const dir = path.dirname(playlist);
fs.writeFileSync(path.join(dir, "segment0.ts"), "media-segment");
fs.writeFileSync(playlist, "#EXTM3U\\n#EXTINF:1,\\nsegment0.ts\\n");
setInterval(() => {}, 1000);
`;

async function waitFor(condition: () => boolean, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

test("a hung ffmpeg that stops producing segments is killed and restarted", async () => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "camera-stream-stall-"));
  const fakeScript = path.join(workDir, "fake-ffmpeg.cjs");
  fs.writeFileSync(fakeScript, HANGING_FFMPEG);
  const failures: string[] = [];
  const stream = new FfmpegStream("camera-id", path.join(workDir, "out"), (failure) => {
    failures.push(failure.error);
  }, {
    command: process.execPath,
    commandArgs: [fakeScript],
    stallTimeoutMs: 400,
    watchdogIntervalMs: 100,
  });
  try {
    stream.start("rtsp://camera.invalid/stream");
    await waitFor(() => stream.refreshHealth().status === "running", 5000);
    await waitFor(() => failures.length > 0, 5000);
    assert.match(failures[0] ?? "", /stalled/i);
    assert.ok(stream.health.restarts >= 1);
  } finally {
    stream.stop();
    fs.rmSync(workDir, { recursive: true, force: true });
  }
});

test("a process that never produces video is restarted after the startup timeout", async () => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "camera-stream-startup-"));
  const fakeScript = path.join(workDir, "silent.cjs");
  fs.writeFileSync(fakeScript, "setInterval(() => {}, 1000);");
  const failures: string[] = [];
  const stream = new FfmpegStream("camera-id", path.join(workDir, "out"), (failure) => {
    failures.push(failure.error);
  }, {
    command: process.execPath,
    commandArgs: [fakeScript],
    startupTimeoutMs: 400,
    watchdogIntervalMs: 100,
  });
  try {
    stream.start("rtsp://camera.invalid/stream");
    await waitFor(() => failures.length > 0, 5000);
    assert.match(failures[0] ?? "", /did not produce video/i);
  } finally {
    stream.stop();
    fs.rmSync(workDir, { recursive: true, force: true });
  }
});
