import {
  CameraProbeResultSchema,
  CameraSchema,
  CameraStreamHealthSchema,
  UserSchema,
} from "@sistema-camaras/shared";
import { Camera, CameraCreateInput, CameraUpdateInput } from "../../domain/entities/camera.js";
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

  async currentUser() {
    return UserSchema.parse(await this.api("/api/auth/me"));
  }

  async listCameras(): Promise<Camera[]> {
    const result = await this.api<{ items: unknown }>("/api/cameras");
    if (!Array.isArray(result.items)) throw new Error("Invalid camera-list response");
    return result.items.map((camera) => CameraSchema.parse(camera));
  }

  async createCamera(input: CameraCreateInput): Promise<Camera> {
    return CameraSchema.parse(
      await this.api("/api/cameras", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
  }

  async updateCamera(id: string, input: CameraUpdateInput): Promise<Camera> {
    return CameraSchema.parse(
      await this.api(`/api/cameras/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    );
  }

  async deleteCamera(id: string): Promise<void> {
    await this.api(`/api/cameras/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async probeCamera(id: string) {
    return CameraProbeResultSchema.parse(
      await this.api(`/api/cameras/${encodeURIComponent(id)}/probe`, { method: "POST" }),
    );
  }

  async openStream(cameraId: string) {
    const result = await this.api<{ hlsUrl: unknown; health: unknown }>(
      `/api/cameras/${encodeURIComponent(cameraId)}/stream`,
    );
    if (typeof result.hlsUrl !== "string") {
      throw new Error("Invalid camera-stream response");
    }
    return { hlsUrl: result.hlsUrl, health: CameraStreamHealthSchema.parse(result.health) };
  }

  async cameraStreamHealth(cameraId: string) {
    return CameraStreamHealthSchema.parse(
      await this.api(`/api/cameras/${encodeURIComponent(cameraId)}/health`),
    );
  }

  async refreshStreamTicket(cameraId: string) {
    await this.api(`/streams/${encodeURIComponent(cameraId)}/ticket`, { method: "POST" });
  }
}
