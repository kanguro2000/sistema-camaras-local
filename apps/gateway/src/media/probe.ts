import { spawn } from "node:child_process";
import { getCameraWithSecret } from "../repositories/cameras.js";

export interface ProbeResult {
  ok: boolean;
  codecVideo?: string;
  codecAudio?: string;
  width?: number;
  height?: number;
  error?: string;
}

export function probeCamera(cameraId: string): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const secret = getCameraWithSecret(cameraId);
    if (!secret) {
      resolve({ ok: false, error: "Camera not found" });
      return;
    }
    const streamPath = secret.dto.channel === "sd" ? "/stream2" : "/stream1";
    const url = `rtsp://${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password)}@${secret.dto.ip}:554${streamPath}`;

    const ffprobe = spawn("ffprobe", [
      "-v", "error",
      "-rtsp_transport", "tcp",
      "-i", url,
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
      resolve({ ok: false, error: `ffprobe not available: ${err.message}` });
    });

    ffprobe.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve({ ok: false, error: stderr.trim() || `ffprobe exited ${code}` });
        return;
      }
      try {
        const json = JSON.parse(stdout);
        const v = json.streams?.find((s: any) => s.codec_type === "video");
        const a = json.streams?.find((s: any) => s.codec_type === "audio");
        resolve({
          ok: true,
          codecVideo: v?.codec_name,
          codecAudio: a?.codec_name,
          width: v?.width,
          height: v?.height,
        });
      } catch (e) {
        resolve({ ok: false, error: `Parse error: ${String(e)}` });
      }
    });
  });
}
