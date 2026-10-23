import { CameraSchema, UserSchema } from "@sistema-camaras/shared";
import { Camera } from "../../domain/entities/camera.js";
import { AppGateway } from "../../domain/repositories/app-gateway.js";
import { ApiClient } from "../http/api-client.js";

export class HttpAppGateway implements AppGateway {
  constructor(private readonly api: ApiClient) {}

  async login(username: string, password: string) {
    const result = await this.api<{ accessToken: unknown; user: unknown }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (typeof result.accessToken !== "string") {
      throw new Error("Invalid authentication response");
    }
    return { accessToken: result.accessToken, user: UserSchema.parse(result.user) };
  }

  async listCameras(): Promise<Camera[]> {
    const result = await this.api<{ items: unknown }>("/api/cameras");
    if (!Array.isArray(result.items)) throw new Error("Invalid camera-list response");
    return result.items.map((camera) => CameraSchema.parse(camera));
  }

  openStream(cameraId: string) {
    return this.api<{ hlsUrl: string }>(`/api/cameras/${encodeURIComponent(cameraId)}/stream`);
  }

  async refreshStreamTicket(cameraId: string) {
    await this.api(`/streams/${encodeURIComponent(cameraId)}/ticket`, { method: "POST" });
  }
}
