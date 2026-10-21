import { Camera } from "../entities/camera.js";
import { CameraCreate, CameraUpdate } from "@sistema-camaras/shared";

export interface CameraRepository {
  list(): Camera[];
  getById(id: string): Camera | null;
  getWithSecret(id: string): { camera: Camera; username: string; password: string } | null;
  create(input: CameraCreate): Camera;
  update(id: string, input: CameraUpdate): Camera | null;
  delete(id: string): boolean;
}
