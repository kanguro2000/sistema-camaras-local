import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyCameraOrder,
  loadCameraOrder,
  moveCamera,
  saveCameraOrder,
} from "../src/lib/camera-order.js";

const cameras = [{ id: "a" }, { id: "b" }, { id: "c" }];

test("applyCameraOrder sorts by saved order and keeps unknown cameras last", () => {
  assert.deepEqual(applyCameraOrder(cameras, ["c", "a"]).map((c) => c.id), ["c", "a", "b"]);
  assert.deepEqual(applyCameraOrder(cameras, []).map((c) => c.id), ["a", "b", "c"]);
});

test("moveCamera swaps neighbours and ignores out-of-range moves", () => {
  assert.deepEqual(moveCamera(["a", "b", "c"], "b", -1), ["b", "a", "c"]);
  assert.deepEqual(moveCamera(["a", "b", "c"], "a", -1), ["a", "b", "c"]);
  assert.deepEqual(moveCamera(["a", "b", "c"], "c", 1), ["a", "b", "c"]);
});

test("camera order round-trips through storage and tolerates bad data", () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
  saveCameraOrder(["b", "a"], storage);
  assert.deepEqual(loadCameraOrder(storage), ["b", "a"]);
  data.set("camera-order", "{oops");
  assert.deepEqual(loadCameraOrder(storage), []);
});
