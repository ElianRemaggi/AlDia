# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**PriceHub** is a SaaS platform for centralizing supplier price lists. This repository currently contains **documentation and planning only** — no application code has been written yet. The `mds/` directory holds all architectural and feature docs generated from `idea.md`.

## Development Commands

Once the monorepo is initialized with pnpm workspaces:

```bash
# Infrastructure (PostgreSQL + Redis)
docker-compose up -d

# Frontend (Next.js — localhost:3000)
cd apps/web && pnpm dev

# Backend (Express — localhost:4000)
cd apps/api && pnpm dev

# Document processor (Python)
cd services/document-processor
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py

# Tests
pnpm test              # unit tests (Vitest)
pnpm test:e2e          # end-to-end tests
pnpm --filter api test # single package

# Database migrations
cd apps/api && pnpm typeorm migration:run
cd apps/api && pnpm typeorm migration:generate -- -n MigrationName

# Lint
pnpm lint
```

## Architecture

### System Overview

Three-tier architecture with an async document processing microservice:

- **`apps/web`** — Next.js + TypeScript + Tailwind + shadcn/ui. State via TanStack Query (server state) + React useState (local UI).
- **`apps/api`** — Express.js + TypeScript + TypeORM. REST API on port 4000. Modular structure under `src/modules/` (auth, catalog, import, purchase, notification).
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
| Environment variables | `mds/env-vars.md` |
| Development roadmap | `mds/todo.md` |

## Environment Variables

Copy from `mds/env-vars.md`. Key vars:
- `DB_*` — PostgreSQL connection
- `REDIS_HOST/PORT` — Redis for BullMQ
- `JWT_SECRET` — min 256-bit random string, unique per environment
- `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, `GCS_KEY_FILE` — Google Cloud Storage
- `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`
