import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CameraCreateSchema,
  CameraProbeResultSchema,
  CameraSchema,
  LoginSchema,
} from "../src/index.js";

test("camera contracts accept IPv4 and IPv6 without exposing credential fields", () => {
  const input = {
    name: "Entrada",
    username: "camera-user",
    password: "camera-password",
    enabled: true,
  };
  assert.equal(CameraCreateSchema.safeParse({ ...input, ip: "192.0.2.10" }).success, true);
  assert.equal(CameraCreateSchema.safeParse({ ...input, ip: "2001:db8::10" }).success, true);
  assert.equal(CameraCreateSchema.safeParse({ ...input, ip: "invalid" }).success, false);

  const camera = CameraSchema.parse({
    id: "6a6d8fd8-8243-4973-a10a-8af2b79fef9f",
    name: "Entrada",
    ip: "192.0.2.10",
    username: "must-not-be-returned",
    password: "must-not-be-returned",
    hasCredentials: true,
    createdAt: "2026-10-23T00:00:00.000Z",
    updatedAt: "2026-10-23T00:00:00.000Z",
  });
  assert.equal("username" in camera, false);
  assert.equal("password" in camera, false);
});

test("login contract rejects empty credentials", () => {
  assert.equal(LoginSchema.safeParse({ username: "", password: "x" }).success, false);
  assert.equal(LoginSchema.safeParse({ username: "admin", password: "secret" }).success, true);
});

test("camera probe contract validates success and failure results", () => {
  assert.equal(
    CameraProbeResultSchema.safeParse({ ok: true, codecVideo: "h264", width: 1920, height: 1080 }).success,
    true,
  );
  assert.equal(CameraProbeResultSchema.safeParse({ ok: false, error: "Connection timed out" }).success, true);
  assert.equal(CameraProbeResultSchema.safeParse({ ok: "yes" }).success, false);
});
