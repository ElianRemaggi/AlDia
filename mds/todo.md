# TODO — PriceHub Development

## Status Legend
- [ ] Pending
- [x] Completed
- [~] In Progress

## Estado general (actualizado 2026-11-20)

| Paso (`ordenDesarrollo.md`) | Estado |
|---|---|
| 1. DB + API (auth + suppliers) | ✅ |
| 2. Document Processor (Excel/CSV) | ✅ |
| 3. Import Pipeline (API + BullMQ + Python) | ✅ |
| 4. Remaining API (catálogo, markup, compras, notificaciones) | ✅ (con pendientes menores) |
| 5. Frontend (`apps/web`) | ✅ F1–F5 (auth, proveedores, admin, subida de listas, catálogo, compras, notificaciones, dashboards, polish) |
| 6. PDF parser | ✅ (adelantado; tablas + fallback LLM) |
| Deploy (Docker en VPS / servidor propio) | ❌ No iniciado |

---

## Phase 1: Foundation ✅

### 1.1 Project Setup
- [x] Initialize monorepo with pnpm workspaces
- [x] Configure TypeScript (shared tsconfig)
- [x] Setup ESLint + Prettier (shared config)
- [ ] Create `apps/web` (Next.js + Tailwind + shadcn/ui) ← Fase F1 frontend
- [x] Create `apps/api` (Express + TypeScript)
- [x] Create `services/document-processor` (Python)
- [x] Create `packages/shared` (shared types and constants)
- [x] Setup docker-compose.yml (PostgreSQL + Redis)
- [x] Create `.env.example` files for all services
- [x] Setup .gitignore properly

### 1.2 Database
- [x] Configure TypeORM connection
- [x] Create initial migration (commerces, users, suppliers)
- [x] Seed script for development data (admin user, test commerce)
- [x] Verify all indexes are created

### 1.3 Authentication
- [x] Implement user entity and repository
- [x] Password hashing with bcrypt
- [x] Login endpoint (POST /auth/login)
- [x] JWT token generation (access + refresh)
- [x] Auth middleware (validate token, attach user to request)
- [x] Role middleware (requireRole)
- [x] Commerce scope middleware (scopeToCommerce)
- [x] Refresh token endpoint
- [x] Logout endpoint
- [x] GET /auth/me endpoint
- [ ] Rate limiting on auth endpoints

### 1.4 Admin Basics
- [x] CRUD endpoints for commerces (GET, POST, GET/:id, PATCH/:id)
- [x] CRUD endpoints for users (admin only) — `modules/user/`, GET/POST/GET:id/PATCH/DELETE (soft) `/admin/users`; `/auth/register` delega en el mismo servicio
- [x] Input validation with zod

---

## Phase 2: Suppliers + Document Processor

### 2.1 Suppliers ✅
- [x] Supplier entity, repository, service
- [x] CRUD endpoints for suppliers (GET, POST, GET/:id, PATCH/:id, DELETE/:id)
- [x] Scoped to commerce_id
- [x] List with search and pagination

### 2.2 Supplier Products
- [x] SupplierProduct entity + migration (Paso 3) ✅
- [ ] CRUD endpoints: GET /suppliers/:id/products, POST, GET/:pid, PATCH/:pid

### 2.3 File Upload ✅
- [x] Multer configuration for file upload
- [x] Storage dual: local `./uploads/` en dev, GCS en prod — `shared/storage/storage.ts`
- [x] File type validation (xlsx, xls, csv)
- [x] File size limit (20MB)

### 2.4 Import Pipeline — Infrastructure (Paso 3) ✅
- [x] BullMQ queue setup — `modules/import/import.queue.ts`
- [x] Import job creation flow
- [x] Job status tracking endpoint (GET /import-jobs/:id)
- [x] Python worker — `services/document-processor/worker/`
- [x] Communication protocol documentado en `mds/import-pipeline.md`

### 2.5 Parsers — Excel/CSV ✅
- [x] Python: Excel parser (openpyxl)
- [x] Python: CSV parser (pandas + chardet)
- [x] Column mapping configuration (auto-detect + manual)
- [x] Normalized output format (JSON — `ParseResult`)
- [x] Error handling for malformed files

### 2.6 Parsers — PDF (Paso 6)
- [x] Python: PDF text + table extraction (pdfplumber), multi-página — `parsers/pdf_parser.py`
- [x] Fallback LLM para PDFs sin tablas (DeepSeek u otra API compatible con OpenAI) — `core/llm_extractor.py`
- [x] Salvaguardas: precios verificados contra el texto, códigos no inventados, chunks fallidos en `errors`
- [x] API acepta `.pdf` en upload
- [ ] Probar con listas PDF reales de proveedores y ajustar prompt / detección
- [ ] OCR para PDFs escaneados: instalar `tesseract-ocr`, `tesseract-ocr-spa`, `poppler-utils` en el Dockerfile del processor

### 2.7 Import Pipeline — Processing (Paso 3) ✅
- [x] Segunda migración: price_lists, price_list_items, import_jobs, price_change_events, import_parse_results
- [x] POST /suppliers/:id/price-lists/upload
- [x] Node Worker events: completed / failed
- [x] matchOrCreateProduct (por código, luego nombre normalizado)
- [x] createPriceListItems (inmutables)
- [x] detectPriceChanges
- [x] generateNotifications (import finished, price change, favorite price change) — Paso 4
- [x] Store import_parse_results

---

## Phase 3: Price Intelligence (API Paso 4) ✅

### 3.1 Change Detection
- [x] price_change_events creados en pipeline
- [x] GET /products/:id/changes

### 3.2 Price History
- [x] GET /products/:id/price-history
- [ ] Optimización: índice compuesto en price_list_items (supplier_product_id, created_at) — hoy solo hay índice simple en supplier_product_id

### 3.3 Product Listing
- [x] GET /products — vista cross-supplier con precio actual, cambio %, favorito
- [x] Filtros (incl. `hasRecentChange`, búsqueda por código), sort por nombre/precio/cambio en SQL, paginación
- [x] GET /products/categories
- [x] GET /products/:id

### 3.4 Favorites
- [x] POST /products/:id/favorite
- [x] DELETE /products/:id/favorite
- [x] Filtro `is_favorite` en product listing

---

## Phase 4: Commerce Operations (API Paso 4)

### 4.1 Commerce Products ✅
- [x] commerce_products entity + migration (`1710000000002-CatalogAndCommerce`)
- [x] CRUD: GET /commerce-products, POST, GET/:id, PATCH/:id, DELETE/:id

### 4.2 Product Linking ✅
- [x] POST /commerce-products/:id/links
- [x] DELETE /commerce-products/:id/links/:linkId

### 4.3 Markup Rules
- [x] markup_rules entity + migration
- [x] CRUD: GET /markup-rules, POST, PATCH/:id, DELETE/:id
- [x] POST /markup-rules/bulk-update
- [x] `pickMarkupRule()` / `applyMarkup()` en `markup.service.ts` (precedencia supplier_product > commerce_product > supplier)
- [x] Markup aplicado en `GET /products` y `GET /products/:id` → `markupPercentage`, `salePrice`

---

## Phase 5: Purchase & Notifications (API Paso 4)

### 5.1 Purchase Lists ✅
- [x] purchase_lists + purchase_list_items entities + migration
- [x] CRUD: GET /purchase-lists, POST, GET/:id, PATCH/:id, DELETE/:id
- [x] POST /purchase-lists/:id/items, PATCH/:id/items/:itemId, DELETE/:id/items/:itemId
- [x] Cambio de status (active → ordered → archived) vía PATCH /purchase-lists/:id
- [x] Totales por lista en el listado; agregar un producto repetido suma la cantidad

### 5.2 WhatsApp Export ✅
- [x] GET /purchase-lists/:id/export/whatsapp
- [x] Formato: un mensaje por proveedor (sin precios) + link `wa.me` con teléfono AR normalizado + texto completo con precios

### 5.3 Notifications
- [x] notifications entity + migration
- [x] GET /notifications, GET /notifications/unread-count
- [x] PATCH /notifications/:id/read, POST /notifications/mark-all-read
- [x] Creación automática en: import completed, price change, price change en favorito
- [x] Notificación al fallar una importación (`import_failed`, migración `1710000000003`)
- [x] Mensajes con nombre de proveedor / producto y precios

---

## Phase 6: Frontend (Paso 5)

> Ver plan detallado en `mds/frontend.md`. Toda la API que necesita F1–F4 ya está disponible.

### F1 — Base
- [x] Setup `apps/web` (Next.js 16 + Tailwind v4 + shadcn/ui Base UI + TanStack Query)
- [x] `lib/api/client.ts` — fetch wrapper con refresh deduplicado
- [x] `lib/auth/` — AuthProvider, token-store, useAuth
- [x] Protección de rutas con `AuthGate` (el middleware por cookie no funciona: ver `mds/frontend.md`)
- [x] `/login` — formulario de login
- [x] Layout dashboard (sidebar, header)
- [x] `/suppliers` — lista con búsqueda y paginación
- [x] `/suppliers/new` y `/suppliers/:id/edit`
- [x] `/suppliers/:id` — detalle
- [x] `/admin/commerces` — lista + toggle isActive
- [x] `/admin/commerces/new` y `/:id/edit`
- [x] `/admin/users` — lista
- [x] `/admin/users/new`

### F2 — Importación
- [x] `/suppliers/:id/price-lists` — historial
- [x] `/suppliers/:id/price-lists/upload` — upload + ImportJobProgress (polling)
- [x] Toasts al completar/fallar importación

### F3 — Catálogo
- [x] `/products` — tabla con todos los filtros
- [x] Toggle favorito con optimistic update
- [x] `/products/:id` — detalle + gráfico historial de precios

### F4 — Compras + Notificaciones
- [x] `/purchase-lists` — lista y creación
- [x] `/purchase-lists/:id` — items inline edit + export WhatsApp (un mensaje por proveedor)
- [x] `NotificationBell` en header con polling 30s
- [x] `/notifications` — centro de notificaciones

### F5 — Dashboard + Polish
- [x] `/` — dashboard con stats reales (`GET /dashboard/summary`)
- [x] `/admin` — dashboard admin (`GET /admin/dashboard/summary`)
- [x] Empty states en todas las páginas
- [x] Loading skeletons
- [x] Error boundaries (+ 404 y global-error)
- [x] Responsive: barra de pestañas inferior en mobile, columnas secundarias ocultas

---

## Phase 7: Quality & Deploy

### 7.1 Quality
- [x] Unit tests: change detection, markup precedence, export format
- [ ] API integration tests: auth flow, import pipeline
- [ ] E2E: upload → productos → lista de compra → export
- [ ] Performance: product listing con 1000+ productos

### 7.2 Deploy — Docker en VPS / servidor propio

> Decisión (2026-11-20): se descarta Railway y Vercel. Todo se despliega con Docker en un VPS o servidor propio. Ver `mds/deployment.md`.

- [ ] Dockerfile `apps/api` (multi-stage, pnpm workspace)
- [ ] Dockerfile `services/document-processor`
- [ ] Dockerfile `apps/web` (`output: "standalone"` ya configurado; server en `.next/standalone/apps/web/server.js`)
- [ ] `docker-compose.prod.yml`: web, api, processor, postgres, redis, reverse proxy
- [ ] Reverse proxy con HTTPS (Caddy o Nginx + Let's Encrypt)
- [ ] Migraciones automáticas al arrancar la API
- [ ] Backups de PostgreSQL + volumen de uploads
- [ ] Endpoint `GET /health` (DB + Redis)
- [ ] CI/CD: build de imágenes → registry → deploy al servidor
- [ ] Setup staging environment
- [ ] Monitoring: health check, Sentry, logs

---

## Review Notes

### Paso 1 ✅
- auth, commerce, supplier modules con tests
- Migración inicial: commerces, users, suppliers
- Pendiente menor: rate limiting en auth (CRUD /admin/users ✅ 2026-11-20)

### Paso 2 ✅
- ExcelParser + CsvParser implementados y testeados
- Auto-detección de headers y columnas
- Normalización de precios ARS y decimal_point

### Paso 3 ✅ (2026-03-12)
- 6 entidades: SupplierProduct, PriceList, PriceListItem, ImportJob, ImportParseResult, PriceChangeEvent
- Migración 1710000000001-ImportPipeline (4 enums, 6 tablas, índices)
- Storage dual: local en dev, GCS en prod (`shared/storage/storage.ts`)
- Módulo import completo: service, processor, worker, controller, routes, dto
- BullMQ Queue + Worker (Node escucha eventos, Python procesa)
- Python worker: bullmq_worker.py + job_handler.py

### Paso 4 ✅ (2026-03-12)
- Módulos nuevos: catalog, commerce-product, markup, purchase, notification
- Migración 1710000000002-CatalogAndCommerce
- generateNotifications conectado al worker de importación
- 23 archivos de test, 215 tests
- Pendientes menores: notificación de import fallido, CRUD supplier products, índice compuesto de historial (markup en listing ✅ 2026-11-20)
- ⚠️ `POST /markup-rules/bulk-update` reemplaza TODAS las reglas del commerce; `mds/markup.md` lo describe como "setear markup de un proveedor". Definir antes de usarlo desde el frontend

### Pipeline real + F2 (2026-11-20)
Bugs que solo aparecieron corriendo el pipeline de punta a punta (los unit tests mockeaban la cola):
- Node escuchaba con un `Worker` (consumía jobs y no veía los de Python) → `QueueEvents` en `import.events.ts`
- Worker Python crasheaba al arrancar (`waitUntilReady` no existe en bullmq Python)
- `priceFormat` no llegaba al parser (siempre `decimal_point`)
- Upload no verificaba que el proveedor fuera del commerce (aislamiento multi-tenant) ni que estuviera activo
- Archivo > 20MB y errores de query → 500; ahora 413 / 400 (`error-handler.ts`)
- El rewrite de Next cortaba uploads > 10MB

### Fix build (2026-03-12)
- Errores de build corregidos (`import.worker.ts`, dependencia `@google-cloud/storage`)
- La config de Railway que se agregó en ese commit fue eliminada (2026-11-20): el deploy será con Docker en servidor propio
