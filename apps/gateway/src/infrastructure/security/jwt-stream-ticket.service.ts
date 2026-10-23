import jwt from "jsonwebtoken";
import { z } from "zod";
import { StreamTicketService } from "../../domain/services/stream-ticket-service.js";

const STREAM_TICKET_TTL_SECONDS = 60 * 60;
const StreamTicketClaimsSchema = z.object({
  sub: z.string().min(1),
  cameraId: z.string().uuid(),
  purpose: z.literal("stream"),
});

export class JwtStreamTicketService implements StreamTicketService {
  constructor(private readonly secret: string) {}

  issue(userId: string, cameraId: string): string {
    return jwt.sign(
      { sub: userId, cameraId, purpose: "stream" },
      this.secret,
      { expiresIn: STREAM_TICKET_TTL_SECONDS },
    );
  }

  subject(ticket: string | null, cameraId: string): string | null {
    if (!ticket) return null;
    try {
      const parsed = StreamTicketClaimsSchema.safeParse(jwt.verify(ticket, this.secret));
      return parsed.success && parsed.data.cameraId === cameraId ? parsed.data.sub : null;
    } catch {
      return null;
    }
  }
}
