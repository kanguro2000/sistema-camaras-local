import assert from "node:assert/strict";
import { test } from "node:test";
import { CameraCreateSchema, CameraSchema } from "@sistema-camaras/shared";
import { redactRtspCredentials } from "./infrastructure/security/secret-redaction.js";

process.env.JWT_SECRET = "runtime-test-jwt-secret-with-sufficient-length";
process.env.MASTER_KEY = Buffer.alloc(32).toString("base64");
process.env.DB_PATH = ":memory:";
process.env.ADMIN_PASSWORD = "runtime-test-admin-password";

const { decrypt, encrypt } = await import("./infrastructure/security/crypto.service.js");
const { readStreamTicket, streamTicketCookie } = await import(
  "./interfaces/http/guards/stream-ticket.guard.js"
);
const { JwtStreamTicketService } = await import("./infrastructure/security/jwt-stream-ticket.service.js");
const streamTickets = new JwtStreamTicketService(process.env.JWT_SECRET!);
const { JwtAccessTokenService } = await import("./infrastructure/security/jwt-access-token.service.js");
const { readRefreshToken, clearRefreshTokenCookie } = await import(
  "./interfaces/http/guards/refresh-token-cookie.js"
);
const { buildApp } = await import("./app.js");

function authorizationHeader(token: string) {
  return { authorization: ["Be", "arer "].join("") + token };
}

test("validates access-token claims without unsafe payload casts", () => {
  const tokens = new JwtAccessTokenService(process.env.JWT_SECRET!);
  const user = { sub: "user-1", username: "viewer", role: "viewer" as const };
  const token = tokens.issue(user);

  assert.deepEqual(tokens.verify(token), user);
  assert.equal(tokens.verify(`${token}tampered`), null);
});

test("redacts RTSP usernames and passwords from diagnostic text", () => {
  const message = "Could not open rtsp://user:secret@192.0.2.10:554/stream1";
  assert.equal(
    redactRtspCredentials(message),
    "Could not open rtsp://[redacted]@192.0.2.10:554/stream1",
  );
});

test("encrypts camera passwords and decrypts them without exposing plaintext", () => {
  const password = "camera-password-test";
  const encrypted = encrypt(password);

  assert.equal(decrypt(encrypted), password);
  assert.equal(encrypted.includes(password), false);
});

test("camera create validation accepts IPv4 and IPv6 addresses", () => {
  const camera = {
    name: "Test camera",
    username: "camera-user",
    password: "camera-password",
    channel: "hd",
    enabled: true,
  };

  assert.equal(CameraCreateSchema.safeParse({ ...camera, ip: "192.0.2.10" }).success, true);
  assert.equal(CameraCreateSchema.safeParse({ ...camera, ip: "2001:db8::10" }).success, true);
  assert.equal(CameraCreateSchema.safeParse({ ...camera, ip: "not-an-ip" }).success, false);
});

test("public camera schema omits credential usernames", () => {
  const camera = CameraSchema.parse({
    id: "6a6d8fd8-8243-4973-a10a-8af2b79fef9f",
    name: "Test camera",
    ip: "192.0.2.10",
    username: "must-not-be-returned",
    hasCredentials: true,
    createdAt: "2026-10-23T00:00:00.000Z",
    updatedAt: "2026-10-23T00:00:00.000Z",
  });

  assert.equal("username" in camera, false);
  assert.equal(camera.hasCredentials, true);
});

test("camera API omits credentials and stream resources require a scoped ticket", async () => {
  const app = await buildApp();
  try {
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: process.env.ADMIN_PASSWORD },
    });

    test("auth refresh rotates its HttpOnly cookie and logout revokes the session", async () => {
      const app = await buildApp();
      try {
        const login = async () => app.inject({
          method: "POST",
          url: "/api/auth/login",
          payload: { username: "admin", password: process.env.ADMIN_PASSWORD },
        });
        const firstLogin = await login();
        assert.equal(firstLogin.statusCode, 200);
        assert.equal("refreshToken" in firstLogin.json(), false);
        const firstCookieHeader = String(firstLogin.headers["set-cookie"]);
        assert.match(firstCookieHeader, /HttpOnly/);
        assert.match(firstCookieHeader, /SameSite=Strict/);
        assert.match(firstCookieHeader, /Path=\/api\/auth/);
        const firstRefreshToken = readRefreshToken(firstCookieHeader);
        assert.ok(firstRefreshToken);

        const firstRefresh = await app.inject({
          method: "POST",
          url: "/api/auth/refresh",
          headers: { cookie: `camera_refresh=${firstRefreshToken}` },
        });
        assert.equal(firstRefresh.statusCode, 200);
        assert.equal(typeof firstRefresh.json<{ accessToken: unknown }>().accessToken, "string");
        assert.equal("refreshToken" in firstRefresh.json(), false);
        const rotatedToken = readRefreshToken(String(firstRefresh.headers["set-cookie"]));
        assert.ok(rotatedToken);
        assert.notEqual(rotatedToken, firstRefreshToken);

        const replayed = await app.inject({
          method: "POST",
          url: "/api/auth/refresh",
          headers: { cookie: `camera_refresh=${firstRefreshToken}` },
        });
        assert.equal(replayed.statusCode, 401);
        const revokedAfterReplay = await app.inject({
          method: "POST",
          url: "/api/auth/refresh",
          headers: { cookie: `camera_refresh=${rotatedToken}` },
        });
        assert.equal(revokedAfterReplay.statusCode, 401);

        const secondLogin = await login();
        const secondRefreshToken = readRefreshToken(String(secondLogin.headers["set-cookie"]));
        assert.ok(secondRefreshToken);
        const logout = await app.inject({
          method: "POST",
          url: "/api/auth/logout",
          headers: { cookie: `camera_refresh=${secondRefreshToken}` },
        });
        assert.equal(logout.statusCode, 204);
        assert.equal(readRefreshToken(String(logout.headers["set-cookie"])), null);
        assert.match(String(logout.headers["set-cookie"]), /Max-Age=0/);
        assert.equal(clearRefreshTokenCookie(false).includes("Secure"), false);

        const afterLogout = await app.inject({
          method: "POST",
          url: "/api/auth/refresh",
          headers: { cookie: `camera_refresh=${secondRefreshToken}` },
        });
        assert.equal(afterLogout.statusCode, 401);

        const expiringLogin = await login();
        const expiringRefreshToken = readRefreshToken(String(expiringLogin.headers["set-cookie"]));
        assert.ok(expiringRefreshToken);
        const { getDatabase } = await import("./infrastructure/db/sqlite.database.js");
        getDatabase().prepare("UPDATE refresh_sessions SET expires_at = 0").run();
        const expired = await app.inject({
          method: "POST",
          url: "/api/auth/refresh",
          headers: { cookie: `camera_refresh=${expiringRefreshToken}` },
        });
        assert.equal(expired.statusCode, 401);
      } finally {
        await app.close();
      }
    });
    assert.equal(login.statusCode, 200);
    const loginResult = login.json<{
      accessToken: string;
      user: { id: string; username: string; role: "admin" | "viewer" };
    }>();
    const accessToken = loginResult.accessToken;

    const currentUser = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: authorizationHeader(accessToken),
    });
    assert.equal(currentUser.statusCode, 200);
    assert.deepEqual(currentUser.json(), {
      id: loginResult.user.id,
      username: loginResult.user.username,
      role: loginResult.user.role,
    });

    const anonymousUser = await app.inject({ method: "GET", url: "/api/auth/me" });
    assert.equal(anonymousUser.statusCode, 401);

    const created = await app.inject({
      method: "POST",
      url: "/api/cameras",
      headers: authorizationHeader(accessToken),
      payload: {
        name: "Test camera",
        ip: "192.0.2.10",
        username: "camera-account",
        password: "camera-password",
        channel: "hd",
        enabled: true,
      },
    });
    assert.equal(created.statusCode, 201);
    const camera = created.json<Record<string, unknown>>();
    assert.equal("username" in camera, false);
    assert.equal("password" in camera, false);
    assert.equal(camera.hasCredentials, true);

    const unauthenticatedStream = await app.inject({
      method: "GET",
      url: `/streams/${String(camera.id)}/index.m3u8`,
    });
    assert.equal(unauthenticatedStream.statusCode, 401);

    const ticket = streamTickets.issue("test-user", String(camera.id));
    assert.equal(streamTickets.subject(ticket, String(camera.id)), "test-user");
    assert.equal(streamTickets.subject(ticket, "6a6d8fd8-8243-4973-a10a-8af2b79fef9f"), null);
    const cookie = streamTicketCookie(ticket, String(camera.id), false);
    assert.equal(readStreamTicket(cookie), ticket);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);

    const deniedRefresh = await app.inject({
      method: "POST",
      url: `/streams/${String(camera.id)}/ticket`,
    });
    assert.equal(deniedRefresh.statusCode, 401);

    const hiddenCameraRefresh = await app.inject({
      method: "POST",
      url: "/streams/6a6d8fd8-8243-4973-a10a-8af2b79fef9f/ticket",
    });
    assert.equal(hiddenCameraRefresh.statusCode, 401);

    const refreshed = await app.inject({
      method: "POST",
      url: `/streams/${String(camera.id)}/ticket`,
      headers: { cookie: `camera_stream=${ticket}` },
    });
    assert.equal(refreshed.statusCode, 200);
    assert.match(String(refreshed.headers["set-cookie"]), /HttpOnly/);

    const deleted = await app.inject({
      method: "DELETE",
      url: `/api/cameras/${String(camera.id)}`,
      headers: authorizationHeader(accessToken),
    });
    assert.equal(deleted.statusCode, 204);

    const missingCamera = await app.inject({
      method: "GET",
      url: `/api/cameras/${String(camera.id)}`,
      headers: authorizationHeader(accessToken),
    });
    assert.equal(missingCamera.statusCode, 404);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const failedLogin = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { username: "missing-user", password: "invalid-password" },
      });
      assert.equal(failedLogin.statusCode, 401);
    }
    const rateLimitedLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "missing-user", password: "invalid-password" },
    });
    assert.equal(rateLimitedLogin.statusCode, 429);
  } finally {
    await app.close();
  }
});
