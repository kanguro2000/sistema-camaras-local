# Spec 06 — Frontend TV App

## 1. Vistas

- **Home / Grid**: grid de cámaras (1, 2x2, 3x3, 4x4). Cada tile muestra video + nombre + estado.
- **Fullscreen**: una cámara a pantalla completa con overlay de controles.
- **Administrar cámaras** (admin): agregar, editar, eliminar y probar conexión RTSP de cámaras.
- El acceso a administración aparece en la vista principal al iniciar sesión como admin; no existe una vista separada del gateway.
- **PTZ Panel**: controles direccionales (solo modelos PTZ).

## 2. Navegación por control remoto

- Flechas: mover foco.
- OK/Enter: seleccionar/abrir.
- Back/Escape: volver.
- En la vista principal, los controles de administración y las cámaras se pueden recorrer con el D-pad; Enter/OK activa el control enfocado.
- Teclas de color (si existen): atajos (rojo = grid, verde = fullscreen, etc.) opcional.
- Foco visible con anillo de alto contraste.
- Sin dependencia de mouse.

## 3. Reproductor

- Usar hls.js con config de baja latencia: `liveSyncDuration: 1`, `liveMaxLatencyDuration: 3`.
- Fallback a `<video>` nativo si hls.js no soportado.
- Autoplay muted por defecto (política de TV); botón para activar audio.
- Manejo de errores: mostrar estado y botón "Reintentar".

## 4. Estado

- Zustand stores: cameras, streams, settings, auth.
- Polling de health cada 10 s.
- Reintentar stream en error con backoff.

## 5. Rendimiento en TV

- Limitar streams simultáneos visibles (max 4 en grid 2x2 para CPU de TV).
- Lazy load de tiles fuera de viewport.
- Evitar animaciones pesadas.
- Bundle target ES2019, sin polyfills innecesarios.

## 6. Accesibilidad

- Contraste alto, texto ≥ 18 px.
- Foco visible.
- ARIA labels en controles.
- Soporte de subtítulos/leyendas (futuro).

## 7. PWA

- Manifest + service worker para instalación en navegador TV.
- Offline: mostrar última config cacheada.
