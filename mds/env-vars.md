# Environment Variables

## Backend (Express API)

```env
# Server
NODE_ENV=development
PORT=4000
API_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pricehub
DB_USER=pricehub
DB_PASSWORD=
DB_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Authentication
JWT_SECRET=                    # Min 256-bit random string
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Google Cloud Storage
GCS_BUCKET_NAME=pricehub-uploads
GCS_PROJECT_ID=
GCS_KEY_FILE=                  # Path to service account JSON

# BullMQ
BULL_QUEUE_PREFIX=pricehub

# Logging
LOG_LEVEL=debug                # debug | info | warn | error

# CORS
CORS_ORIGIN=http://localhost:3000

# Refresh cookie `Secure` flag. Default: true if NODE_ENV=production. false only for plain-HTTP deploys
COOKIE_SECURE=

# Local file storage when GCS_BUCKET_NAME is empty (the Docker image uses /data/uploads)
LOCAL_UPLOADS_DIR=./uploads
```

En producción (`NODE_ENV=production`) la API no arranca si `JWT_SECRET` tiene menos de 32 caracteres.

Script de alta de admin (`dist/shared/database/create-admin.js`): `ADMIN_EMAIL`, `ADMIN_PASSWORD` (mín. 10), `ADMIN_NAME` (opcional).

## Frontend (Next.js)

```env
# Opcional. Default /api/v1: el browser llama al mismo origen (ver mds/frontend.md, Auth)
NEXT_PUBLIC_API_URL=/api/v1
# Destino del rewrite /api/v1/* → API. Se evalúa en build. Default http://localhost:4000
API_PROXY_TARGET=http://localhost:4000
```

## Document Processor (Python)

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
QUEUE_NAME=document-processing
GCS_BUCKET_NAME=pricehub-uploads
GCS_PROJECT_ID=
GCS_KEY_FILE=
TESSERACT_CMD=/usr/bin/tesseract
# LLM for PDFs without detectable tables (any OpenAI-compatible API; DeepSeek by default)
LLM_API_KEY=
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
LLM_CHUNK_CHARS=6000
LLM_MAX_WORKERS=4
LOG_LEVEL=DEBUG
```

## Producción (`docker-compose.prod.yml`)

Todo se configura con un único `.env.prod` en la raíz del servidor; plantilla en `deploy/prod.env.example`. El compose arma las variables de cada servicio (hosts internos `postgres` / `redis`, `NODE_ENV=production`). Obligatorias: `DOMAIN`, `POSTGRES_PASSWORD`, `JWT_SECRET`. Ver `mds/deployment.md`.

## Docker Compose (local development)

```env
POSTGRES_DB=pricehub
POSTGRES_USER=pricehub
POSTGRES_PASSWORD=pricehub_dev
```

## Notes

- Never commit `.env` files to the repository
- Use `.env.example` as a template with placeholder values
- Production secrets managed via hosting platform's secret manager
- JWT_SECRET must be unique per environment
- GCS_KEY_FILE should be a service account with minimal permissions (Storage Object Admin on the specific bucket)
