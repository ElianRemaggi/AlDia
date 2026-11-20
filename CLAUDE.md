# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**PriceHub** is a SaaS platform for centralizing supplier price lists. The `mds/` directory holds all architectural and feature docs.

**Current state:** Steps 1–4 complete (backend done). `apps/api` has auth, commerce, supplier, import, catalog, commerce-product, markup, purchase and notification modules, 3 migrations and 215 unit tests. `services/document-processor` has Excel/CSV parsers + BullMQ worker. **Next: Step 5 (frontend) — `apps/web` does not exist yet.** Step 6 (PDF parser) and production deploy are not started. Minor backend pending items are tracked in `mds/todo.md`.

**Deployment target:** Docker on a self-hosted VPS/server for the whole stack (web, api, processor, PostgreSQL, Redis). Do NOT use or add config for Railway, Vercel or Cloud Run. See `mds/deployment.md`.

## Development Order

Follow `ordenDesarrollo.md` strictly. Build in this sequence:

1. **DB + API (auth + suppliers)** — docker-compose, migrations, auth and supplier endpoints
2. **Document Processor (Python)** — Excel/CSV parser first (most reliable), test in isolation
3. **Import Pipeline (API + Python + Redis)** — upload → BullMQ → Python → products/prices in DB. Core product validation.
4. **Remaining API** — catalog, price changes, favorites, markup, purchases, notifications. All testeable without frontend.
5. **Frontend** — with stable API: auth, dashboard, product listing, file upload, purchase lists, notifications
6. **PDF parser** — added last to Document Processor because it's more fragile and needs iteration

## Development Commands

```bash
# Infrastructure (PostgreSQL + Redis)
docker-compose up -d

# Backend (Express — localhost:4000)
pnpm --filter api dev

# Tests
pnpm test                          # all unit tests
pnpm --filter api test             # api tests only
pnpm --filter api test:watch       # watch mode
pnpm --filter api test:coverage    # with coverage

# Database
pnpm --filter api migration:run
pnpm --filter api migration:revert
pnpm --filter api migration:generate -- src/shared/database/migrations/MigrationName
pnpm --filter api seed

# Lint
pnpm lint
```

## Architecture

### System Overview

Three-tier architecture with an async document processing microservice:

- **`apps/web`** — Next.js + TypeScript + Tailwind + shadcn/ui. State via TanStack Query (server state) + React useState (local UI).
- **`apps/api`** — Express.js + TypeScript + TypeORM. REST API on port 4000. Modular structure under `src/modules/` (auth, commerce, supplier, import, catalog, commerce-product, markup, purchase, notification). Path alias `@/` → `src/`. Each module follows the pattern: `{module}.controller.ts`, `{module}.service.ts`, `{module}.routes.ts`, `{module}.dto.ts`, `entities/{module}.entity.ts`. Shared middleware in `src/shared/middleware/`. Test fixtures/mocks in `src/test/`.
- **`services/document-processor`** — Python microservice. Polls BullMQ queue via Redis, parses files, returns normalized JSON.
- **`packages/shared`** — Shared TypeScript types and constants between frontend and backend.

### Key Architectural Decisions

1. **Two-layer catalog:** `supplier_products` holds raw imported data (immutable, source of truth). `commerce_products` holds the commerce's internal catalog with custom names and categories. They're linked via `commerce_product_supplier_links`. Never mix these layers.

2. **Immutable price lists:** Every import creates a new `price_list` + `price_list_items`. Prices are never overwritten. Current price is always derived from the latest processed `price_list` for that supplier.

3. **Multi-tenancy by `commerce_id`:** Every data table is scoped to a commerce. Suppliers are NOT shared between commerces. All service-layer queries must filter by `commerce_id`. Admins have cross-commerce access.

4. **Async import pipeline via BullMQ:** File upload → GCS → `price_list` record (pending) → BullMQ job → Python worker parses → returns normalized JSON → Node backend creates `price_list_items` → change detection → notifications. Queue name: `document-processing`, concurrency: 2, timeout: 5 min, 1 retry.

5. **Markup precedence:** `supplier_product` rule → `commerce_product` rule → `supplier` rule. Resolved at query time from `markup_rules` table.

### Data Flow: Import Pipeline

```
Upload → GCS → price_list(pending) → BullMQ → Python parser →
normalized JSON → price_list_items(immutable) → change detection →
price_change_events → notifications → price_list(processed)
```

### Core Database Tables

**Source layer:** `users`, `commerces`, `suppliers`, `supplier_products`, `price_lists`, `price_list_items`, `import_jobs`

**Commerce layer:** `commerce_products`, `commerce_product_supplier_links`, `markup_rules`, `purchase_lists`, `purchase_list_items`

**Events/Alerts:** `notifications`, `price_change_events`

### Auth

JWT with short-lived access tokens (15 min, in-memory) + refresh tokens (7 days, httpOnly cookie). Roles: `admin` (cross-commerce) and `commerce` (scoped). bcrypt with 12 salt rounds.

### Key Constraints

- Purchase list export format: plain text for WhatsApp (grouped by supplier)
- Notifications: in-app only, no email/SMS
- File uploads: max 20MB, types: PDF, Excel, CSV (images/scanned PDFs deferred to Phase 2)
- Currency: ARS only for MVP
- One user account per commerce (no multi-user per commerce in MVP)
- Product matching within import: by `supplier_product_code` first, then name normalization

## Reference Docs

All detailed documentation lives in `mds/`:

| Topic | File |
|-------|------|
| System architecture diagram | `mds/overview.md` |
| Stack rationale | `mds/stack-decisions.md` |
| Full DB schema | `mds/schema.md` |
| Import pipeline detail | `mds/import-pipeline.md` |
| All API endpoints | `mds/endpoints.md` |
| API reference (implementada) | `mds/api-reference.md` |
| Frontend planning detallado | `mds/frontend.md` |
| Environment variables | `mds/env-vars.md` |
| Development roadmap | `mds/todo.md` |
| Deployment (Docker, self-hosted) | `mds/deployment.md` |

## Environment Variables

Copy from `mds/env-vars.md`. Key vars:
- `DB_*` — PostgreSQL connection
- `REDIS_HOST/PORT` — Redis for BullMQ
- `JWT_SECRET` — min 256-bit random string, unique per environment
- `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, `GCS_KEY_FILE` — Google Cloud Storage
- `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`

## Workflow Rules

Rules in `.claude/rules/rules.md` govern how Claude operates in this repo. Key mandates:

- **Plan first:** Enter plan mode for any task with >3 steps, architectural decisions, or multi-file changes. If something goes wrong, stop and re-plan immediately.
- **Subagents:** Delegate research, exploration, and analysis to subagents. One task per subagent. Reserve the main context for decisions and synthesis.
- **Self-improvement loop:** After any user correction, update `mds/lessons.md` with the error, root cause, and a rule to prevent recurrence. Review `mds/lessons.md` at the start of each session.
- **Verify before completing:** Never mark a task done without running tests, checking logs, and confirming correct behavior.
- **Autonomous debugging:** When given a bug report, investigate logs, errors, and failing tests independently. Don't ask the user for step-by-step instructions.

## Claude Configuration (`.claude/`)

### Agents (`.claude/agents/`)

Custom sub-agents with PriceHub-specific context:

| Agent | Scope |
|-------|-------|
| `nextjs-pro` | Frontend: Next.js App Router, shadcn/ui, TanStack Query, auth flow |
| `express-api-pro` | Backend: Express modules, middleware chain, multi-tenancy, validation |
| `typeorm-postgres-pro` | Database: full PriceHub schema, entities, migrations, query patterns |
| `bullmq-pro` | Queue: import pipeline, job payloads, Python worker communication |

### Skills (`.claude/skills/`)

| Skill | Content |
|-------|---------|
| `react-best-practices` | 58 Vercel performance rules across 8 categories with individual `rules/` files |
| `composition-patterns` | React compound components, state management, React 19 APIs |
| `python-development` | Plugin with 16 sub-skills + 3 agents (python-pro, fastapi-pro, django-pro) |
| `express-rest-api` | Express.js patterns and conventions |
| `jwt-authentication` | JWT auth implementation patterns |
| `typeorm` | TypeORM entity and migration patterns |
| `docker-deployment` | Docker containerization and deployment |
| `error-handling` | Error handling strategies |
| `async-patterns` | Node.js async/await, Promises, streams |
| `deploy-to-vercel` | Vercel deployment scripts |
| `web-design-guidelines` | UI/UX design guidelines |

### Settings (`.claude/settings.json`)

Permission configuration: `acceptEdits` mode with pre-approved `git`, `pnpm`, and `docker` commands. `.env*` file reads are denied.
