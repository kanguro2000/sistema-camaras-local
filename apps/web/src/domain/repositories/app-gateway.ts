import { Camera } from "../entities/camera.js";
import { User } from "../entities/user.js";

export interface AppGateway {
  login(username: string, password: string): Promise<{ accessToken: string; user: User }>;
  listCameras(): Promise<Camera[]>;
  openStream(cameraId: string): Promise<{ hlsUrl: string }>;
  refreshStreamTicket(cameraId: string): Promise<void>;
}
