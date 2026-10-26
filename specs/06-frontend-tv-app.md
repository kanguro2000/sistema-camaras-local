# Spec 06 — Frontend TV App

## 1. Vistas

- **Home / Grid**: videowall de hasta cuatro cámaras en vivo (2x2); si hay más, se navega por páginas de cuatro. Cada tile muestra video HLS + nombre + estado real del stream.
- **Fullscreen**: una cámara a pantalla completa con overlay de controles.
- **Administrar cámaras** (admin): agregar, editar, eliminar y probar conexión RTSP de cámaras.
- El acceso a administración aparece en la vista principal al iniciar sesión como admin; no existe una vista separada del gateway.
- **PTZ Panel**: controles direccionales (solo modelos PTZ).

## 2. Navegación por control remoto

- Flechas: mover foco.
- OK/Enter: seleccionar/abrir.
- Back/Escape: volver.
- En la vista principal, los controles de administración y las cámaras se pueden recorrer con el D-pad; Enter/OK activa el control enfocado.
- El foco se mueve según la posición visual del control más cercano; no salta en ciclo al llegar al borde de una vista.
- Las cámaras deshabilitadas no reciben foco. Al volver desde administración o pantalla completa, se recupera el foco de la cámara seleccionada.
- Atrás/Escape en el grid no cierra sesión; cerrar sesión requiere activar su botón. Al cerrar formularios, el foco regresa al control que los abrió.
- El diálogo de eliminación contiene la navegación del mando y Tab; al cancelarlo, devuelve el foco al botón que lo abrió.
- Las flechas conservan su comportamiento nativo en campos de texto y controles de selección.
- Teclas de color (si existen): atajos (rojo = grid, verde = fullscreen, etc.) opcional.
- Foco visible con anillo de alto contraste.
- Sin dependencia de mouse.

## 3. Reproductor

- Usar hls.js con config de baja latencia: `liveSyncDuration: 1`, `liveMaxLatencyDuration: 3`.
- Fallback a `<video>` nativo si hls.js no soportado.
- Autoplay muted por defecto (política de TV); botón para activar audio.
- Manejo de errores: mostrar estado visible y botón "Reintentar" tanto en tiles como en pantalla completa; los errores de reproducción de HLS y del fallback nativo deben ser recuperables.

## 4. Estado

- Zustand stores: cameras, streams, settings, auth.
- Polling de health cada 10 s.
- Reintentar stream en error con backoff.

## 5. Rendimiento en TV

- Limitar streams simultáneos visibles (max 4 en grid 2x2 para CPU de TV).
- El estado del tile distingue cámara deshabilitada, stream conectando, video en carga, en vivo, detenido y error de stream/reproducción; no indicar "en vivo" hasta que el video emita `playing`.
- Consultar `/api/cameras/:id/health` cada 10 s solo para la página visible.
- Al cambiar de página se desmontan los reproductores anteriores; el gateway detiene sus procesos al vencer el período de inactividad de 30 s sin solicitudes de segmentos.
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
