import React from "react";
import StreamPlayer from "./StreamPlayer.js";

export type CameraPlaybackStatus = "loading" | "playing" | "error";

interface Props {
  id: string;
  index: number;
  name: string;
  enabled: boolean;
  src?: string;
  status: string;
  selected: boolean;
  onSelect: () => void;
  onRetry?: () => void;
  onMove?: (offset: -1 | 1) => void;
  canMoveBefore?: boolean;
  canMoveAfter?: boolean;
  onPlaybackStatusChange: (status: CameraPlaybackStatus) => void;
}

export default function CameraTile({
  id,
  index,
  name,
  enabled,
  src,
  status,
  selected,
  onSelect,
  onRetry,
  onMove,
  canMoveBefore = false,
  canMoveAfter = false,
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
    <div className="camera-tile-container" data-camera-id={id}>
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
      {onMove && (
        <div className="tile-order">
          <button
            type="button"
            className="tile-move"
            data-move="before"
            disabled={!canMoveBefore}
            onClick={() => onMove(-1)}
            aria-label={`Mover ${name} a la izquierda`}
          >
            ◀ Izquierda
          </button>
          <button
            type="button"
            className="tile-move"
            data-move="after"
            disabled={!canMoveAfter}
            onClick={() => onMove(1)}
            aria-label={`Mover ${name} a la derecha`}
          >
            Derecha ▶
          </button>
        </div>
      )}
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
