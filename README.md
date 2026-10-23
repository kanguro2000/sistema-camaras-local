# Sistema de Cámaras Local — Tapo en TV

Visualización en vivo de cámaras TP-Link Tapo en TVs Hisense (Vidaa) y TCL (Android TV), mediante un servidor intermedio (gateway) + app web.

## Documentación

- `PROMPT.md` — prompt maestro del proyecto.
- `MEMORY.md` — memoria y decisiones (ADR).
- `AGENTS.md` — guía para agentes de código.
- `specs/` — especificaciones técnicas.
- `skills/` — skills para agentes.

## Inicio rápido (desarrollo)

```bash
pnpm install
pnpm secrets           # genera .env con secretos aleatorios; no los imprime
pnpm dev               # gateway + web
```

La contraseña inicial de `admin` se guarda en `.env`; consúltala solo en el equipo de confianza donde corre el gateway. No uses valores de ejemplo para `JWT_SECRET` o `MASTER_KEY`. Si `.env` ya existe, el generador se niega a sobrescribirlo.

## Acceso y cámaras

- En Ubuntu, entra a `http://<IP-LAN-DE-UBUNTU>:8080` desde un equipo de la misma red. La interfaz y la API del gateway comparten esa dirección; no hay una segunda pantalla ni un puerto público separado para el gateway.
- El usuario inicial es `admin`. En la carpeta del repositorio en Ubuntu puedes consultar la contraseña generada con `grep '^ADMIN_PASSWORD=' .env`; hazlo solo localmente y no compartas ni publiques ese valor. La contraseña se copia a la base de datos al crear por primera vez el usuario. Si la base ya tenía usuarios, cambiar `.env` no cambia sus contraseñas.
- Después de iniciar sesión, abre **Administrar cámaras** (o **Agregar la primera cámara** si la lista está vacía). Desde ahí se pueden agregar, editar, eliminar y probar cámaras.
- Para una Tapo, primero crea una **Cuenta de cámara** en la app Tapo: cámara → Configuración → Avanzado → Cuenta de cámara. En el formulario usa esa cuenta RTSP, no necesariamente el usuario y contraseña de la cuenta de Tapo. El canal HD usa `stream1`; SD usa `stream2`.
- En la TV abre el navegador e ingresa `http://<IP-LAN-DE-UBUNTU>:8080`. La TV debe estar en la misma red local; inicia sesión y selecciona una cámara. No abras directamente la IP de la cámara ni publiques el puerto 8080 en Internet.

## Despliegue en Ubuntu (Lenovo G480)

```bash
git clone <url-del-repositorio> sistema-camaras-local
cd sistema-camaras-local
bash deploy/ubuntu-setup.sh
```

El script instala Docker/Compose sin agregar el usuario al grupo `docker`, crea `.env` solo si no existe y levanta la app en `http://<IP-LAN>:8080`. El gateway y FFmpeg corren en contenedores; la interfaz web se sirve por Nginx y hace proxy a la API/streams. No se publica el puerto interno del gateway ni se requiere instalar Node.js o FFmpeg en Ubuntu.

Se requiere conectividad a Internet durante la primera construcción de las imágenes. No configures reenvío del puerto 8080 desde el router a Internet. Ver `deploy/TESTING.md` para la checklist posterior.

Despliegue manual: ver `specs/10-deployment-ops.md`.

## Diagnóstico de errores

Si hay problemas al probar la cámara o reproducir video, ejecuta desde la carpeta del repositorio en Ubuntu:

```bash
bash deploy/collect-diagnostics.sh
```

El informe reúne el estado de Docker, la respuesta de health y hasta la última hora de logs del gateway y la web. Se guarda en `~/.local/state/sistema-camaras-local/` con permisos privados; puedes ampliar el periodo, por ejemplo `bash deploy/collect-diagnostics.sh 6h`. El script redacta URLs RTSP, tokens, campos de credenciales y direcciones IPv4 antes de crear el archivo. Revísalo antes de compartirlo y no envíes `.env`, la base de datos ni credenciales.

## Estado

MVP local: gateway, API, autenticación, administración básica de cámaras y reproducción HLS.
