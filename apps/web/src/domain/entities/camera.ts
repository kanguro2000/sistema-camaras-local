export interface Camera {
  id: string;
  name: string;
  ip: string;
  model?: string;
  hasCredentials: boolean;
  channel: "hd" | "sd";
  rtspPath: string;
  enabled: boolean;
  ptzSupported: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CameraCreateInput {
  name: string;
  ip: string;
  model?: string;
  username: string;
  password: string;
  channel: "hd" | "sd";
  enabled: boolean;
}

export type CameraUpdateInput = Partial<CameraCreateInput>;
