import { AppService } from "./application/services/app-service.js";
import { createAppStore } from "./store.js";
import { BrowserTokenStorage } from "./infrastructure/browser-token-storage.js";
import { createApiClient } from "./infrastructure/http/api-client.js";
import { HttpAppGateway } from "./infrastructure/repositories/http-app-gateway.js";

const tokenStorage = new BrowserTokenStorage();

export const appService = new AppService(
  new HttpAppGateway(createApiClient(tokenStorage)),
);
export const appStore = createAppStore(tokenStorage);
