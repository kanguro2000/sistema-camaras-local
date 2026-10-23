import { TokenStorage } from "../domain/repositories/token-storage.js";

export class BrowserTokenStorage implements TokenStorage {
  get(): string | null {
    return localStorage.getItem("token");
  }

  set(token: string | null): void {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }
}
