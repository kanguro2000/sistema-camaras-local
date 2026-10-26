import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface Props {
  src: string;
  className?: string;
  onPlaybackStatusChange?: (status: "loading" | "playing" | "error") => void;
}

const WATCHDOG_INTERVAL_MS = 2_000;
const STALL_TIMEOUT_MS = 8_000;
const MAX_AUTO_RECOVERIES = 5;
const RECOVERY_DELAY_MS = 1_000;

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
    let disposed = false;
    let recoveries = 0;
    let recoveryTimer: number | undefined;
    let lastTime = -1;
    let lastProgressAt = Date.now();

    const reportStatus = (next: "loading" | "playing" | "error") => {
      setStatus(next);
      statusCallbackRef.current?.(next);
    };
    const handleError = () => reportStatus("error");

    const createHls = () => {
      hls?.destroy();
      const instance = new Hls({
        xhrSetup: (xhr) => {
          xhr.withCredentials = true;
        },
        lowLatencyMode: true,
        liveSyncDuration: 1,
        liveMaxLatencyDuration: 3,
      });
      hls = instance;
      instance.loadSource(src);
      instance.attachMedia(video);
      instance.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => undefined);
      });
      instance.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) recover();
      });
    };

    // Reintenta de forma automática antes de mostrar el error al usuario.
    const recover = () => {
      if (disposed || recoveryTimer !== undefined) return;
      if (recoveries >= MAX_AUTO_RECOVERIES) {
        handleError();
        return;
      }
      recoveries += 1;
      reportStatus("loading");
      recoveryTimer = window.setTimeout(() => {
        recoveryTimer = undefined;
        if (disposed) return;
        lastProgressAt = Date.now();
        lastTime = -1;
        createHls();
      }, RECOVERY_DELAY_MS);
    };

    const handlePlaying = () => {
      lastProgressAt = Date.now();
      reportStatus("playing");
    };
    const handleLoadedMetadata = () => {
      video.play().catch(handleError);
    };
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("error", handleError);

    reportStatus("loading");
    let watchdog: number | undefined;

    if (Hls.isSupported()) {
      createHls();
      watchdog = window.setInterval(() => {
        if (document.visibilityState !== "visible") {
          lastProgressAt = Date.now();
          return;
        }
        if (video.currentTime !== lastTime) {
          lastTime = video.currentTime;
          lastProgressAt = Date.now();
          if (recoveries > 0 && !video.paused) recoveries = 0;
          return;
        }
        if (Date.now() - lastProgressAt >= STALL_TIMEOUT_MS) {
          lastProgressAt = Date.now();
          recover();
        }
      }, WATCHDOG_INTERVAL_MS);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", handleLoadedMetadata);
    } else {
      handleError();
    }

    return () => {
      disposed = true;
      window.clearTimeout(recoveryTimer);
      window.clearInterval(watchdog);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("error", handleError);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      hls?.destroy();
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
