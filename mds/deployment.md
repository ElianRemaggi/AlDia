# Deployment Plan

## Architecture

```
                         ┌─────────────┐
                         │   Vercel     │
                         │  (Frontend)  │
                         └──────┬───────┘
                                │ HTTPS
                                ▼
┌───────────────────────────────────────────────────────┐
│                    VPS / Cloud Run                      │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Express API  │  │   Python     │  │   BullBoard  │ │
│  │   (Node.js)   │  │  Processor   │  │  (Monitoring) │ │
│  │   :4000       │  │  (Worker)    │  │   :4001       │ │
│  └──────┬────────┘  └──────┬───────┘  └──────────────┘ │
│         │                  │                             │
│  ┌──────┴──────────────────┴───────┐                    │
│  │            Redis                 │                    │
│  │         (BullMQ Queues)          │                    │
│  │           :6379                  │                    │
│  └──────────────────────────────────┘                    │
│                                                         │
│  ┌──────────────────────────────────┐                    │
│  │          PostgreSQL               │                    │
│  │           :5432                   │                    │
│  └──────────────────────────────────┘                    │
└───────────────────────────────────────────────────────┘

         ┌──────────────────────┐
         │  Google Cloud Storage │
         │   (File uploads)      │
         └──────────────────────┘
```

## Local Development

### docker-compose.yml

Services:
- `postgres`: PostgreSQL 16, port 5432, volume for persistence
- `redis`: Redis 7, port 6379
- `api`: Express app (optional — can run with npm directly)
- `processor`: Python worker (optional)

Typical dev workflow:
```bash
docker-compose up postgres redis   # Infrastructure only
cd apps/api && npm run dev          # Backend with hot reload
cd apps/web && npm run dev          # Frontend with hot reload
cd services/document-processor && python main.py  # Python worker
```

## Environment Configuration

See `env-vars.md` for full variable list.

### Environments

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| Local | localhost:3000 | localhost:4000 | localhost:5432 |
| Staging | staging.pricehub.app | api-staging.pricehub.app | Managed PostgreSQL |
| Production | pricehub.app | api.pricehub.app | Managed PostgreSQL |

## Frontend Deploy (Vercel)

- Connect GitHub repo, configure root directory: `apps/web`
- Build command: `npm run build`
- Environment variables set in Vercel dashboard
- Preview deployments on every PR
- Production deploy on merge to `main`

## Backend Deploy (Docker)

### Dockerfile (Express API)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
EXPOSE 4000
CMD ["node", "dist/app.js"]
```

### Dockerfile (Python Processor)

```dockerfile
FROM python:3.11-slim
RUN apt-get update && apt-get install -y tesseract-ocr
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

## Database Migrations

- TypeORM CLI for migration management
- Migrations run automatically on deploy (before app starts)
- Never use `synchronize: true` in production
- Migration files committed to repo

```bash
# Generate migration
npm run typeorm migration:generate -- -n MigrationName

# Run migrations
npm run typeorm migration:run

# Revert last migration
npm run typeorm migration:revert
```

## CI/CD Pipeline

```
Push to main
    │
    ├── Run linting (ESLint)
    ├── Run type checking (tsc --noEmit)
    ├── Run unit tests (Vitest)
    ├── Run API integration tests
    │
    ├── Build frontend → Deploy to Vercel
    ├── Build API Docker image → Push to registry
    ├── Build Processor Docker image → Push to registry
    │
    └── Deploy containers → Run migrations → Health check
```

## Monitoring (MVP)

- Application logs: structured JSON logging (pino or winston)
- BullBoard dashboard for queue monitoring (password protected)
- Health check endpoint: `GET /health` returns DB and Redis status
- Uptime monitoring: external service (UptimeRobot or similar)
- Error tracking: Sentry (free tier)

## Scaling Considerations (Post-MVP)

- API: horizontal scaling behind load balancer
- Python workers: scale independently based on queue depth
- Database: read replicas for heavy query loads
- Redis: Redis Cluster if queue volume justifies it
- File storage: already scalable via GCS
