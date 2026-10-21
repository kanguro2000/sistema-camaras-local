import { CameraRepository } from "../../domain/repositories/camera.repository.js";
import { Camera } from "../../domain/entities/camera.js";
import { CameraCreate, CameraUpdate } from "@sistema-camaras/shared";
import { probeRtsp } from "../../infrastructure/media/probe.js";

export class CameraService {
  constructor(private cameras: CameraRepository) {}

  list(): Camera[] {
    return this.cameras.list();
  }

  get(id: string): Camera | null {
    return this.cameras.getById(id);
  }

  create(input: CameraCreate): Camera {
    return this.cameras.create(input);
  }

  update(id: string, input: CameraUpdate): Camera | null {
    return this.cameras.update(id, input);
  }

  delete(id: string): boolean {
    return this.cameras.delete(id);
  }

  getWithSecret(id: string) {
    return this.cameras.getWithSecret(id);
  }

  probe(id: string) {
    const secret = this.cameras.getWithSecret(id);
    if (!secret) return Promise.resolve({ ok: false, error: "Camera not found" });
    const streamPath = secret.camera.channel === "sd" ? "/stream2" : "/stream1";
    const url = `rtsp://${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password)}@${secret.camera.ip}:554${streamPath}`;
    return probeRtsp(url);
  }
}
