import React, { useCallback, useEffect, useState } from "react";
import { AppService } from "./application/services/app-service.js";
import { AppStore } from "./store.js";
import HlsPlayer from "./components/HlsPlayer.js";
import CameraTile from "./components/CameraTile.js";
import CameraManagement from "./components/CameraManagement.js";

type View = "login" | "grid" | "fullscreen" | "manage";

export default function App({ service, store }: { service: AppService; store: AppStore }) {
  const { token, user, setAuth, setUser, logout, cameras, setCameras } = store();
  const [view, setView] = useState<View>(token ? "grid" : "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const [fullId, setFullId] = useState<string | null>(null);
  const [fullSrc, setFullSrc] = useState<string | null>(null);

  const refreshCameras = useCallback(async () => {
    setCameras(await service.listCameras());
  }, [service, setCameras]);

  const openCamera = useCallback(async (cameraId: string) => {
    setError(null);
    try {
      const stream = await service.openStream(cameraId);
      setFullId(cameraId);
      setFullSrc(stream.hlsUrl);
      setView("fullscreen");
    } catch (err) {
      setError(String(err));
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
        setView("login");
        setError("La sesión expiró. Inicia sesión de nuevo.");
      });
    return () => {
      active = false;
    };
  }, [logout, service, setUser, token, user]);

  useEffect(() => {
    if (!token) return;
    refreshCameras()
      .catch((e) => setError(String(e)));
  }, [refreshCameras, token]);

  useEffect(() => {
    if (view !== "grid") return;
    const handler = (event: KeyboardEvent) => {
      if (event.key.startsWith("Arrow")) {
        const controls = Array.from(document.querySelectorAll<HTMLButtonElement>(".grid-view button"));
        if (controls.length === 0) return;
        const currentIndex = controls.findIndex((control) => control === document.activeElement);
        const direction = event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1;
        const nextIndex = currentIndex < 0
          ? (direction > 0 ? 0 : controls.length - 1)
          : (currentIndex + direction + controls.length) % controls.length;
        event.preventDefault();
        const nextControl = controls[nextIndex];
        nextControl?.focus();
        const cameraIndex = Number(nextControl?.dataset.cameraIndex);
        if (Number.isInteger(cameraIndex) && cameraIndex >= 0) setSelected(cameraIndex);
      } else if (event.key === "Enter") {
        const activeControl = document.activeElement?.closest(".grid-view button");
        if (activeControl) return;
        if (cameras[selected]) void openCamera(cameras[selected].id);
      } else if (event.key === "Escape" || event.key === "Backspace") {
        logout();
        setView("login");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view, cameras, selected, openCamera, logout]);

  useEffect(() => {
    if (view !== "fullscreen") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace") {
        setView("grid");
        setFullId(null);
        setFullSrc(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view]);

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
        <HlsPlayer src={fullSrc} className="video-full" />
        <div className="overlay">
          <span>{cam?.name}</span>
          <span>Back: volver</span>
        </div>
      </div>
    );
  }

  if (view === "manage") {
    return (
      <CameraManagement
        cameras={cameras}
        service={service}
        onCamerasChanged={refreshCameras}
        onBack={() => setView("grid")}
      />
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
          <button type="button" onClick={() => { logout(); setView("login"); }}>Cerrar sesión</button>
        </nav>
      </header>
      <div className="grid">
        {cameras.map((c, i) => (
          <CameraTile
            key={c.id}
            index={i}
            name={c.name}
            selected={i === selected}
            onSelect={() => {
              setSelected(i);
              void openCamera(c.id);
            }}
          />
        ))}
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
      {error && <p className="error">{error}</p>}
      <footer className="hint">Flechas: navegar · Enter: abrir · Esc: salir</footer>
    </div>
  );
}
