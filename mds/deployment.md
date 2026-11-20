# Deployment Plan

> **Decisión (2026-11-20):** todo PriceHub (frontend, API, document processor, PostgreSQL y Redis) se despliega con **Docker en un VPS o servidor propio**. No se usa Railway, Vercel ni Cloud Run.

## Architecture

```
                    Internet (HTTPS :443)
                            │
┌───────────────────────────┼───────────────────────────────┐
│  VPS / servidor propio    ▼          (docker compose)      │
│                   ┌───────────────┐                         │
│                   │ Reverse proxy │  Caddy o Nginx          │
│                   │ + TLS (LE)    │                         │
│                   └───┬───────┬───┘                         │
│          pricehub.app │       │ api.pricehub.app            │
│                       ▼       ▼                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Next.js    │  │ Express API  │  │ Python Processor │   │
│  │   (web)      │  │   :4000      │  │    (worker)      │   │
│  │   :3000      │  │ + BullMQ     │  │                  │   │
│  └──────────────┘  └──────┬───────┘  └────────┬─────────┘   │
│                           │                   │             │
│                    ┌──────┴───────────────────┴──┐          │
│                    │   Redis :6379 (BullMQ)       │          │
│                    └──────────────────────────────┘          │
│                    ┌──────────────────────────────┐          │
│                    │   PostgreSQL :5432 (volumen)  │          │
│                    └──────────────────────────────┘          │
└───────────────────────────────────────────────────────────┘
              Archivos subidos: GCS (o volumen local)
```

Solo el reverse proxy expone puertos al exterior (80/443). PostgreSQL, Redis, API, web y processor quedan en la red interna de Docker.

**Routing del proxy:** `pricehub.app/api/*` → `api:4000` y el resto → `web:3000`. El frontend llama siempre a `/api/v1` en su mismo origen: la cookie de refresh (`sameSite: strict`, `path: /api/v1/auth/refresh`) solo funciona así, sin CORS. Un subdominio `api.pricehub.app` es opcional (para integraciones), no lo usa el browser.

## Local Development

`docker-compose.yml` levanta solo la infraestructura (PostgreSQL 15 + Redis 7):

```bash
docker-compose up -d                       # postgres + redis
pnpm --filter api dev                      # API con hot reload (:4000)
pnpm --filter web dev                      # Frontend (:3000) — cuando exista apps/web
cd services/document-processor && python main.py   # worker Python
```

## Environments

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| Local | localhost:3000 | localhost:4000 | localhost:5432 (docker) |
| Staging | staging.pricehub.app | api-staging.pricehub.app | PostgreSQL en container (servidor propio) |
| Production | pricehub.app | api.pricehub.app | PostgreSQL en container (servidor propio) |

Variables de entorno: ver `env-vars.md`. En el servidor se cargan desde un `.env` fuera del repo (nunca commiteado).

## Producción: `docker-compose.prod.yml` (a crear)

Servicios:
- `proxy` — Caddy (TLS automático) o Nginx + certbot. Único servicio con puertos publicados.
- `web` — imagen de `apps/web` (Next.js `output: "standalone"`).
- `api` — imagen de `apps/api`. Corre migraciones antes de arrancar.
- `processor` — imagen de `services/document-processor`.
- `postgres` — `postgres:15`, volumen persistente.
- `redis` — `redis:7-alpine`, con AOF habilitado para no perder jobs.

Todos con `restart: unless-stopped` y healthchecks.

### Dockerfile (Express API) — monorepo pnpm, multi-stage

```dockerfile
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter api build
RUN pnpm --filter api deploy --prod /out

FROM node:20-alpine
WORKDIR /app
COPY --from=build /out .
EXPOSE 4000
CMD ["sh", "-c", "node dist/shared/database/run-migrations.js && node dist/server.js"]
```

(El script de migraciones al arrancar está por definir; el entrypoint de la API es `dist/server.js`.)

### Dockerfile (Python Processor)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

(Si en Fase 2 se agrega OCR, sumar `tesseract-ocr` vía apt.)

### Dockerfile (Next.js)

Build con `output: "standalone"` (ya configurado) y runtime `node:22-alpine`. En el monorepo el server queda en `.next/standalone/apps/web/server.js`; copiar `.next/static` y `public/` al lado (`next start` no sirve con standalone).

Los rewrites de `next.config.ts` (`/api/v1/*` → `API_PROXY_TARGET`) se resuelven **en build**. Con el reverse proxy ruteando `/api/*` a la API no hacen falta en producción; si se sirve la web sin proxy delante, buildear con `API_PROXY_TARGET=http://api:4000`.

## Database Migrations

- TypeORM CLI (`pnpm --filter api migration:run`)
- Se ejecutan automáticamente al arrancar el container de la API
- Nunca `synchronize: true` en producción
- Migraciones commiteadas en `apps/api/src/shared/database/migrations/`

## Backups

- `pg_dump` diario vía cron (en el host o un container dedicado), con retención (ej. 7 diarios + 4 semanales)
- Copia off-site de los dumps (otro servidor o bucket)
- Si los uploads se guardan en volumen local en vez de GCS, incluir ese volumen en el backup

## CI/CD Pipeline

```
Push to main
    │
    ├── Lint (ESLint) + type check (tsc --noEmit)
    ├── Unit tests (Vitest) + tests Python (pytest)
    │
    ├── Build imágenes: web, api, processor
    ├── Push al registry (GHCR u otro)
    │
    └── Deploy al servidor (SSH):
          docker compose -f docker-compose.prod.yml pull
          docker compose -f docker-compose.prod.yml up -d
          → health check
```

## Monitoring (MVP)

- Logs estructurados en JSON (pino o winston), `docker compose logs` + rotación de logs de Docker
- BullBoard para monitorear colas (protegido con password, detrás del proxy)
- Health check: `GET /health` devuelve estado de DB y Redis
- Uptime monitoring externo (UptimeRobot o similar)
- Error tracking: Sentry (free tier)

## Scaling Considerations (Post-MVP)

- Escalar workers Python con `docker compose up --scale processor=N`
- Mover PostgreSQL a un servidor/servicio dedicado si la carga lo justifica
- Múltiples réplicas de la API detrás del reverse proxy
- Archivos: GCS ya escala; si se usa volumen local, migrar a object storage (GCS / S3 / MinIO)
