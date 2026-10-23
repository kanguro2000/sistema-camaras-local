import React, { useEffect, useRef } from "react";
import Hls from "hls.js";

interface Props {
  src: string;
  className?: string;
}

export default function HlsPlayer({ src, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        xhrSetup: (xhr) => {
          xhr.withCredentials = true;
        },
        lowLatencyMode: true,
        liveSyncDuration: 1,
        liveMaxLatencyDuration: 3,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => video.play().catch(() => {}));
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [src]);

  return <video ref={videoRef} className={className} muted playsInline controls={false} />;
}
