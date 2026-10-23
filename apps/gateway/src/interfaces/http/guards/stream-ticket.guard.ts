const STREAM_TICKET_TTL_SECONDS = 60 * 60;

export function readStreamTicket(cookieHeader: string | undefined): string | null {
  const ticket = cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("camera_stream="))
    ?.slice("camera_stream=".length);

  return ticket || null;
}

export function streamTicketCookie(ticket: string, cameraId: string, secure: boolean): string {
  const attributes = [
    `camera_stream=${ticket}`,
    `Path=/streams/${cameraId}`,
    `Max-Age=${STREAM_TICKET_TTL_SECONDS}`,
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}
