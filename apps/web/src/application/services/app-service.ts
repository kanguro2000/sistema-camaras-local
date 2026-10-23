import { AppGateway } from "../../domain/repositories/app-gateway.js";
import { CameraCreateInput, CameraUpdateInput } from "../../domain/entities/camera.js";

export class AppService {
  constructor(private readonly gateway: AppGateway) {}

  login(username: string, password: string) {
    return this.gateway.login(username, password);
  }

  currentUser() {
    return this.gateway.currentUser();
  }

  listCameras() {
    return this.gateway.listCameras();
  }

  createCamera(input: CameraCreateInput) {
    return this.gateway.createCamera(input);
  }

  updateCamera(id: string, input: CameraUpdateInput) {
    return this.gateway.updateCamera(id, input);
  }

  deleteCamera(id: string) {
    return this.gateway.deleteCamera(id);
  }

  probeCamera(id: string) {
    return this.gateway.probeCamera(id);
  }

  openStream(cameraId: string) {
    return this.gateway.openStream(cameraId);
  }

  refreshStreamTicket(cameraId: string) {
    return this.gateway.refreshStreamTicket(cameraId);
  }
}
