import { z } from "zod";

export const CameraChannelSchema = z.enum(["hd", "sd"]);
export type CameraChannel = z.infer<typeof CameraChannelSchema>;

export const CameraSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(64),
  ip: z.union([z.ipv4(), z.ipv6()]),
  model: z.string().optional(),
  hasCredentials: z.boolean().default(true),
  channel: CameraChannelSchema.default("hd"),
  rtspPath: z.string().default("/stream1"),
  enabled: z.boolean().default(true),
  ptzSupported: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Camera = z.infer<typeof CameraSchema>;

export const CameraCreateSchema = z.object({
  name: z.string().min(1).max(64),
  ip: z.union([z.ipv4(), z.ipv6()]),
  model: z.string().optional(),
  username: z.string().min(1),
  password: z.string().min(1),
  channel: CameraChannelSchema.default("hd"),
  enabled: z.boolean().default(true),
});
export type CameraCreate = z.infer<typeof CameraCreateSchema>;

export const CameraUpdateSchema = CameraCreateSchema.partial().omit({ password: true }).extend({
  password: z.string().min(1).optional(),
});
export type CameraUpdate = z.infer<typeof CameraUpdateSchema>;

export const CameraProbeResultSchema = z.object({
  ok: z.boolean(),
  codecVideo: z.string().optional(),
  codecAudio: z.string().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  error: z.string().optional(),
});
export type CameraProbeResult = z.infer<typeof CameraProbeResultSchema>;

export const UserRoleSchema = z.enum(["admin", "viewer"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  role: UserRoleSchema,
});
export type User = z.infer<typeof UserSchema>;

export const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type Login = z.infer<typeof LoginSchema>;

export const PtzActionSchema = z.enum([
  "up",
  "down",
  "left",
  "right",
  "zoomin",
  "zoomout",
  "home",
  "preset",
]);
export type PtzAction = z.infer<typeof PtzActionSchema>;

export const PtzSchema = z.object({
  action: PtzActionSchema,
  speed: z.number().int().min(1).max(8).default(4),
  presetId: z.string().uuid().optional(),
});
export type Ptz = z.infer<typeof PtzSchema>;

export const HealthSchema = z.object({
  status: z.enum(["online", "offline", "connecting"]),
  fps: z.number().optional(),
  bitrate: z.number().optional(),
  lastFrameAt: z.string().datetime().optional(),
});
export type Health = z.infer<typeof HealthSchema>;
