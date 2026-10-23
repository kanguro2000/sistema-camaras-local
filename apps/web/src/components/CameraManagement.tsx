import { type FormEvent, useEffect, useState } from "react";
import type { CameraProbeResult } from "@sistema-camaras/shared";
import type { AppService } from "../application/services/app-service.js";
import type { Camera, CameraCreateInput, CameraUpdateInput } from "../domain/entities/camera.js";

interface CameraManagementProps {
  cameras: Camera[];
  service: AppService;
  onCamerasChanged: () => Promise<void>;
  onBack: () => void;
}

interface CameraForm {
  name: string;
  ip: string;
  model: string;
  username: string;
  password: string;
  channel: "hd" | "sd";
  enabled: boolean;
}

const EMPTY_FORM: CameraForm = {
  name: "",
  ip: "",
  model: "",
  username: "",
  password: "",
  channel: "hd",
  enabled: true,
};

function describeProbe(result: CameraProbeResult): string {
  if (!result.ok) return `No se pudo conectar: ${result.error || "revisa la IP y el Camera Account."}`;
  const details = [
    result.codecVideo?.toUpperCase(),
    result.codecAudio ? `audio ${result.codecAudio.toUpperCase()}` : undefined,
    result.width && result.height ? `${result.width}×${result.height}` : undefined,
  ].filter(Boolean);
  return `Conexión RTSP correcta${details.length ? `: ${details.join(" · ")}` : ""}.`;
}

export default function CameraManagement({
  cameras,
  service,
  onCamerasChanged,
  onBack,
}: CameraManagementProps) {
  const [form, setForm] = useState<CameraForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Camera | null>(null);
  const [probingId, setProbingId] = useState<string | null>(null);
  const [probeResult, setProbeResult] = useState<{ id: string; result: CameraProbeResult } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLInputElement && event.target.type !== "checkbox";
      if (event.key === "Escape" || (event.key === "Backspace" && !typing)) {
        event.preventDefault();
        if (pendingDelete) setPendingDelete(null);
        else if (formOpen) setFormOpen(false);
        else onBack();
        return;
      }
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      const controls = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".camera-management button:not(:disabled), .camera-management input:not(:disabled)",
        ),
      );
      const currentIndex = controls.findIndex((control) => control === document.activeElement);
      if (currentIndex < 0 || controls.length === 0) return;
      event.preventDefault();
      const offset = event.key === "ArrowDown" ? 1 : -1;
      controls[(currentIndex + offset + controls.length) % controls.length]?.focus();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [formOpen, onBack, pendingDelete]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
    setError(null);
    setNotice(null);
  };

  const openEditForm = (camera: Camera) => {
    setEditingId(camera.id);
    setForm({
      name: camera.name,
      ip: camera.ip,
      model: camera.model ?? "",
      username: "",
      password: "",
      channel: camera.channel,
      enabled: camera.enabled,
    });
    setFormOpen(true);
    setError(null);
    setNotice(null);
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    const username = form.username.trim();
    const password = form.password;
    if (editingId && Boolean(username) !== Boolean(password)) {
      setError("Para cambiar el Camera Account, completa tanto el usuario como la contraseña.");
      setBusy(false);
      return;
    }

    const common = {
      name: form.name.trim(),
      ip: form.ip.trim(),
      model: form.model.trim(),
      channel: form.channel,
      enabled: form.enabled,
    };

    try {
      if (editingId) {
        const input: CameraUpdateInput = {
          ...common,
          ...(username && password ? { username, password } : {}),
        };
        await service.updateCamera(editingId, input);
        setNotice("Configuración de la cámara actualizada.");
      } else {
        const input: CameraCreateInput = {
          ...common,
          model: common.model || undefined,
          username,
          password,
        };
        await service.createCamera(input);
        setNotice("Cámara agregada. Usa «Probar conexión» para validar el acceso RTSP.");
      }
      setFormOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await onCamerasChanged();
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  };

  const deleteCamera = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await service.deleteCamera(pendingDelete.id);
      setNotice(`Se eliminó «${pendingDelete.name}».`);
      setPendingDelete(null);
      await onCamerasChanged();
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  };

  const probeCamera = async (camera: Camera) => {
    setProbingId(camera.id);
    setProbeResult(null);
    setError(null);
    try {
      const result = await service.probeCamera(camera.id);
      setProbeResult({ id: camera.id, result });
    } catch (cause) {
      setError(String(cause));
    } finally {
      setProbingId(null);
    }
  };

  return (
    <main className="camera-management">
      <header className="management-header">
        <div>
          <h1>Administrar cámaras</h1>
          <p>Agrega o actualiza cámaras conectadas a la red local.</p>
        </div>
        <button type="button" onClick={onBack} autoFocus>Volver a la vista de cámaras</button>
      </header>

      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}

      <section aria-labelledby="registered-cameras-title">
        <div className="section-heading">
          <h2 id="registered-cameras-title">Cámaras registradas ({cameras.length})</h2>
          <button type="button" onClick={openCreateForm}>Agregar cámara</button>
        </div>
        {cameras.length === 0 ? (
          <p>Aún no hay cámaras. Selecciona «Agregar cámara» para registrar la primera.</p>
        ) : (
          <ul className="camera-list">
            {cameras.map((camera) => (
              <li className="camera-card" key={camera.id}>
                <div className="camera-summary">
                  <h3>{camera.name}</h3>
                  <p>{camera.ip}{camera.model ? ` · ${camera.model}` : ""}</p>
                  <p>{camera.channel.toUpperCase()} · {camera.enabled ? "Habilitada" : "Deshabilitada"}</p>
                  {probeResult?.id === camera.id && (
                    <p className={probeResult.result.ok ? "notice" : "error"} role="status">
                      {describeProbe(probeResult.result)}
                    </p>
                  )}
                </div>
                <div className="camera-actions">
                  <button type="button" onClick={() => void probeCamera(camera)} disabled={probingId === camera.id}>
                    {probingId === camera.id ? "Probando…" : "Probar conexión"}
                  </button>
                  <button type="button" onClick={() => openEditForm(camera)}>Editar</button>
                  <button type="button" className="danger-button" onClick={() => setPendingDelete(camera)}>
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {formOpen && (
        <section className="camera-form-section" aria-labelledby="camera-form-title">
          <h2 id="camera-form-title">{editingId ? "Editar cámara" : "Agregar cámara"}</h2>
          <p>
            Usa la cuenta RTSP creada en la app Tapo: Configuración de la cámara → Avanzado →
            Cuenta de cámara. No es necesariamente la cuenta de inicio de sesión de Tapo.
          </p>
          <form className="camera-form" onSubmit={(event) => void submitForm(event)}>
            <label>
              Nombre
              <input
                required
                maxLength={64}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label>
              Dirección IP local
              <input
                required
                autoComplete="off"
                placeholder="192.168.1.50"
                value={form.ip}
                onChange={(event) => setForm({ ...form, ip: event.target.value })}
              />
            </label>
            <label>
              Modelo (opcional)
              <input
                value={form.model}
                onChange={(event) => setForm({ ...form, model: event.target.value })}
              />
            </label>
            <label>
              Usuario de la cuenta de cámara
              <input
                autoComplete="off"
                required={!editingId}
                value={form.username}
                placeholder={editingId ? "Dejar vacío para conservar" : ""}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
              />
            </label>
            <label>
              Contraseña de la cuenta de cámara
              <input
                type="password"
                autoComplete="new-password"
                required={!editingId}
                value={form.password}
                placeholder={editingId ? "Dejar vacía para conservar" : ""}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </label>
            <fieldset className="channel-options">
              <legend>Calidad del stream</legend>
              <button
                type="button"
                aria-pressed={form.channel === "hd"}
                onClick={() => setForm({ ...form, channel: "hd" })}
              >
                HD (stream1)
              </button>
              <button
                type="button"
                aria-pressed={form.channel === "sd"}
                onClick={() => setForm({ ...form, channel: "sd" })}
              >
                SD (stream2)
              </button>
            </fieldset>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
              />
              Habilitada
            </label>
            <div className="form-actions">
              <button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar cámara"}</button>
              <button type="button" onClick={() => setFormOpen(false)} disabled={busy}>Cancelar</button>
            </div>
          </form>
        </section>
      )}

      {pendingDelete && (
        <section className="delete-confirmation" role="alertdialog" aria-modal="true" aria-labelledby="delete-camera-title">
          <h2 id="delete-camera-title">¿Eliminar «{pendingDelete.name}»?</h2>
          <p>Se borrará su configuración y se detendrá su stream. Esta acción no se puede deshacer.</p>
          <div className="form-actions">
            <button type="button" onClick={() => setPendingDelete(null)} disabled={busy} autoFocus>Cancelar</button>
            <button type="button" className="danger-button" onClick={() => void deleteCamera()} disabled={busy}>
              {busy ? "Eliminando…" : "Sí, eliminar"}
            </button>
          </div>
        </section>
      )}

      <p className="hint">Control remoto: usa las flechas para moverte, OK/Enter para elegir y Atrás/Esc para volver.</p>
    </main>
  );
}
