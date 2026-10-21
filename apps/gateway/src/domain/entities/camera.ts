export interface Camera {
  id: string;
  name: string;
  ip: string;
  model?: string;
  username: string;
  hasCredentials: true;
  channel: "hd" | "sd";
  rtspPath: string;
  enabled: boolean;
  ptzSupported: boolean;
  createdAt: string;
  updatedAt: string;
}
