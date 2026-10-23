import { Camera, CameraCreateInput, CameraUpdateInput } from "../../domain/entities/camera.js";
import { CameraRepository } from "../../domain/repositories/camera.repository.js";
import { CameraProbe, CameraProbeResult } from "../../domain/services/camera-probe.js";

export class CameraService {
  constructor(
    private readonly cameras: CameraRepository,
    private readonly cameraProbe: CameraProbe,
  ) {}

  list(): Camera[] {
    return this.cameras.list();
  }

  get(id: string): Camera | null {
    return this.cameras.getById(id);
  }

  create(input: CameraCreateInput): Camera {
    return this.cameras.create(input);
  }

  update(id: string, input: CameraUpdateInput): Camera | null {
    return this.cameras.update(id, input);
  }

  delete(id: string): boolean {
    return this.cameras.delete(id);
  }

  probe(id: string): Promise<CameraProbeResult> {
    const secret = this.cameras.getWithSecret(id);
    if (!secret) return Promise.resolve({ ok: false, error: "Camera not found" });
    const streamPath = secret.camera.channel === "sd" ? "/stream2" : "/stream1";
    const url = `rtsp://${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password)}@${secret.camera.ip}:554${streamPath}`;
    return this.cameraProbe.probe(url);
  }
}
