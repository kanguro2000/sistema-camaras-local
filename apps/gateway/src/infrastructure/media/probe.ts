import { spawn } from "node:child_process";
import { z } from "zod";
import { CameraProbeResult } from "../../domain/services/camera-probe.js";
import { redactRtspCredentials } from "../security/secret-redaction.js";

const ProbeOutputSchema = z.object({
  streams: z.array(z.object({
    codec_type: z.string(),
    codec_name: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })).default([]),
});

export function probeRtsp(rtspUrl: string): Promise<CameraProbeResult> {
  return new Promise((resolve) => {
    if (!rtspUrl) {
      resolve({ ok: false, error: "Missing RTSP URL" });
      return;
    }
    const ffprobe = spawn("ffprobe", [
      "-v", "error",
      "-rtsp_transport", "tcp",
      "-i", rtspUrl,
      "-show_streams",
      "-of", "json",
    ]);

    let stdout = "";
    let stderr = "";
    ffprobe.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    ffprobe.stderr.on("data", (d: Buffer) => (stderr += d.toString()));

    const timer = setTimeout(() => {
      ffprobe.kill("SIGKILL");
      resolve({ ok: false, error: "Probe timeout" });
    }, 15000);

    ffprobe.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: redactRtspCredentials(`ffprobe not available: ${err.message}`) });
    });

    ffprobe.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve({ ok: false, error: redactRtspCredentials(stderr.trim()) || `ffprobe exited ${code}` });
        return;
      }
      try {
        const output = ProbeOutputSchema.parse(JSON.parse(stdout));
        const video = output.streams.find((stream) => stream.codec_type === "video");
        const audio = output.streams.find((stream) => stream.codec_type === "audio");
        resolve({
          ok: true,
          codecVideo: video?.codec_name,
          codecAudio: audio?.codec_name,
          width: video?.width,
          height: video?.height,
        });
      } catch (e) {
        resolve({ ok: false, error: redactRtspCredentials(`Parse error: ${String(e)}`) });
      }
    });
  });
}
