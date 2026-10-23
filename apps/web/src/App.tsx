import React, { useCallback, useEffect, useState } from "react";
import { AppService } from "./application/services/app-service.js";
import { AppStore } from "./store.js";
import HlsPlayer from "./components/HlsPlayer.js";
import CameraTile from "./components/CameraTile.js";

type View = "login" | "grid" | "fullscreen";

export default function App({ service, store }: { service: AppService; store: AppStore }) {
  const { token, user, setAuth, logout, cameras, setCameras } = store();
  const [view, setView] = useState<View>(token ? "grid" : "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const [fullId, setFullId] = useState<string | null>(null);
  const [fullSrc, setFullSrc] = useState<string | null>(null);

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

  // Load cameras when authenticated
  useEffect(() => {
    if (!token) return;
    service.listCameras()
      .then(setCameras)
      .catch((e) => setError(String(e)));
  }, [service, token, setCameras]);

  // D-pad navigation for grid
  useEffect(() => {
    if (view !== "grid") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setSelected((s) => Math.min(s + 1, cameras.length - 1));
      else if (e.key === "ArrowLeft") setSelected((s) => Math.max(s - 1, 0));
      else if (e.key === "ArrowDown") setSelected((s) => Math.min(s + 2, cameras.length - 1));
      else if (e.key === "ArrowUp") setSelected((s) => Math.max(s - 2, 0));
      else if (e.key === "Enter") {
        if (cameras[selected]) void openCamera(cameras[selected].id);
      } else if (e.key === "Escape" || e.key === "Backspace") {
        logout();
        setView("login");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view, cameras, selected, openCamera, logout]);

  // Fullscreen back
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

  return (
    <div className="grid-view">
      <header>
        <h1>Cámaras ({user?.username})</h1>
      </header>
      <div className="grid">
        {cameras.map((c, i) => (
          <CameraTile
            key={c.id}
            name={c.name}
            selected={i === selected}
            onSelect={() => {
              setSelected(i);
              void openCamera(c.id);
            }}
          />
        ))}
        {cameras.length === 0 && <p>No hay cámaras. Agrégalas desde el gateway.</p>}
      </div>
      {error && <p className="error">{error}</p>}
      <footer className="hint">Flechas: navegar · Enter: abrir · Esc: salir</footer>
    </div>
  );
}
