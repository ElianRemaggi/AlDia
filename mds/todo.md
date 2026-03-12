# TODO — PriceHub Development

## Status Legend
- [ ] Pending
- [x] Completed
- [~] In Progress

---

## Phase 1: Foundation (Weeks 1-2)

### 1.1 Project Setup
- [ ] Initialize monorepo with pnpm workspaces
- [ ] Configure TypeScript (shared tsconfig)
- [ ] Setup ESLint + Prettier (shared config)
- [ ] Create `apps/web` (Next.js + Tailwind + shadcn/ui)
- [ ] Create `apps/api` (Express + TypeScript)
- [ ] Create `services/document-processor` (Python)
- [ ] Create `packages/shared` (shared types and constants)
- [ ] Setup docker-compose.yml (PostgreSQL + Redis)
- [ ] Create `.env.example` files for all services
- [ ] Setup .gitignore properly

### 1.2 Database
- [ ] Configure TypeORM connection
- [ ] Create initial migration with all MVP tables
- [ ] Seed script for development data (admin user, test commerce)
- [ ] Verify all indexes are created

### 1.3 Authentication
- [ ] Implement user entity and repository
- [ ] Password hashing with bcrypt
- [ ] Login endpoint (POST /auth/login)
- [ ] JWT token generation (access + refresh)
- [ ] Auth middleware (validate token, attach user to request)
- [ ] Role middleware (requireRole)
- [ ] Commerce scope middleware (scopeToCommerce)
- [ ] Refresh token endpoint
- [ ] Logout endpoint
- [ ] GET /auth/me endpoint
- [ ] Rate limiting on auth endpoints

### 1.4 Admin Basics
- [ ] CRUD endpoints for commerces
- [ ] CRUD endpoints for users (admin only)
- [ ] Input validation with zod

---

## Phase 2: Supplier & Catalog Core (Weeks 3-4)

### 2.1 Suppliers
- [ ] Supplier entity, repository, service
- [ ] CRUD endpoints for suppliers
- [ ] Scoped to commerce_id
- [ ] List with search and pagination

### 2.2 Supplier Products
- [ ] SupplierProduct entity, repository, service
- [ ] CRUD endpoints
- [ ] List with filters (supplier, name, code, category)
- [ ] Pagination and sorting

### 2.3 File Upload
- [ ] Multer configuration for file upload
- [ ] Google Cloud Storage integration (upload, get signed URL)
- [ ] File type validation (PDF, Excel, CSV)
- [ ] File size limit (20MB)

### 2.4 Import Pipeline — Infrastructure
- [ ] BullMQ queue setup
- [ ] Import job creation flow
- [ ] Job status tracking endpoint
- [ ] Python worker — Redis connection and job polling
- [ ] Communication protocol: job payload and result format

### 2.5 Parsers — Excel/CSV
- [ ] Python: Excel parser (openpyxl + pandas)
- [ ] Python: CSV parser (pandas)
- [ ] Column mapping configuration per supplier
- [ ] Normalized output format (JSON)
- [ ] Error handling for malformed files

### 2.6 Parsers — PDF
- [ ] Python: PDF text extraction (pdfplumber)
- [ ] Table detection and row extraction
- [ ] Basic parser for common PDF table layouts
- [ ] Handle multi-page PDFs

### 2.7 Import Pipeline — Processing
- [ ] Receive parsed data from Python worker
- [ ] Match products to existing supplier_products
- [ ] Create new supplier_products for unmatched rows
- [ ] Create price_list_items (immutable)
- [ ] Update price_list status
- [ ] Store import_parse_results

---

## Phase 3: Price Intelligence (Weeks 5-6)

### 3.1 Change Detection
- [ ] Compare new price_list vs previous for same supplier
- [ ] Create price_change_events
- [ ] Handle edge cases: new products, removed products, unchanged prices

### 3.2 Price History
- [ ] GET /products/:id/price-history endpoint
- [ ] Query optimization for historical data
- [ ] Price history chart data format

### 3.3 Product Listing (Enhanced)
- [ ] Combined view: product + current price + previous price + change %
- [ ] All filters working (search, supplier, category, price range, favorites, has_change)
- [ ] All sort options working
- [ ] Pagination with total count

### 3.4 Favorites
- [ ] Mark/unmark product as favorite
- [ ] Filter by favorites
- [ ] Favorites count in dashboard

---

## Phase 4: Commerce Operations (Weeks 7-8)

### 4.1 Commerce Products
- [ ] CRUD for internal products
- [ ] Category assignment (free text)
- [ ] Internal SKU support

### 4.2 Product Linking
- [ ] Link commerce product to supplier product
- [ ] Unlink
- [ ] View all links for a commerce product
- [ ] Compare linked products (different suppliers, same internal product)

### 4.3 Markup Rules
- [ ] CRUD for markup rules
- [ ] Precedence logic (supplier_product > commerce_product > supplier)
- [ ] Bulk update: set markup for all products of a supplier
- [ ] Sale price calculation in product listing
- [ ] Inline edit markup in product table

---

## Phase 5: Purchase & Notifications (Weeks 9-10)

### 5.1 Purchase Lists
- [ ] CRUD for purchase lists
- [ ] Add/remove/update items
- [ ] Group items by supplier
- [ ] Estimated cost snapshot
- [ ] Status transitions (draft → exported → archived)

### 5.2 WhatsApp Export
- [ ] Generate WhatsApp-formatted text
- [ ] Group by supplier
- [ ] Copy-to-clipboard support in frontend
- [ ] Optional: include/exclude prices toggle

### 5.3 Notifications
- [ ] Notification entity and service
- [ ] Create notifications on import completion
- [ ] Create notifications on price change (favorites)
- [ ] GET /notifications (paginated, filterable)
- [ ] GET /notifications/unread-count
- [ ] Mark as read (single and bulk)
- [ ] Polling on frontend (30s interval)
- [ ] Bell icon with badge in navigation

---

## Phase 6: Dashboard & Polish (Weeks 11-12)

### 6.0 Admin Panel (solo visible para rol `admin`)
- [ ] Layout/navegación separada para admins (rutas bajo `/admin`)
- [ ] Listado de commerces con búsqueda y filtro por estado
- [ ] Formulario para dar de alta un commerce (nombre, identificador, email, teléfono)
- [ ] Formulario de edición de commerce
- [ ] Activar / desactivar commerce (toggle `isActive`)
- [ ] Listado de usuarios con filtro por rol y commerce
- [ ] Formulario para crear usuario (nombre, email, password, rol, commerce asignado)
- [ ] Protección de rutas: redirigir a dashboard si el usuario no es admin

### 6.1 Dashboard
- [ ] Summary stats endpoint
- [ ] Recent changes section
- [ ] Recent imports section
- [ ] Favorite alerts section
- [ ] Quick action buttons

### 6.2 Frontend Polish
- [ ] Responsive design pass (mobile-friendly tables, navigation)
- [ ] Loading states and skeletons
- [ ] Empty states with helpful messages
- [ ] Error boundaries and error pages (404, 500)
- [ ] Toast notifications for actions

### 6.3 Quality
- [ ] Unit tests for critical business logic (change detection, markup precedence, export format)
- [ ] API integration tests for auth flow
- [ ] API integration tests for import pipeline
- [ ] E2E test: upload file → see products → add to purchase list → export
- [ ] Performance check: product listing with 1000+ products
- [ ] Security review: auth, CORS, input validation, SQL injection prevention

### 6.4 Deploy
- [ ] Setup staging environment
- [ ] Configure CI/CD pipeline
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend with Docker
- [ ] Run migrations in staging
- [ ] Smoke test all critical flows
- [ ] Setup monitoring (health check, Sentry, logs)

---

## Review Notes

_(Add notes here after each phase completion)_
