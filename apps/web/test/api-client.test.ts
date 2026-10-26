import assert from "node:assert/strict";
import { test } from "node:test";
import { createApiClient } from "../src/infrastructure/http/api-client.js";
import type { TokenStorage } from "../src/domain/repositories/token-storage.js";

class MemoryTokenStorage implements TokenStorage {
  token: string | null = "expired-access-token";

  get() {
    return this.token;
  }

  set(token: string | null) {
    this.token = token;
  }
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("API client refreshes an expired access token and retries the request once", async () => {
  const storage = new MemoryTokenStorage();
  const requests: Array<{ url: string; authorization: string | null }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    const authorization = new Headers(init.headers).get("Authorization");
    requests.push({ url, authorization });
    if (url === "/api/cameras" && authorization === "Bearer expired-access-token") {
      return jsonResponse({ error: "expired" }, 401);
    }
    if (url === "/api/auth/refresh") {
      return jsonResponse({ accessToken: "renewed-access-token" });
    }
    if (url === "/api/cameras" && authorization === "Bearer renewed-access-token") {
      return jsonResponse({ items: [] });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const api = createApiClient(storage);
    assert.deepEqual(await api("/api/cameras"), { items: [] });
    assert.equal(storage.get(), "renewed-access-token");
    assert.deepEqual(requests, [
      { url: "/api/cameras", authorization: "Bearer expired-access-token" },
      { url: "/api/auth/refresh", authorization: null },
      { url: "/api/cameras", authorization: "Bearer renewed-access-token" },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("concurrent unauthorized requests share one refresh operation", async () => {
  const storage = new MemoryTokenStorage();
  const counts = new Map<string, number>();
  const originalFetch = globalThis.fetch;
  let releaseRefresh: (() => void) | undefined;
  const refreshStarted = new Promise<void>((resolve) => {
    globalThis.fetch = async (input, init = {}) => {
      const url = String(input);
      counts.set(url, (counts.get(url) ?? 0) + 1);
      if (url === "/api/auth/refresh") {
        await new Promise<void>((resolveRefresh) => {
          releaseRefresh = resolveRefresh;
          resolve();
        });
        return jsonResponse({ accessToken: "renewed-access-token" });
      }
      if (new Headers(init.headers).get("Authorization") === "Bearer expired-access-token") {
        return jsonResponse({ error: "expired" }, 401);
      }
      return jsonResponse({ path: url });
    };
  });

  try {
    const api = createApiClient(storage);
    const first = api("/api/cameras/one");
    const second = api("/api/cameras/two");
    await refreshStarted;
    releaseRefresh?.();
    assert.deepEqual(await Promise.all([first, second]), [
      { path: "/api/cameras/one" },
      { path: "/api/cameras/two" },
    ]);
    assert.equal(counts.get("/api/auth/refresh"), 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
