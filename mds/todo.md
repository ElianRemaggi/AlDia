# TODO — PriceHub Development

## Status Legend
- [ ] Pending
- [x] Completed
- [~] In Progress

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
- [ ] CRUD endpoints for users (admin only) — GET/PATCH/DELETE /admin/users
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

### 2.3 File Upload
- [x] Multer configuration for file upload ✅
- [x] Storage dual: local `./uploads/` en dev, GCS en prod — `shared/storage/storage.ts` ✅
- [x] File type validation (xlsx, xls, csv) ✅
- [x] File size limit (20MB) ✅

### 2.4 Import Pipeline — Infrastructure (Paso 3)
- [x] BullMQ queue setup — `modules/import/import.queue.ts` ✅
- [x] Import job creation flow ✅
- [x] Job status tracking endpoint (GET /import-jobs/:id) ✅
- [x] Python worker — `services/document-processor/worker/` ✅
- [x] Communication protocol documentado en `mds/import-pipeline.md` ✅

### 2.5 Parsers — Excel/CSV ✅
- [x] Python: Excel parser (openpyxl)
- [x] Python: CSV parser (pandas + chardet)
- [x] Column mapping configuration (auto-detect + manual)
- [x] Normalized output format (JSON — `ParseResult`)
- [x] Error handling for malformed files

### 2.6 Parsers — PDF (Paso 6)
- [ ] Python: PDF text extraction (pdfplumber)
- [ ] Table detection and row extraction
- [ ] Handle multi-page PDFs

### 2.7 Import Pipeline — Processing (Paso 3) ✅
- [x] Segunda migración: price_lists, price_list_items, import_jobs, price_change_events, import_parse_results ✅
- [x] POST /suppliers/:id/price-lists/upload ✅
- [x] Node Worker events: completed / failed ✅
- [x] matchOrCreateProduct (por código, luego nombre normalizado) ✅
- [x] createPriceListItems (inmutables) ✅
- [x] detectPriceChanges ✅
- [ ] generateNotifications (favoritos) — requiere commerce_product_supplier_links (Paso 4)
- [x] Store import_parse_results ✅

---

## Phase 3: Price Intelligence (API Paso 4)

### 3.1 Change Detection
- [ ] price_change_events ya creados en pipeline — endpoints de consulta
- [ ] GET /products/:id/changes

### 3.2 Price History
- [ ] GET /products/:id/price-history endpoint
- [ ] Optimización: índice en (supplier_product_id, created_at)

### 3.3 Product Listing
- [ ] GET /products — vista cross-supplier con precio actual, cambio %, favorito
- [ ] Filtros: search, supplier_id, category, is_favorite, has_recent_change, price range
- [ ] Sort: name, price, change_percentage
- [ ] Paginación

### 3.4 Favorites
- [ ] POST /products/:id/favorite
- [ ] DELETE /products/:id/favorite
- [ ] Filtro `is_favorite` en product listing

---

## Phase 4: Commerce Operations (API Paso 4)

### 4.1 Commerce Products
- [ ] commerce_products entity + migration
- [ ] CRUD: GET /commerce-products, POST, GET/:id, PATCH/:id, DELETE/:id

### 4.2 Product Linking
- [ ] POST /commerce-products/:id/links
- [ ] DELETE /commerce-products/:id/links/:linkId

### 4.3 Markup Rules
- [ ] markup_rules entity + migration
- [ ] CRUD: GET /markup-rules, POST, PATCH/:id, DELETE/:id
- [ ] POST /markup-rules/bulk-update
- [ ] Lógica de precedencia en product listing (supplier_product > commerce_product > supplier)

---

## Phase 5: Purchase & Notifications (API Paso 4)

### 5.1 Purchase Lists
- [ ] purchase_lists + purchase_list_items entities + migration
- [ ] CRUD: GET /purchase-lists, POST, GET/:id, PATCH/:id, DELETE/:id
- [ ] POST /purchase-lists/:id/items, PATCH/:id/items/:itemId, DELETE/:id/items/:itemId
- [ ] PATCH /purchase-lists/:id/status (draft → exported → archived)

### 5.2 WhatsApp Export
- [ ] GET /purchase-lists/:id/export/whatsapp
- [ ] Formato: agrupado por proveedor, texto plano

### 5.3 Notifications
- [ ] notifications entity + migration
- [ ] GET /notifications, GET /notifications/unread-count
- [ ] PATCH /notifications/:id/read, POST /notifications/mark-all-read
- [ ] Creación automática en: import completed/failed, price change en favorito

---

## Phase 6: Frontend (Paso 5)

> Ver plan detallado en `mds/frontend.md`

### F1 — Disponible ahora (API Paso 1 lista)
- [ ] Setup `apps/web` (Next.js + Tailwind + shadcn/ui)
- [ ] `lib/api/client.ts` — fetch wrapper con refresh interceptor
- [ ] `lib/auth/` — AuthProvider, token-store, useAuth
- [ ] `middleware.ts` — protección de rutas
- [ ] `/login` — formulario de login
- [ ] Layout dashboard (sidebar, header)
- [ ] `/suppliers` — lista con búsqueda y paginación
- [ ] `/suppliers/new` y `/suppliers/:id/edit`
- [ ] `/suppliers/:id` — detalle
- [ ] `/admin/commerces` — lista + toggle isActive
- [ ] `/admin/commerces/new` y `/:id/edit`
- [ ] `/admin/users` — lista
- [ ] `/admin/users/new`

### F2 — Tras API Paso 3 (Import Pipeline)
- [ ] `/suppliers/:id/price-lists` — historial
- [ ] `/suppliers/:id/price-lists/upload` — upload + ImportJobPoller
- [ ] Toasts al completar/fallar importación

### F3 — Tras API Paso 4 (Catálogo)
- [ ] `/products` — tabla con todos los filtros
- [ ] Toggle favorito con optimistic update
- [ ] `/products/:id` — detalle + gráfico historial de precios

### F4 — Tras API Paso 5 (Compras + Notificaciones)
- [ ] `/purchase-lists` — lista y creación
- [ ] `/purchase-lists/:id` — items inline edit + export WhatsApp
- [ ] `NotificationBell` en header con polling 30s
- [ ] `/notifications` — centro de notificaciones

### F5 — Dashboard + Polish
- [ ] `/` — dashboard con stats reales
- [ ] `/admin` — dashboard admin
- [ ] Empty states en todas las páginas
- [ ] Loading skeletons
- [ ] Error boundaries
- [ ] Responsive: tablas → cards en mobile

---

## Phase 7: Quality & Deploy

### 7.1 Quality
- [ ] Unit tests: change detection, markup precedence, export format
- [ ] API integration tests: auth flow, import pipeline
- [ ] E2E: upload → productos → lista de compra → export
- [ ] Performance: product listing con 1000+ productos

### 7.2 Deploy
- [ ] Setup staging environment
- [ ] CI/CD pipeline
- [ ] Frontend → Vercel
- [ ] Backend + services → Docker (VPS o Cloud Run)
- [ ] Migrations en staging
- [ ] Monitoring: health check, Sentry, logs

---

## Review Notes

### Paso 1 ✅ (completado)
- auth, commerce, supplier modules con tests
- Migración inicial: commerces, users, suppliers
- Pendiente menor: rate limiting en auth, DELETE /admin/users

### Paso 2 ✅ (completado)
- ExcelParser + CsvParser implementados y testeados
- Auto-detección de headers y columnas
- Normalización de precios ARS y decimal_point

### Paso 3 ✅ (completado — 2026-03-12)
- 6 entidades: SupplierProduct, PriceList, PriceListItem, ImportJob, ImportParseResult, PriceChangeEvent
- Migración 1710000000001-ImportPipeline (4 enums, 6 tablas, índices)
- Storage dual: local en dev, GCS en prod (`shared/storage/storage.ts`)
- Módulo import completo: service, processor, worker, controller, routes, dto
- BullMQ Queue + Worker (Node escucha eventos, Python procesa)
- Python worker: bullmq_worker.py + job_handler.py
- 30 tests nuevos, 142 tests totales ✅
- Pendiente menor: generateNotifications para favoritos (requiere Paso 4)
