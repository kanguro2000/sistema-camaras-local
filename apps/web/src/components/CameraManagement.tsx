import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CameraProbeResult } from "@sistema-camaras/shared";
import type { AppService } from "../application/services/app-service.js";
import type { Camera, CameraCreateInput, CameraUpdateInput } from "../domain/entities/camera.js";
import { getSpatialDirection, isRemoteBackKey, navigateSpatially } from "../lib/spatial-navigation.js";

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
  const formReturnFocus = useRef<HTMLElement | null>(null);
  const formInitialFocus = useRef<HTMLInputElement | null>(null);
  const deleteReturnFocus = useRef<HTMLButtonElement | null>(null);
  const deleteDialogRef = useRef<HTMLElement | null>(null);
  const deleteDialogWasOpen = useRef(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target;
      const typing = (target instanceof HTMLInputElement
        && !["checkbox", "radio", "button", "submit", "reset"].includes(target.type))
        || target instanceof HTMLTextAreaElement
        || (target instanceof HTMLElement && target.isContentEditable);
      if (isRemoteBackKey(event) && (event.key !== "Backspace" || !typing)) {
        event.preventDefault();
        if (pendingDelete) setPendingDelete(null);
        else if (formOpen) setFormOpen(false);
        else onBack();
        return;
      }
      const direction = getSpatialDirection(event);
      if (!direction) return;
      const container = pendingDelete
        ? deleteDialogRef.current
        : document.querySelector<HTMLElement>(".camera-management");
      if (container && navigateSpatially(container, direction)) event.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [formOpen, onBack, pendingDelete]);

  useLayoutEffect(() => {
    if (pendingDelete) {
      deleteDialogWasOpen.current = true;
      const dialog = deleteDialogRef.current;
      if (!dialog) return;
      const focusDialog = () => {
        const firstButton = dialog.querySelector<HTMLButtonElement>("button:not(:disabled)");
        (firstButton ?? dialog).focus();
      };
      focusDialog();

      const handleFocusIn = (event: FocusEvent) => {
        if (event.target instanceof Node && !dialog.contains(event.target)) {
          focusDialog();
        }
      };
      const handleTab = (event: KeyboardEvent) => {
        if (event.key !== "Tab") return;
        const buttons = Array.from(
          dialog.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
        );
        if (buttons.length === 0) {
          event.preventDefault();
          dialog.focus();
          return;
        }
        const firstButton = buttons[0];
        const lastButton = buttons[buttons.length - 1];
        if (
          (event.shiftKey && document.activeElement === firstButton)
          || (!event.shiftKey && document.activeElement === lastButton)
        ) {
          event.preventDefault();
          (event.shiftKey ? lastButton : firstButton)?.focus();
        }
      };
      document.addEventListener("focusin", handleFocusIn);
      document.addEventListener("keydown", handleTab);
      return () => {
        document.removeEventListener("focusin", handleFocusIn);
        document.removeEventListener("keydown", handleTab);
      };
    }

    if (!deleteDialogWasOpen.current) return;
    deleteDialogWasOpen.current = false;
    if (deleteReturnFocus.current?.isConnected) {
      deleteReturnFocus.current.focus();
    } else {
      document.querySelector<HTMLButtonElement>(
        ".camera-management .section-heading button:not(:disabled)",
      )?.focus();
    }
    deleteReturnFocus.current = null;
  }, [pendingDelete]);

  useLayoutEffect(() => {
    if (formOpen) {
      formInitialFocus.current?.focus();
      return;
    }
    if (formReturnFocus.current?.isConnected) formReturnFocus.current.focus();
    formReturnFocus.current = null;
  }, [formOpen]);

  const openCreateForm = () => {
    formReturnFocus.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
    setError(null);
    setNotice(null);
  };

  const openEditForm = (camera: Camera) => {
    formReturnFocus.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
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
      deleteReturnFocus.current = null;
      setPendingDelete(null);
      await onCamerasChanged();
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  };

  const openDeleteConfirmation = (camera: Camera, trigger: HTMLButtonElement) => {
    deleteReturnFocus.current = trigger;
    deleteDialogWasOpen.current = true;
    setPendingDelete(camera);
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
                  <button
                    type="button"
                    className="danger-button"
                    onClick={(event) => openDeleteConfirmation(camera, event.currentTarget)}
                  >
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
                ref={formInitialFocus}
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
        <section
          ref={deleteDialogRef}
          className="delete-confirmation"
          role="alertdialog"
          aria-modal="true"
          tabIndex={-1}
          aria-labelledby="delete-camera-title"
          aria-describedby="delete-camera-description"
        >
          <h2 id="delete-camera-title">¿Eliminar «{pendingDelete.name}»?</h2>
          <p id="delete-camera-description">
            Se borrará su configuración y se detendrá su stream. Esta acción no se puede deshacer.
          </p>
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
