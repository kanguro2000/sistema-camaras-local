export interface StreamTicketService {
  issue(userId: string, cameraId: string): string;
  subject(ticket: string | null, cameraId: string): string | null;
}
