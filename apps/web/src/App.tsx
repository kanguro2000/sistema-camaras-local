import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CameraStreamHealth } from "@sistema-camaras/shared";
import { AppService } from "./application/services/app-service.js";
import { AppStore } from "./store.js";
import StreamPlayer from "./components/StreamPlayer.js";
import CameraTile, { type CameraPlaybackStatus } from "./components/CameraTile.js";
import { applyCameraOrder, loadCameraOrder, moveCamera, saveCameraOrder } from "./lib/camera-order.js";
import { getSpatialDirection, isRemoteBackKey, navigateSpatially } from "./lib/spatial-navigation.js";

const CameraManagement = lazy(() => import("./components/CameraManagement.js"));

type View = "login" | "grid" | "fullscreen" | "manage";
type CameraStreamState = {
  hlsUrl?: string;
  health?: CameraStreamHealth;
  playbackStatus?: CameraPlaybackStatus;
  requestFailed?: boolean;
};

const CAMERAS_PER_PAGE = 4;
const HEALTH_POLL_INTERVAL_MS = 10_000;
const TICKET_REFRESH_INTERVAL_MS = 45 * 60 * 1000;

function streamStatusLabel(
  enabled: boolean,
  streamState: CameraStreamState | undefined,
): string {
  if (!enabled) return "Deshabilitada";
  if (streamState?.requestFailed || streamState?.health?.status === "error") return "Error";
  if (streamState?.health?.status === "stopped") return "Detenida";
  if (streamState?.health?.status === "running") {
    if (streamState.playbackStatus === "playing") return "En vivo";
    if (streamState.playbackStatus === "error") return "Error de reproducción";
    return "Cargando video";
  }
  return "Conectando";
}

export default function App({ service, store }: { service: AppService; store: AppStore }) {
  const { token, user, setAuth, setUser, logout, cameras: storedCameras, setCameras } = store();
  const [cameraOrder, setCameraOrder] = useState<string[]>(() => loadCameraOrder());
  const cameras = useMemo(() => applyCameraOrder(storedCameras, cameraOrder), [storedCameras, cameraOrder]);
  const pendingMoveFocus = useRef<{ cameraId: string; move: "before" | "after" } | null>(null);
  const [view, setView] = useState<View>(token ? "grid" : "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const [page, setPage] = useState(0);
  const [streamStates, setStreamStates] = useState<Record<string, CameraStreamState>>({});
  const [fullId, setFullId] = useState<string | null>(null);
  const [fullSrc, setFullSrc] = useState<string | null>(null);
  const [fullPlaybackStatus, setFullPlaybackStatus] = useState<CameraPlaybackStatus>("loading");
  const [fullRetryKey, setFullRetryKey] = useState(0);
  const [fullRetrying, setFullRetrying] = useState(false);
  const fullRetryButton = useRef<HTMLButtonElement>(null);
  const restoreGridFocus = useRef(false);
  const lastGridFocus = useRef<HTMLElement | null>(null);
  const pageCount = Math.max(1, Math.ceil(cameras.length / CAMERAS_PER_PAGE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleCameras = useMemo(
    () => cameras.slice(currentPage * CAMERAS_PER_PAGE, (currentPage + 1) * CAMERAS_PER_PAGE),
    [cameras, currentPage],
  );

  const moveCameraTile = useCallback((cameraId: string, offset: -1 | 1) => {
    const ids = cameras.map((camera) => camera.id);
    const next = moveCamera(ids, cameraId, offset);
    const newIndex = next.indexOf(cameraId);
    if (next.every((id, index) => id === ids[index])) return;
    pendingMoveFocus.current = { cameraId, move: offset < 0 ? "before" : "after" };
    setCameraOrder(next);
    saveCameraOrder(next);
    setPage(Math.floor(newIndex / CAMERAS_PER_PAGE));
    setSelected(newIndex);
  }, [cameras]);

  useLayoutEffect(() => {
    const pending = pendingMoveFocus.current;
    if (!pending || view !== "grid") return;
    pendingMoveFocus.current = null;
    const container = document.querySelector<HTMLElement>(`[data-camera-id="${pending.cameraId}"]`);
    const preferred = container?.querySelector<HTMLButtonElement>(`[data-move="${pending.move}"]:not(:disabled)`);
    const fallback = container?.querySelector<HTMLButtonElement>(".tile-move:not(:disabled)");
    (preferred ?? fallback)?.focus();
  });

  const refreshCameras = useCallback(async () => {
    setCameras(await service.listCameras());
  }, [service, setCameras]);

  const openCamera = useCallback(async (cameraId: string) => {
    setError(null);
    try {
      const stream = await service.openStream(cameraId);
      setFullId(cameraId);
      setFullSrc(stream.hlsUrl);
      setFullPlaybackStatus("loading");
      setFullRetryKey(0);
      setView("fullscreen");
    } catch (err) {
      setError(String(err));
    }
  }, [service]);

  const retryFullscreen = useCallback(async () => {
    if (!fullId || fullRetrying) return;
    setFullRetrying(true);
    try {
      const stream = await service.openStream(fullId);
      setFullSrc(stream.hlsUrl);
      setFullRetryKey((current) => current + 1);
    } catch (err) {
      setFullPlaybackStatus("error");
      setError(String(err));
    } finally {
      setFullRetrying(false);
    }
  }, [fullId, fullRetrying, service]);

  const retryStream = useCallback(async (cameraId: string) => {
    setStreamStates((current) => ({
      ...current,
      [cameraId]: {
        ...current[cameraId],
        hlsUrl: undefined,
        health: { status: "starting", restarts: 0 },
        playbackStatus: "loading",
        requestFailed: false,
      },
    }));
    try {
      const stream = await service.openStream(cameraId);
      setStreamStates((current) => ({
        ...current,
        [cameraId]: { ...current[cameraId], hlsUrl: stream.hlsUrl, health: stream.health },
      }));
    } catch {
      setStreamStates((current) => ({
        ...current,
        [cameraId]: { ...current[cameraId], requestFailed: true },
      }));
    }
  }, [service]);

  useEffect(() => {
    if (!token || user) return;
    let active = true;
    service.currentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (!active) return;
        logout();
        lastGridFocus.current = null;
        setView("login");
        setError("La sesión expiró. Inicia sesión de nuevo.");
      });
    return () => {
      active = false;
    };
  }, [logout, service, setUser, token, user]);

  useEffect(() => {
    const handleSessionExpired = () => {
      logout();
      lastGridFocus.current = null;
      setView("login");
      setError("La sesión expiró. Inicia sesión de nuevo.");
    };
    window.addEventListener("auth-expired", handleSessionExpired);
    return () => window.removeEventListener("auth-expired", handleSessionExpired);
  }, [logout]);

  useEffect(() => {
    if (!token) return;
    refreshCameras()
      .catch((e) => setError(String(e)));
  }, [refreshCameras, token]);

  useEffect(() => {
    if (view !== "grid" || !token) return;
    let active = true;
    const cameraIds = visibleCameras
      .filter((camera) => camera.enabled)
      .map((camera) => camera.id);

    const updateCameraState = (cameraId: string, update: CameraStreamState) => {
      if (!active) return;
      setStreamStates((current) => ({
        ...current,
        [cameraId]: { ...current[cameraId], ...update },
      }));
    };

    const startVisibleStreams = async () => {
      await Promise.all(visibleCameras.map(async (camera) => {
        if (!camera.enabled) {
          updateCameraState(camera.id, { health: { status: "stopped", restarts: 0 } });
          return;
        }
        updateCameraState(camera.id, {
          hlsUrl: undefined,
          health: { status: "starting", restarts: 0 },
          playbackStatus: "loading",
          requestFailed: false,
        });
        try {
          const stream = await service.openStream(camera.id);
          updateCameraState(camera.id, { hlsUrl: stream.hlsUrl, health: stream.health });
        } catch {
          updateCameraState(camera.id, { requestFailed: true });
        }
      }));
    };

    const refreshVisibleHealth = () => {
      void Promise.all(cameraIds.map(async (cameraId) => {
        try {
          const health = await service.cameraStreamHealth(cameraId);
          updateCameraState(cameraId, { health, requestFailed: false });
        } catch {
          updateCameraState(cameraId, { requestFailed: true });
        }
      }));
    };

    void startVisibleStreams();
    const timer = window.setInterval(refreshVisibleHealth, HEALTH_POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [service, token, view, visibleCameras]);

  useEffect(() => {
    if (view !== "grid" || !token) return;
    const refreshTickets = () => {
      if (document.visibilityState !== "visible") return;
      for (const camera of visibleCameras) {
        if (camera.enabled) void service.refreshStreamTicket(camera.id).catch(() => undefined);
      }
    };
    const timer = window.setInterval(refreshTickets, TICKET_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [service, token, view, visibleCameras]);

  useLayoutEffect(() => {
    if (view !== "grid" || !user) return;
    if (lastGridFocus.current?.isConnected && !restoreGridFocus.current) return;
    const container = document.querySelector<HTMLElement>(".grid-view");
    if (!container) return;
    const selectedCamera = container.querySelector<HTMLButtonElement>(
      `[data-camera-index="${selected}"]:not(:disabled)`,
    );
    const firstCamera = container.querySelector<HTMLButtonElement>(".tile:not(:disabled)");
    const target = selectedCamera ?? firstCamera
      ?? container.querySelector<HTMLButtonElement>(".empty-cameras button");
    if (!target) return;
    target.focus();
    lastGridFocus.current = target;
    restoreGridFocus.current = false;
  }, [cameras.length, page, selected, user, view]);

  useEffect(() => {
    if (view !== "grid") return;
    const handler = (event: KeyboardEvent) => {
      const direction = getSpatialDirection(event);
      if (direction) {
        const container = document.querySelector<HTMLElement>(".grid-view");
        if (container && navigateSpatially(container, direction)) event.preventDefault();
        const focusedCamera = document.activeElement instanceof HTMLElement
          ? document.activeElement.closest<HTMLButtonElement>("[data-camera-index]")
          : null;
        if (focusedCamera) {
          const cameraIndex = Number(focusedCamera.dataset.cameraIndex);
          if (Number.isInteger(cameraIndex)) setSelected(cameraIndex);
        }
      } else if (isRemoteBackKey(event)) {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view]);

  useEffect(() => {
    if (view !== "fullscreen") return;
    const handler = (e: KeyboardEvent) => {
      if (isRemoteBackKey(e)) {
        e.preventDefault();
        restoreGridFocus.current = true;
        setView("grid");
        setFullId(null);
        setFullSrc(null);
        setFullPlaybackStatus("loading");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view]);

  useEffect(() => {
    if (view === "fullscreen" && fullPlaybackStatus === "error") {
      fullRetryButton.current?.focus();
    }
  }, [fullPlaybackStatus, view]);

  useEffect(() => {
    if (view !== "fullscreen" || !fullId) return;
    const refreshTicket = () => {
      if (document.visibilityState !== "visible") return;
      void service.refreshStreamTicket(fullId).catch((err) => setError(String(err)));
    };
    const timer = window.setInterval(refreshTicket, 45 * 60 * 1000);
    document.addEventListener("visibilitychange", refreshTicket);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshTicket);
    };
  }, [service, view, fullId]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await service.login(username, password);
      setAuth(res.accessToken, res.user);
      setView("grid");
    } catch (err) {
      setError(String(err));
    }
  };

  const handleLogout = async () => {
    setError(null);
    try {
      await service.logout();
    } catch (cause) {
      setError(`No se pudo invalidar la sesión en el gateway: ${String(cause)}`);
    } finally {
      logout();
      lastGridFocus.current = null;
      setView("login");
    }
  };

  if (token && !user) {
    return <div className="login" role="status">Restaurando sesión…</div>;
  }

  if (view === "login") {
    return (
      <div className="login">
        <h1>Sistema de Cámaras</h1>
        <form onSubmit={login}>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Usuario" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" />
          <button type="submit">Entrar</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  if (view === "fullscreen" && fullId && fullSrc) {
    const cam = cameras.find((c) => c.id === fullId);
    return (
      <div className="fullscreen">
        <StreamPlayer
          key={fullRetryKey}
          src={fullSrc}
          className="video-full"
          onPlaybackStatusChange={setFullPlaybackStatus}
        />
        {(fullPlaybackStatus === "error" || fullRetrying) && (
          <div className="fullscreen-recovery" role="alert">
            <p>{fullRetrying
              ? "Reintentando reproducción…"
              : `No se pudo reproducir el video de ${cam?.name ?? "la cámara"}.`}</p>
            <button
              ref={fullRetryButton}
              type="button"
              onClick={() => void retryFullscreen()}
              disabled={fullRetrying}
            >
              {fullRetrying ? "Reintentando…" : "Reintentar video"}
            </button>
          </div>
        )}
        <div className="overlay">
          <span>{cam?.name}</span>
          <span>Atrás: volver</span>
        </div>
      </div>
    );
  }

  if (view === "manage") {
    return (
      <Suspense
        fallback={(
          <main className="camera-management" role="status">
            Cargando administración…
          </main>
        )}
      >
        <CameraManagement
          cameras={cameras}
          service={service}
          onCamerasChanged={refreshCameras}
          onBack={() => {
            restoreGridFocus.current = true;
            setView("grid");
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="grid-view">
      <header className="grid-header">
        <h1>Cámaras ({user?.username})</h1>
        <nav aria-label="Acciones de usuario">
          {user?.role === "admin" && (
            <button type="button" onClick={() => setView("manage")}>Administrar cámaras</button>
          )}
          <button type="button" onClick={() => void handleLogout()}>Cerrar sesión</button>
        </nav>
      </header>
      <div className="grid">
        {visibleCameras.map((c, i) => {
          const cameraIndex = currentPage * CAMERAS_PER_PAGE + i;
          const streamState = streamStates[c.id];
          const status = streamStatusLabel(c.enabled, streamState);
          return (
          <CameraTile
            key={c.id}
            id={c.id}
            index={cameraIndex}
            name={c.name}
            enabled={c.enabled}
            src={streamState?.hlsUrl}
            status={status}
            selected={cameraIndex === selected}
            onMove={cameras.length > 1 ? (offset) => moveCameraTile(c.id, offset) : undefined}
            canMoveBefore={cameraIndex > 0}
            canMoveAfter={cameraIndex < cameras.length - 1}
            onRetry={c.enabled && (
              streamState?.requestFailed
              || streamState?.health?.status === "error"
              || streamState?.playbackStatus === "error"
            ) ? () => { void retryStream(c.id); } : undefined}
            onPlaybackStatusChange={(playbackStatus) => {
              setStreamStates((current) => ({
                ...current,
                [c.id]: { ...current[c.id], playbackStatus },
              }));
            }}
            onSelect={() => {
              setSelected(cameraIndex);
              if (c.enabled) void openCamera(c.id);
            }}
          />
          );
        })}
        {cameras.length === 0 && (
          <div className="empty-cameras">
            <p>No hay cámaras registradas.</p>
            {user?.role === "admin" ? (
              <button type="button" onClick={() => setView("manage")}>Agregar la primera cámara</button>
            ) : (
              <p>Pide a una persona administradora que registre las cámaras.</p>
            )}
          </div>
        )}
      </div>
      {pageCount > 1 && (
        <nav className="camera-pagination" aria-label="Páginas de cámaras">
          <button
            type="button"
            onClick={() => {
              const nextPage = Math.max(0, currentPage - 1);
              restoreGridFocus.current = true;
              setPage(nextPage);
              setSelected(nextPage * CAMERAS_PER_PAGE);
            }}
            disabled={currentPage === 0}
          >
            Página anterior
          </button>
          <span>
            Cámaras{" "}
            {currentPage * CAMERAS_PER_PAGE + 1}–{Math.min((currentPage + 1) * CAMERAS_PER_PAGE, cameras.length)}
            {" "}de {cameras.length}
          </span>
          <button
            type="button"
            onClick={() => {
              const nextPage = Math.min(pageCount - 1, currentPage + 1);
              restoreGridFocus.current = true;
              setPage(nextPage);
              setSelected(nextPage * CAMERAS_PER_PAGE);
            }}
            disabled={currentPage === pageCount - 1}
          >
            Página siguiente
          </button>
        </nav>
      )}
      {error && <p className="error">{error}</p>}
      <footer className="hint">Flechas: navegar · Enter: abrir · Selecciona una cámara para verla en pantalla completa</footer>
    </div>
  );
}
