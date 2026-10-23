export interface CameraProbeResult {
  ok: boolean;
  codecVideo?: string;
  codecAudio?: string;
  width?: number;
  height?: number;
  error?: string;
}

export interface CameraProbe {
  probe(rtspUrl: string): Promise<CameraProbeResult>;
}
