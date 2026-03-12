# MVP Plan

## Objective

Deliver a working product that solves the core problem: **centralize supplier price lists, detect changes, and help commerces make purchase decisions.**

## MVP Scope — What's IN

### Phase 1: Foundation (Weeks 1-2)
1. Project scaffolding (monorepo, configs, Docker setup)
2. Database schema creation and migrations
3. Authentication system (register, login, JWT, role middleware)
4. Admin panel basics (create commerces, manage users)

### Phase 2: Supplier & Catalog Core (Weeks 3-4)
5. Supplier CRUD (create, edit, list, deactivate)
6. Supplier product management
7. Price list upload (file upload to cloud storage)
8. Excel/CSV parser (simplest format first)
9. PDF parser (text-based PDFs)
10. Import pipeline: upload → parse → save price_list_items

### Phase 3: Price Intelligence (Weeks 5-6)
11. Change detection engine (compare new vs previous list)
12. Price change events creation
13. Price history view per product
14. Product listing with filters: supplier, name, code, price, % change
15. Favorites system (mark/unmark supplier products)

### Phase 4: Commerce Operations (Weeks 7-8)
16. Commerce product catalog (internal naming)
17. Link commerce products to supplier products
18. Markup rules (by supplier, by product)
19. Calculated sale price display

### Phase 5: Purchase & Notifications (Weeks 9-10)
20. Purchase list creation (add items, set quantities)
21. Group items by supplier
22. Export to WhatsApp text format
23. In-app notifications for price changes
24. Notification center (list, read/unread)

### Phase 6: Dashboard & Polish (Weeks 11-12)
25. Dashboard: recent imports, price change summary, top increases
26. Responsive design pass (mobile-friendly)
27. Error handling and edge cases
28. Performance optimization (indexes, query tuning)
29. End-to-end testing of critical flows

## MVP Scope — What's OUT

- Automatic product matching between suppliers (manual linking only)
- OCR for image-only scanned PDFs (text PDFs + Excel only for MVP)
- Email/WhatsApp notifications (in-app only)
- Multi-currency support (ARS only)
- Audit trail of user changes (single user per commerce)
- Purchase order approval workflows
- AI-based price predictions
- Native mobile app
- Invoice/billing integration
- Real-time inventory tracking

## Acceptance Criteria per Feature

### Auth
- [ ] User can register with email + password
- [ ] User can login and receive JWT tokens
- [ ] Protected routes reject unauthenticated requests
- [ ] Admin can create commerces and users
- [ ] Commerce user only sees their own data

### Supplier Management
- [ ] Commerce can create, edit, deactivate suppliers
- [ ] Supplier list is filterable by name
- [ ] Each supplier belongs to exactly one commerce

### Price List Import
- [ ] User uploads Excel/CSV → products extracted and saved
- [ ] User uploads text-based PDF → products extracted and saved
- [ ] Import status tracked: pending → processing → processed/failed
- [ ] Failed imports show error message
- [ ] Each import creates immutable price_list_items

### Change Detection
- [ ] System detects price increases/decreases vs previous list
- [ ] price_change_events created with old_price, new_price, change_%
- [ ] Products display: previous price, current price, % change

### Product Catalog
- [ ] Filterable product list (supplier, name, code, price range)
- [ ] Favorite/unfavorite products
- [ ] Filter by favorites only
- [ ] Commerce can create internal products and link to supplier products
- [ ] Markup rules apply and display calculated sale price

### Purchase Lists
- [ ] Create named purchase list
- [ ] Add products with quantities
- [ ] Items grouped by supplier in the list
- [ ] Export generates WhatsApp-friendly text grouped by supplier
- [ ] List states: draft, exported, archived

### Notifications
- [ ] Notification created when favorite product price changes
- [ ] Notification on import completion (success/failure)
- [ ] Notification center with read/unread status
- [ ] Unread count displayed in navigation

### Dashboard
- [ ] Summary of recent imports (last 7 days)
- [ ] Top price increases
- [ ] Active suppliers count
- [ ] Products with pending price changes

## Technical Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| PDF parsing fails for some formats | High | Start with Excel/CSV, add PDF parsers incrementally. Allow manual entry fallback. |
| Parser rules differ per supplier | Medium | Configurable parser profiles stored in DB. Start with hardcoded rules, make configurable in v2. |
| Slow import for large files | Medium | BullMQ async processing. Show progress. Allow background processing. |
| Product matching ambiguity | Medium | MVP uses manual linking only. No automatic matching. |
| Historical queries slow with data growth | Low (MVP) | Proper indexes from day one. Materialized views if needed. |

## Success Metrics for MVP

- Import success rate > 80% for Excel/CSV files
- Import success rate > 60% for text-based PDFs
- Product listing with filters loads in < 500ms
- User can go from file upload to seeing price changes in < 2 minutes
- WhatsApp export generates correct text in < 1 second
