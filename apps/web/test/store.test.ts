import assert from "node:assert/strict";
import { test } from "node:test";
import { TokenStorage } from "../src/domain/repositories/token-storage.js";
import { createAppStore } from "../src/store.js";

class MemoryTokenStorage implements TokenStorage {
  value: string | null = null;

  get() {
    return this.value;
  }

  set(token: string | null) {
    this.value = token;
  }
}

test("store persists authentication through the injected token-storage port", () => {
  const storage = new MemoryTokenStorage();
  const store = createAppStore(storage);
  const user = {
    id: "6a6d8fd8-8243-4973-a10a-8af2b79fef9f",
    username: "viewer",
    role: "viewer" as const,
  };

  store.getState().setAuth("access-token", user);
  assert.equal(storage.value, "access-token");
  assert.deepEqual(store.getState().user, user);

  store.getState().logout();
  assert.equal(storage.value, null);
  assert.equal(store.getState().token, null);
  assert.equal(store.getState().user, null);
});
