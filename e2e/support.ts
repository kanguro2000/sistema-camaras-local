import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

interface TestCamera {
  id: string;
  name: string;
  ip: string;
  model?: string;
  hasCredentials: boolean;
  channel: "hd" | "sd";
  rtspPath: string;
  enabled: boolean;
  ptzSupported: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GatewayState {
  cameras: TestCamera[];
}

const TEST_USER = {
  id: "20000000-0000-4000-8000-000000000001",
  username: "demo",
  role: "admin",
};

const ACCESS_TOKEN = "e2e-access-token";

function createCamera(name: string, ip: string, model?: string): TestCamera {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    name,
    ip,
    ...(model ? { model } : {}),
    hasCredentials: true,
    channel: "hd",
    rtspPath: "/stream1",
    enabled: true,
    ptzSupported: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function installGatewayMock(page: Page, initialCameras: TestCamera[] = []): Promise<GatewayState> {
  const state: GatewayState = { cameras: [...initialCameras] };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === "/api/auth/login") {
      const body = request.postDataJSON() as { username: string; password: string };
      if (body.username !== "demo" || body.password !== "correct-password") {
        await route.fulfill({ status: 401, json: { message: "Credenciales no válidas." } });
        return;
      }
      await route.fulfill({ json: { accessToken: ACCESS_TOKEN, user: TEST_USER } });
      return;
    }

    if (pathname === "/api/auth/logout") {
      await route.fulfill({ status: 204 });
      return;
    }

    if (request.headers().authorization !== `Bearer ${ACCESS_TOKEN}`) {
      await route.fulfill({ status: 401, json: { message: "No autorizado." } });
      return;
    }

    if (pathname === "/api/auth/me") {
      await route.fulfill({ json: TEST_USER });
      return;
    }

    if (pathname === "/api/cameras" && request.method() === "GET") {
      await route.fulfill({ json: { items: state.cameras } });
      return;
    }

    if (pathname === "/api/cameras" && request.method() === "POST") {
      const body = request.postDataJSON() as { name: string; ip: string; model?: string };
      const camera = createCamera(body.name, body.ip, body.model);
      state.cameras.push(camera);
      await route.fulfill({ status: 201, json: camera });
      return;
    }

    if (pathname.endsWith("/stream")) {
      const cameraId = pathname.split("/").at(-2);
      await route.fulfill({
        json: {
          hlsUrl: `/streams/${cameraId}/index.m3u8`,
          health: { status: "running", restarts: 0 },
        },
      });
      return;
    }

    if (pathname.endsWith("/health")) {
      await route.fulfill({ json: { status: "running", restarts: 0 } });
      return;
    }

    await route.fulfill({ status: 404, json: { message: "Ruta no simulada." } });
  });

  await page.route("**/streams/**", (route) => route.abort());
  return state;
}

export async function signIn(page: Page): Promise<void> {
  await page.goto("/");
  const username = page.locator(".login input").nth(0);
  const password = page.locator(".login input").nth(1);
  const submit = page.locator('.login button[type="submit"]');

  await username.fill("demo");
  await password.fill("wrong-password");
  await submit.click();
  await expect(page.locator(".login .error")).toContainText("401");

  await password.fill("correct-password");
  await submit.click();
  await expect(page.locator(".grid-view")).toBeVisible();
}

export function cameraFixture(name: string, ip: string): TestCamera {
  return createCamera(name, ip);
}
