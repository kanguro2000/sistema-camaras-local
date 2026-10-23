import { AppGateway } from "../../domain/repositories/app-gateway.js";

export class AppService {
  constructor(private readonly gateway: AppGateway) {}

  login(username: string, password: string) {
    return this.gateway.login(username, password);
  }

  listCameras() {
    return this.gateway.listCameras();
  }

  openStream(cameraId: string) {
    return this.gateway.openStream(cameraId);
  }

  refreshStreamTicket(cameraId: string) {
    return this.gateway.refreshStreamTicket(cameraId);
  }
}
