import React, { useEffect, useState } from "react";

type Camera = { id: string; name: string };

export default function App() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cameras")
      .then((r) => r.json())
      .then((d) => setCameras(d.items ?? []))
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div className="app">
      <h1>Sistema de Cámaras</h1>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {cameras.length === 0 && <p>No hay cámaras configuradas.</p>}
        {cameras.map((c) => (
          <div key={c.id} className="tile" tabIndex={0}>
            <span>{c.name}</span>
          </div>
        ))}
      </div>
      <p className="hint">Navegación por control remoto (D-pad).</p>
    </div>
  );
}
