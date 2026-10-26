import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface Props {
  src: string;
  className?: string;
  onPlaybackStatusChange?: (status: "loading" | "playing" | "error") => void;
}

export default function HlsPlayer({ src, className, onPlaybackStatusChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const statusCallbackRef = useRef(onPlaybackStatusChange);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");

  useEffect(() => {
    statusCallbackRef.current = onPlaybackStatusChange;
  }, [onPlaybackStatusChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls: Hls | null = null;
    const reportStatus = (status: "loading" | "playing" | "error") => {
      setStatus(status);
      statusCallbackRef.current?.(status);
    };
    reportStatus("loading");
    const handlePlaying = () => reportStatus("playing");
    const handleError = () => reportStatus("error");
    const handleLoadedMetadata = () => {
      video.play().catch(handleError);
    };
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("error", handleError);

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
        video.play().catch(handleError);
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) handleError();
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", handleLoadedMetadata);
    } else {
      handleError();
    }

    return () => {
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("error", handleError);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      if (hls) hls.destroy();
    };
  }, [src]);

  return (
    <>
      <video ref={videoRef} className={className} muted playsInline controls={false} />
      {status === "error" && (
        <span className="player-error" role="alert">No se pudo reproducir el video.</span>
      )}
    </>
  );
}
