# Runbook técnico — Sistema de cámaras local

Guía de operación para el despliegue con Docker Compose en Ubuntu. Los comandos
asumen que estás en la raíz del repositorio, junto a `package.json`, `deploy/`
y `.env`. Sustituye `<IP-LAN>` por la dirección local del servidor.

## 1. Arquitectura y rutas importantes

```text
TV / navegador ── HTTP :8080 ──> web (Nginx) ──> gateway (Fastify :8080)
                                                    ├── SQLite
                                                    ├── FFmpeg / HLS local
                                                    └── cámaras por RTSP (LAN)
```

- `web`: sirve los archivos de la aplicación y hace proxy de `/api/` y
  `/streams/` al gateway. Es el único servicio que publica el puerto `8080`.
- `gateway`: API, autenticación, SQLite y procesos FFmpeg. No publica puertos
  directamente al host.
- Docker Compose: `deploy/docker-compose.yml`.
- Variables y secretos: `.env` en la raíz del repositorio. No es
  `deploy/.env`.
- Base de datos y archivos de stream: `data/` en la raíz del repositorio.
  El fichero por defecto es `data/app.db`; los segmentos temporales están en
  `data/streams/`.
- El gateway ejecuta Node.js 24 dentro de la imagen. No requiere Node.js ni
  FFmpeg instalados en el host Ubuntu.
- Las cámaras deben ser accesibles desde el host por la LAN. No se publica
  RTSP, HLS interno ni la API de MediaMTX en Internet.

## 2. Primer arranque en Ubuntu

Clona el repositorio y ejecuta el instalador desde cualquier directorio:

```bash
git clone <url-del-repositorio> sistema-camaras-local
cd sistema-camaras-local
bash deploy/ubuntu-setup.sh
```

El script instala Docker y Compose si hacen falta, habilita Docker, crea
`<raíz-del-repositorio>/.env` si no existe, prepara `data/`, construye las
imágenes e inicia los servicios. Al final consulta `http://localhost:8080/api/health`.

El generador se niega a sobrescribir un `.env` existente. Si se ejecuta
manualmente desde la raíz, genera el archivo allí:

```bash
pnpm secrets
```

Para el despliegue en Ubuntu, el instalador pasa explícitamente la ruta absoluta
`<raíz-del-repositorio>/.env` a `deploy/generate-secrets.sh`, por lo que la
ubicación no depende del directorio desde el que se llamó a `ubuntu-setup.sh`.
Si el `.env` no existe, no copies los valores vacíos de `.env.example`: ejecuta
el instalador o genera secretos reales.

La contraseña inicial se guarda en `.env` como `ADMIN_PASSWORD`. Para verla en
el servidor de confianza, sin copiarla a tickets, chats ni logs:

```bash
grep '^ADMIN_PASSWORD=' .env
```

El usuario inicial se crea en la base de datos al primer arranque. Cambiar
`ADMIN_PASSWORD` después no reemplaza la contraseña de un usuario ya creado.

Comprueba la instalación:

```bash
sudo docker compose -f deploy/docker-compose.yml ps
curl --fail --silent --show-error http://localhost:8080/api/health
```

Abre `http://<IP-LAN>:8080` desde un equipo o TV conectada a la misma red. No
configures port forwarding del router para publicar este puerto.

## 3. Operación diaria

Ejecuta desde la raíz del repositorio. Si Docker requiere permisos, conserva el
prefijo `sudo` usado por los comandos de despliegue.

### Estado y health

```bash
sudo docker compose -f deploy/docker-compose.yml ps
curl --fail --silent --show-error http://localhost:8080/api/health
```

Una respuesta HTTP `200` con JSON que contiene `"status":"ok"` confirma que la
ruta de health del gateway responde a través del proxy web. No verifica por sí
sola la conexión con cada cámara; revisa el estado por cámara desde la app.

### Logs

```bash
sudo docker compose -f deploy/docker-compose.yml logs --tail=100 gateway web
sudo docker compose -f deploy/docker-compose.yml logs --follow gateway
sudo docker compose -f deploy/docker-compose.yml logs --follow web
```

Pulsa `Ctrl+C` para salir del seguimiento. Docker limita los logs a 10 MB y
conserva hasta tres ficheros por servicio.

### Reiniciar

Reiniciar ambos servicios:

```bash
sudo docker compose -f deploy/docker-compose.yml restart
```

Reiniciar solo un servicio:

```bash
sudo docker compose -f deploy/docker-compose.yml restart gateway
sudo docker compose -f deploy/docker-compose.yml restart web
```

El reinicio del gateway detiene los procesos FFmpeg activos; las cámaras
solicitadas por la interfaz vuelven a iniciar sus streams al reconectarse.

### Detener e iniciar

```bash
sudo docker compose -f deploy/docker-compose.yml stop
sudo docker compose -f deploy/docker-compose.yml start
```

Para retirar los contenedores sin borrar `data/`:

```bash
sudo docker compose -f deploy/docker-compose.yml down
sudo docker compose -f deploy/docker-compose.yml up -d
```

No uses `down --volumes` como rutina de reinicio. Antes de eliminar, mover o
recrear `data/`, realiza y verifica un respaldo.

## 4. Actualizar la aplicación

Haz respaldo antes de cambiar de versión. Después actualiza el código e
reconstruye las imágenes:

```bash
git status --short
git pull --ff-only
sudo docker compose -f deploy/docker-compose.yml up -d --build
sudo docker compose -f deploy/docker-compose.yml ps
curl --fail --silent --show-error http://localhost:8080/api/health
```

Si el pull falla por cambios locales, no los sobrescribas a ciegas: revisa el
estado con `git status --short` y conserva primero los cambios necesarios.

Las migraciones de SQLite se aplican al iniciar el gateway. No retrocedas la
imagen/código sin comprobar compatibilidad con el esquema de la base de datos.

## 5. Respaldo y restauración

La base contiene configuración de usuarios y cámaras. Las contraseñas RTSP se
guardan cifradas; **el respaldo de la base solo sirve si también conservas el
mismo `MASTER_KEY` del `.env`**. Resguarda ese archivo de forma cifrada y con
acceso restringido. Si pierdes o cambias la clave, el gateway no podrá descifrar
las credenciales ya guardadas.

### Crear un respaldo consistente

Detén el gateway para que SQLite cierre la base antes de copiarla. Nginx puede
permanecer disponible durante esta operación, pero la API no responderá hasta
iniciar el gateway de nuevo.

```bash
BACKUP_DIR="$HOME/sistema-camaras-backup-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 700 "$BACKUP_DIR"
sudo docker compose -f deploy/docker-compose.yml stop gateway
cp data/app.db "$BACKUP_DIR/app.db"
sudo docker compose -f deploy/docker-compose.yml start gateway
```

Guarda una copia cifrada de `.env` fuera del repositorio y con permisos
restrictivos. No incluyas `.env` en un archivo de respaldo sin cifrar ni lo
copies a ubicaciones compartidas. Los segmentos HLS de `data/streams/` son
temporales y se regeneran; normalmente no necesitan respaldo.

Comprueba que el fichero existe y no está vacío:

```bash
test -s "$BACKUP_DIR/app.db" && echo "Respaldo SQLite creado"
```

### Restaurar un respaldo

Detén todos los servicios, conserva la base actual por si hay que volver atrás,
restaura el archivo y arranca de nuevo:

```bash
sudo docker compose -f deploy/docker-compose.yml stop
cp data/app.db "data/app.db.pre-restore-$(date -u +%Y%m%dT%H%M%SZ)"
cp "$HOME/ruta-segura/app.db" data/app.db
sudo docker compose -f deploy/docker-compose.yml up -d
curl --fail --silent --show-error http://localhost:8080/api/health
```

Restaura también el `.env` correspondiente al respaldo si la instalación fue
reconstruida, asegurándote de que contiene el mismo `MASTER_KEY`. No reemplaces
el archivo de secretos actual sin verificarlo.

## 6. Problemas comunes

| Síntoma                                           | Comprobaciones y acciones                                                                                                                                                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docker compose` no existe                        | Comprueba `sudo docker compose version` y `sudo docker-compose version`. Ejecuta el instalador o instala el plugin Compose para tu distribución.                                                                                           |
| Docker no responde o permiso denegado             | Comprueba `sudo systemctl status docker` y `sudo docker info`. El despliegue documentado usa `sudo`; no añadas usuarios al grupo `docker` sin evaluar que equivale a privilegios elevados.                                                 |
| La app no abre en la LAN                          | Ejecuta health local y `docker compose ps`; comprueba que el puerto 8080 está publicado con `sudo docker compose -f deploy/docker-compose.yml ps` y que firewall/router permiten el tráfico LAN. No publiques el puerto a Internet.        |
| Health responde con error o no conecta            | Revisa `docker compose logs --tail=100 gateway web`. Confirma que ambos contenedores están `Up`; reconstruye con `up -d --build` si la imagen está desactualizada.                                                                         |
| No inicia el gateway                              | Revisa logs, permisos de `data/`, y que `.env` está en la raíz. Confirma que `JWT_SECRET` tiene al menos 32 caracteres y `MASTER_KEY` representa 32 bytes en hexadecimal (64 dígitos) o Base64. No publiques el contenido del archivo.     |
| La aplicación pide iniciar sesión tras reiniciar  | Verifica que `data/app.db` permanece en el host y que se montó `../data` en el gateway. No elimines el volumen/carpeta de datos.                                                                                                           |
| No se puede descifrar la contraseña de una cámara | El `MASTER_KEY` actual no corresponde al usado al cifrarla. Restaura el `.env`/clave correcto desde respaldo seguro; no generes una clave nueva sobre una base existente.                                                                  |
| “No se pudo conectar” al probar una cámara        | Confirma que la cámara tiene **Cuenta de cámara** habilitada en la app Tapo, usuario/contraseña RTSP correctos, IP reservada en DHCP y conectividad desde el host a la misma LAN. No uses las credenciales de la cuenta cloud por defecto. |
| Probe funciona pero el video no aparece           | Revisa health del stream en la UI y logs del gateway. Confirma que FFmpeg está en la imagen (`docker compose exec gateway ffmpeg -version`), vuelve a probar y permite que se genere el primer segmento HLS.                               |
| Stream queda en “Conectando” o “Error”            | Revisa `docker compose logs --since=10m gateway`; confirma conectividad RTSP y disponibilidad de disco en `data/`. Usa el botón de reintento de la tarjeta. El gateway reinicia FFmpeg con backoff cuando falla.                           |
| Reproducción falla solo en una TV                 | Prueba primero en un navegador moderno de la misma LAN, reinicia el navegador/TV y vuelve a abrir el stream. Verifica compatibilidad H.264 y el canal HD/SD; los navegadores integrados pueden variar por modelo/firmware.                 |
| El servidor se queda sin recursos                 | Revisa `free -h`, `df -h` y carga de CPU. Reduce cámaras simultáneas o selecciona canal SD; el gateway reempaqueta video cuando es posible, pero el audio puede requerir conversión.                                                       |
| `git pull` no puede avanzar                       | Inspecciona `git status --short`; guarda los cambios locales antes de actualizar. Evita `reset --hard` o borrar archivos para forzar el despliegue.                                                                                        |

## 7. Recopilar diagnóstico de forma segura

Desde la raíz del repositorio:

```bash
bash deploy/collect-diagnostics.sh
bash deploy/collect-diagnostics.sh 6h
```

El argumento acepta duraciones como `30m`, `2h` o `1d`. El informe se guarda en
`~/.local/state/sistema-camaras-local/` (o bajo `$XDG_STATE_HOME`), en un
directorio con permisos `700` y archivo con permisos `600`. Incluye versión y
estado de Docker, health y logs recientes de `gateway` y `web`; no adjunta `.env`
ni la base de datos.

El script intenta redactar URLs RTSP, tokens, campos de credenciales y
direcciones IPv4. **Revísalo antes de compartirlo** y elimina cualquier dato
privado restante. Nunca envíes `.env`, `app.db`, claves, contraseñas ni capturas
que los muestren.

## 8. Desarrollo local

En un equipo de desarrollo con Node.js 24 o superior y pnpm:

```bash
pnpm install
pnpm secrets
pnpm dev
```

`pnpm dev` inicia el gateway en modo watch y Vite. El frontend de desarrollo
usa el proxy API hacia `http://localhost:8080`; por ello, para flujos completos
el gateway debe estar ejecutándose también en ese puerto. El despliegue Docker
publica el proxy web en `8080` y no debe levantarse simultáneamente en el mismo
host/puerto que otro servicio.

Comandos útiles antes de integrar cambios:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Los E2E usan respuestas simuladas del gateway; no prueban cámaras ni TVs
físicas. Para checklist de despliegue y validación manual, consulta
[`deploy/TESTING.md`](../deploy/TESTING.md).
