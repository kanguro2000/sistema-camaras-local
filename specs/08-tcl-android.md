# Spec 08 — TCL Android TV

## 1. Plataforma

- Android TV (Leanback). Dos opciones:
  a) **WebView wrapper**: APK con WebView que carga la web app.
  b) **Nativo**: app Kotlin con ExoPlayer (HLS) + UI Compose for TV.

Recomendación MVP: opción (a) para reutilizar codebase web; opción (b) si se requiere mejor rendimiento/controles.

## 2. Empaquetado (WebView)

- Android Studio project, minSdk 24, targetSdk actual.
- WebView con JavaScript habilitado, DOM storage.
- Manejo de control remoto vía key events (D-pad).
- Pantalla completa, sin barra de estado.

## 3. Reproducción

- ExoPlayer (media3) soporta HLS de forma nativa y robusta → preferible para v1.
- Si se usa WebView, hls.js funciona en Chromium moderno de Android.

## 4. Distribución

- Sideload APK (USB/ADB) para uso personal.
- Google Play (Android TV) si se publica.

## 5. Consideraciones

- Permisos de red (INTERNET) en manifest.
- Cleartext traffic permitido solo para LAN (network_security_config).
- Audio focus: pausar otros apps.

## 6. Testing

- Emulador Android TV + dispositivo real TCL.
- Verificar D-pad, back, audio, reconexión.
