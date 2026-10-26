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
