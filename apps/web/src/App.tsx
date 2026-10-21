import React, { useEffect, useState } from "react";
import { useStore } from "./store.js";
import { api } from "./lib/api.js";
import HlsPlayer from "./components/HlsPlayer.js";
import CameraTile from "./components/CameraTile.js";

type View = "login" | "grid" | "fullscreen";

export default function App() {
  const { token, user, setAuth, logout, cameras, setCameras } = useStore();
  const [view, setView] = useState<View>(token ? "grid" : "login");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const [fullId, setFullId] = useState<string | null>(null);

  // Load cameras when authenticated
  useEffect(() => {
    if (!token) return;
    api<{ items: any[] }>("/api/cameras")
      .then((d) => setCameras(d.items ?? []))
      .catch((e) => setError(String(e)));
  }, [token]);

  // D-pad navigation for grid
  useEffect(() => {
    if (view !== "grid") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setSelected((s) => Math.min(s + 1, cameras.length - 1));
      else if (e.key === "ArrowLeft") setSelected((s) => Math.max(s - 1, 0));
      else if (e.key === "ArrowDown") setSelected((s) => Math.min(s + 2, cameras.length - 1));
      else if (e.key === "ArrowUp") setSelected((s) => Math.max(s - 2, 0));
      else if (e.key === "Enter") {
        if (cameras[selected]) {
          setFullId(cameras[selected].id);
          setView("fullscreen");
        }
      } else if (e.key === "Escape" || e.key === "Backspace") {
        logout();
        setView("login");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view, cameras, selected]);

  // Fullscreen back
  useEffect(() => {
    if (view !== "fullscreen") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace") {
        setView("grid");
        setFullId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api<{ accessToken: string; user: any }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
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

  if (view === "fullscreen" && fullId) {
    const cam = cameras.find((c) => c.id === fullId);
    const src = `/streams/${fullId}/index.m3u8`;
    return (
      <div className="fullscreen">
        <HlsPlayer src={src} className="video-full" />
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
              setFullId(c.id);
              setView("fullscreen");
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
