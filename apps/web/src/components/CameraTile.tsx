import React from "react";
import StreamPlayer from "./StreamPlayer.js";

export type CameraPlaybackStatus = "loading" | "playing" | "error";

interface Props {
  index: number;
  name: string;
  enabled: boolean;
  src?: string;
  status: string;
  selected: boolean;
  onSelect: () => void;
  onRetry?: () => void;
  onPlaybackStatusChange: (status: CameraPlaybackStatus) => void;
}

export default function CameraTile({
  index,
  name,
  enabled,
  src,
  status,
  selected,
  onSelect,
  onRetry,
  onPlaybackStatusChange,
}: Props) {
  const statusClass = {
    "En vivo": "live",
    Conectando: "connecting",
    "Cargando video": "loading",
    Error: "error",
    "Error de reproducción": "error",
    Detenida: "stopped",
    Deshabilitada: "disabled",
  }[status] ?? "unknown";

  return (
    <div className="camera-tile-container">
      <button
        className={`tile ${selected ? "selected" : ""}`}
        onClick={onSelect}
        data-camera-index={index}
        tabIndex={0}
        disabled={!enabled}
        aria-disabled={!enabled}
        aria-label={enabled
          ? `${name}: ${status}. Abrir a pantalla completa.`
          : `${name}: cámara deshabilitada.`}
      >
        {src && (
          <StreamPlayer
            src={src}
            className="tile-video"
            onPlaybackStatusChange={onPlaybackStatusChange}
          />
        )}
        <span className="tile-name">{name}</span>
        <span className={`tile-status status-${enabled ? statusClass : "disabled"}`}>
          {status}
        </span>
      </button>
      {onRetry && (
        <button
          type="button"
          className="tile-retry"
          onClick={onRetry}
          aria-label={`Reintentar stream de ${name}`}
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
