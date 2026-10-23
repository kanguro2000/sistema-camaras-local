import type { TokenStorage } from "../../domain/repositories/token-storage.js";

const BASE = "";

export type ApiClient = <T = unknown>(path: string, init?: RequestInit) => Promise<T>;

export function createApiClient(tokenStorage: TokenStorage): ApiClient {
  return async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    const token = tokenStorage.get();
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (token && path.startsWith("/api/")) headers.set("Authorization", `Bearer ${token}`);
  
    const res = await fetch(BASE + path, {
      ...init,
      credentials: "include",
      headers,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text}`);
    }
    if (res.status === 204) return undefined as T;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return res.json() as Promise<T>;
    return (await res.text()) as T;
  };
}
