---
name: tv-remote-navigation
description: Patrones para navegación por control remoto (D-pad) en apps web para TV (Hisense Vidaa, TCL Android). Usar al implementar o depurar UI navegable por mando.
---

# Skill: TV Remote Navigation

## Cuándo usar
- Implementar navegación por flechas en componentes.
- Depurar foco que se pierde en TV.
- Adaptar web app a control remoto.

## Principios
1. Todo elemento interactivo alcanzable por Tab/flechas.
2. Foco visible con anillo de alto contraste (≥ 3 px).
3. Enter/OK activa; Escape/Back vuelve.
4. No depender de hover.

## Patrones

### Grid navegable
- Usar `roving tabindex`: solo el item activo tiene tabIndex 0.
- Flechas mueven foco; Enter abre fullscreen.
- Mantener último foco al volver.

### Fullscreen
- Back/Escape cierra.
- Flechas opcionales para PTZ.
- Auto-hide de controles tras 3 s de inactividad.

### Key handling
```js
window.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight':
      // mover foco
      break;
    case 'Enter': // activar
      break;
    case 'Escape': case 'Backspace': // volver
      break;
  }
});
```

### Keycodes TV
- Hisense Vidaa y Android TV suelen emitir `Arrow*`, `Enter`, `Escape`/`Backspace`.
- Algunos controles emiten `MediaPlayPause`. Probar en TV real y documentar.

## Checklist
- [ ] Navegación completa sin mouse.
- [ ] Foco siempre visible.
- [ ] Back funciona en todas las vistas.
- [ ] Sin traps de foco.
- [ ] Probado en TV real o emulador.
