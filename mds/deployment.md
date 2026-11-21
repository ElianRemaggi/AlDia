# Deployment

> **Decisión (2026-11-20):** todo PriceHub (frontend, API, document processor, PostgreSQL y Redis) se despliega con **Docker en un VPS o servidor propio**. No se usa Railway, Vercel ni Cloud Run.
>
> **Estado (2026-11-21):** imágenes, `docker-compose.prod.yml`, proxy con HTTPS, migraciones automáticas, alta de admin y backups implementados y probados en un stack local (HTTP). Falta: el servidor real, CI/CD, monitoreo.

## Arquitectura

```
                    Internet (HTTPS :443)
                            │
┌───────────────────────────┼──────────────────────────────┐
│  Servidor  (docker compose -f docker-compose.prod.yml)    │
│                   ┌───────▼───────┐                       │
│                   │     Caddy     │  TLS automático (LE)  │
│                   └───┬───────┬───┘                       │
│          /api/*       │       │  todo lo demás            │
│                       ▼       ▼                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Express API  │  │   Next.js    │  │ Python processor │ │
│  │    :4000     │  │ (standalone) │  │  (BullMQ worker) │ │
│  └──┬────────┬──┘  │    :3000     │  └───┬─────────┬────┘ │
│     │        │     └──────────────┘      │         │      │
│     │   ┌────▼─────────────────────────────▼┐      │      │
│     │   │ Redis 7 (AOF) — cola BullMQ       │      │      │
│     │   └───────────────────────────────────┘      │      │
│  ┌──▼──────────────┐   ┌─────────────────────────────▼──┐ │
│  │ PostgreSQL 15   │   │ volumen `uploads` (rw API,     │ │
│  │ volumen pgdata  │   │ ro processor) — o GCS          │ │
│  └─────────────────┘   └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

- Solo Caddy publica puertos (80/443). El resto queda en la red interna de Docker.
- El browser llama siempre a `/api/v1` en el **mismo origen**: Caddy manda `/api/*` a la API y el resto a Next. La cookie de refresh (`sameSite: strict`, `path: /api/v1/auth/refresh`) depende de esto; no hay CORS.
- Archivos subidos: si `GCS_BUCKET_NAME` está vacío, la API los guarda en el volumen `uploads` (`/data/uploads`) y le pasa la ruta absoluta al processor, que monta el mismo volumen en solo lectura.

## Archivos

| Archivo | Qué es |
|---|---|
| `apps/api/Dockerfile` | Multi-stage pnpm: `tsc` + `pnpm deploy --prod`. Al arrancar corre `dist/shared/database/migrate.js` y después `dist/server.js`. Usuario `node`. Healthcheck `GET /api/v1/health` (503 si la DB no responde) |
| `apps/web/Dockerfile` | Next `output: "standalone"`; server en `apps/web/server.js`, con `.next/static` y `public/` copiados al lado |
| `services/document-processor/Dockerfile` | Python 3.12 + poppler + tesseract (spa) para el OCR de PDFs escaneados. Corre `python -m worker.bullmq_worker` |
| `docker-compose.prod.yml` | proxy, web, api, processor, postgres, redis. `restart: unless-stopped`, healthchecks, rotación de logs (10MB × 5) |
| `deploy/Caddyfile` | Routing `/api/*` → api, resto → web; body máx. 25MB (la API corta en 20MB con 413) |
| `deploy/prod.env.example` | Plantilla de `.env.prod` |
| `deploy/backup.sh` | `pg_dump` + tar del volumen de uploads, con retención |
| `.dockerignore` | Contexto de build de api/web (raíz del repo) |

## Primer deploy

Requisitos en el servidor: Docker Engine + plugin compose, puertos 80 y 443 abiertos, y un registro DNS A/AAAA del dominio apuntando al servidor (Caddy saca el certificado solo).

```bash
git clone <repo> /srv/pricehub && cd /srv/pricehub
cp deploy/prod.env.example .env.prod
# Completar: DOMAIN, POSTGRES_PASSWORD y JWT_SECRET (openssl rand -hex 32), LLM_API_KEY (opcional)
chmod 600 .env.prod

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.prod ps     # todo "healthy"

# Admin inicial (idempotente: si ya existe, le resetea la contraseña). Mínimo 10 caracteres.
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm \
  -e ADMIN_EMAIL=vos@tudominio.com -e ADMIN_PASSWORD='...' api node dist/shared/database/create-admin.js
```

Después, desde `/admin`: crear el comercio y su usuario. **No** correr `pnpm seed` en producción (crea usuarios demo con contraseñas conocidas).

Para no tipear el comando entero: `alias dc='docker compose -f docker-compose.prod.yml --env-file .env.prod'`.

### Sin dominio (prueba en LAN)

`DOMAIN=:80` y `COOKIE_SECURE=false` en `.env.prod`: Caddy sirve HTTP plano y la cookie de refresh se manda sin `Secure` (si no, el browser no la guarda y la sesión se pierde al recargar). No usar así en Internet.

Si 80/443 ya están ocupados en el host, cambiar `HTTP_PORT` / `HTTPS_PORT` (con dominio real Let's Encrypt necesita 80 y 443 públicos).

## Actualizar

```bash
cd /srv/pricehub && git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Las migraciones nuevas se aplican solas al arrancar la API (si una falla, el container no arranca y el anterior ya fue reemplazado: mirar `logs api`). Antes de un update con migraciones, correr un backup.

## Logs y estado

```bash
dc ps
dc logs -f api            # también: web, processor, proxy
curl https://DOMINIO/api/v1/health    # {"status":"ok","database":"ok",...}
```

## Backups

```bash
deploy/backup.sh          # deja deploy/backups/db-<fecha>.dump y uploads-<fecha>.tar.gz (gitignored)
# cron diario, retención KEEP_DAYS (default 14):
30 3 * * * cd /srv/pricehub && deploy/backup.sh >> deploy/backups/backup.log 2>&1
```

Copiar `deploy/backups/` fuera del servidor (rsync/rclone): un backup en el mismo disco no sobrevive a perder el servidor.

Restaurar (el `pg_restore` de un dump de `backup.sh` está probado; el de uploads, no):

```bash
dc stop api processor
dc exec -T postgres dropdb -U pricehub pricehub
dc exec -T postgres createdb -U pricehub pricehub
dc exec -T postgres pg_restore -U pricehub -d pricehub --no-owner < deploy/backups/db-XXXX.dump
dc run --rm --no-deps api tar -C /data -xzf - < deploy/backups/uploads-XXXX.tar.gz   # si no se usa GCS
dc start api processor
```

## Seguridad

- `.env.prod` fuera de git (`.gitignore`), permisos 600.
- La API no arranca en producción si `JWT_SECRET` tiene menos de 32 caracteres.
- `trust proxy` activo (un solo proxy delante); la cookie de refresh es `Secure` en producción.
- PostgreSQL y Redis sin puertos publicados.
- Caddy oculta el header `Server` y agrega HSTS.

## Pendiente

- CI/CD: lint + tests en cada push; build de imágenes a un registry (GHCR) y deploy por SSH (`pull` + `up -d`).
- Staging (el mismo compose con otro `DOMAIN` y otro `-p` de proyecto).
- Monitoring: uptime externo contra `/api/v1/health`, Sentry, Redis en el health check.
- Rate limiting en `/auth/login` (`express-rate-limit` ya es dependencia; `trust proxy` ya está para que vea la IP real).

## Escalar (post-MVP)

- Más workers: `dc up -d --scale processor=N`.
- PostgreSQL en un servidor/servicio dedicado si la carga lo justifica.
- Archivos: con volumen local no se puede escalar la API a varios hosts; pasar a GCS / S3 / MinIO.
