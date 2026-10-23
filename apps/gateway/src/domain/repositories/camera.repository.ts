import { Camera, CameraCreateInput, CameraUpdateInput } from "../entities/camera.js";

export interface CameraRepository {
  list(): Camera[];
  getById(id: string): Camera | null;
  getWithSecret(id: string): { camera: Camera; username: string; password: string } | null;
  create(input: CameraCreateInput): Camera;
  update(id: string, input: CameraUpdateInput): Camera | null;
  delete(id: string): boolean;
}
