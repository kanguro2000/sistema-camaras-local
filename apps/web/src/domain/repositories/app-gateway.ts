import { Camera, CameraCreateInput, CameraUpdateInput } from "../entities/camera.js";
import { User } from "../entities/user.js";
import type { CameraProbeResult } from "@sistema-camaras/shared";

export interface AppGateway {
  login(username: string, password: string): Promise<{ accessToken: string; user: User }>;
  currentUser(): Promise<User>;
  listCameras(): Promise<Camera[]>;
  createCamera(input: CameraCreateInput): Promise<Camera>;
  updateCamera(id: string, input: CameraUpdateInput): Promise<Camera>;
  deleteCamera(id: string): Promise<void>;
  probeCamera(id: string): Promise<CameraProbeResult>;
  openStream(cameraId: string): Promise<{ hlsUrl: string }>;
  refreshStreamTicket(cameraId: string): Promise<void>;
}
