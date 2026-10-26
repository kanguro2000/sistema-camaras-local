import { REFRESH_TOKEN_TTL_MS } from "../../../domain/services/refresh-token-service.js";

const REFRESH_COOKIE_NAME = "camera_refresh";

export function readRefreshToken(cookieHeader: string | undefined): string | null {
  const prefix = `${REFRESH_COOKIE_NAME}=`;
  const value = cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
  return value || null;
}

export function refreshTokenCookie(token: string, secure: boolean): string {
  const attributes = [
    `${REFRESH_COOKIE_NAME}=${token}`,
    "Path=/api/auth",
    `Max-Age=${Math.floor(REFRESH_TOKEN_TTL_MS / 1000)}`,
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

export function clearRefreshTokenCookie(secure: boolean): string {
  const attributes = [
    `${REFRESH_COOKIE_NAME}=`,
    "Path=/api/auth",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}
