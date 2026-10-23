export function redactRtspCredentials(value: string): string {
  return value.replace(/(rtsps?:\/\/)[^\s/@'"<>]+@/gi, "$1[redacted]@");
}
