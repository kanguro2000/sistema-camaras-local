import { lazy, Suspense } from "react";

const HlsPlayer = lazy(() => import("./HlsPlayer.js"));

interface Props {
  src: string;
  className?: string;
  onPlaybackStatusChange?: (status: "loading" | "playing" | "error") => void;
}

export default function StreamPlayer({ src, className, onPlaybackStatusChange }: Props) {
  return (
    <Suspense
      fallback={(
        <div className={`player-loading ${className ?? ""}`} role="status">
          Cargando reproductor…
        </div>
      )}
    >
      <HlsPlayer
        src={src}
        className={className}
        onPlaybackStatusChange={onPlaybackStatusChange}
      />
    </Suspense>
  );
}
