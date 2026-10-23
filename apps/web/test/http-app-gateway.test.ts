import assert from "node:assert/strict";
import { test } from "node:test";
import { createApiClient } from "../src/infrastructure/http/api-client.js";
import { HttpAppGateway } from "../src/infrastructure/repositories/http-app-gateway.js";
import type { TokenStorage } from "../src/domain/repositories/token-storage.js";

class MemoryTokenStorage implements TokenStorage {
  get() {
    return "test-access-token";
  }

  set() {}
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
  });
}

test("camera management adapter sends authenticated CRUD and probe requests", async () => {
  const camera = {
    id: "6a6d8fd8-8243-4973-a10a-8af2b79fef9f",
    name: "Entrada",
    ip: "192.0.2.10",
    hasCredentials: true,
    channel: "hd",
    rtspPath: "/stream1",
    enabled: true,
    ptzSupported: false,
    createdAt: "2026-10-23T00:00:00.000Z",
    updatedAt: "2026-10-23T00:00:00.000Z",
  };
  const responses = [
    jsonResponse({ id: camera.id, username: "admin", role: "admin" }),
    jsonResponse(camera),
    jsonResponse({ ...camera, name: "Patio" }),
    jsonResponse({ ok: true, codecVideo: "h264", width: 1920, height: 1080 }),
    new Response(null, { status: 204 }),
    jsonResponse({ items: [] }),
  ];
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    requests.push({ url: String(input), init });
    const response = responses.shift();
    if (!response) throw new Error("Unexpected API request");
    return response;
  };

  try {
    const gateway = new HttpAppGateway(createApiClient(new MemoryTokenStorage()));
    assert.deepEqual(await gateway.currentUser(), { id: camera.id, username: "admin", role: "admin" });

    const created = await gateway.createCamera({
      name: "Entrada",
      ip: "192.0.2.10",
      username: "camera-user",
      password: "camera-password",
      channel: "hd",
      enabled: true,
    });
    assert.equal(created.name, "Entrada");

    const updated = await gateway.updateCamera(camera.id, { name: "Patio" });
    assert.equal(updated.name, "Patio");

    assert.deepEqual(await gateway.probeCamera(camera.id), {
      ok: true,
      codecVideo: "h264",
      width: 1920,
      height: 1080,
    });

    await gateway.deleteCamera(camera.id);
    assert.deepEqual(await gateway.listCameras(), []);

    assert.deepEqual(requests.map(({ url, init }) => [url, init.method ?? "GET"]), [
      ["/api/auth/me", "GET"],
      ["/api/cameras", "POST"],
      [`/api/cameras/${camera.id}`, "PATCH"],
      [`/api/cameras/${camera.id}/probe`, "POST"],
      [`/api/cameras/${camera.id}`, "DELETE"],
      ["/api/cameras", "GET"],
    ]);
    assert.equal(new Headers(requests[1]?.init.headers).get("Authorization"), "Bearer test-access-token");
    assert.deepEqual(JSON.parse(String(requests[1]?.init.body)), {
      name: "Entrada",
      ip: "192.0.2.10",
      username: "camera-user",
      password: "camera-password",
      channel: "hd",
      enabled: true,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
