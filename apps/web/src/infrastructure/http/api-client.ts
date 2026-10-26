import type { TokenStorage } from "../../domain/repositories/token-storage.js";

const BASE = "";
const AUTH_ENDPOINTS_WITHOUT_REFRESH = new Set([
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",
]);

export type ApiClient = <T = unknown>(path: string, init?: RequestInit) => Promise<T>;

function notifyAuthExpired(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth-expired"));
  }
}

export function createApiClient(tokenStorage: TokenStorage): ApiClient {
  let refreshInFlight: Promise<string | null> | null = null;

  const request = (path: string, init: RequestInit, token: string | null) => {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (token && path.startsWith("/api/")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(BASE + path, {
      ...init,
      credentials: "include",
      headers,
    });
  };

  const refreshAccessToken = (): Promise<string | null> => {
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        const response = await fetch(`${BASE}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (response.status === 401) {
          tokenStorage.set(null);
          notifyAuthExpired();
          return null;
        }
        if (!response.ok) {
          throw new Error(`${response.status}: ${await response.text()}`);
        }
        const result: unknown = await response.json();
        if (
          typeof result !== "object"
          || result === null
          || !("accessToken" in result)
          || typeof result.accessToken !== "string"
        ) {
          throw new Error("Invalid refresh response");
        }
        tokenStorage.set(result.accessToken);
        return result.accessToken;
      })().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  };

  return async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    let response = await request(path, init, tokenStorage.get());
    const canRefresh = path.startsWith("/api/")
      && !AUTH_ENDPOINTS_WITHOUT_REFRESH.has(path)
      && response.status === 401;

    if (canRefresh) {
      const token = await refreshAccessToken();
      if (token) {
        response = await request(path, init, token);
        if (response.status === 401) {
          tokenStorage.set(null);
          notifyAuthExpired();
        }
      }
    }

    if (!response.ok) {
      throw new Error(`${response.status}: ${await response.text()}`);
    }
    if (response.status === 204) return undefined as T;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response.json() as Promise<T>;
    return (await response.text()) as T;
  };
}
