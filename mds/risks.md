# Risks and Mitigations

## Technical Risks

### 1. Heterogeneous PDF Formats
**Risk:** Each supplier sends PDFs with different layouts, fonts, table structures. Some are text-based, others are scanned images, and some mix both.
**Impact:** HIGH — This is the core value proposition. If parsing fails frequently, the product loses its purpose.
**Mitigation:**
- Start with Excel/CSV parsing (reliable) and text-based PDFs
- Build parser profiles per supplier (configurable rules)
- Provide manual entry as fallback for unparseable files
- Store raw parser output for debugging (`import_parse_results`)
- Mark imports as `partially_processed` when some rows fail
- Phase 2: Add OCR with Tesseract for scanned PDFs

### 2. Product Mapping Across Lists
**Risk:** Same product appears with different names/codes across imports from the same supplier (typos, rebranding, format changes).
**Impact:** MEDIUM — Breaks price history continuity.
**Mitigation:**
- Match by `supplier_product_code` as primary key (most stable)
- Fallback to fuzzy name matching with manual confirmation
- Allow user to merge/unmerge products
- Log unmatched products for review

### 3. Parser Maintenance Burden
**Risk:** Every time a supplier changes their PDF format, the parser breaks.
**Impact:** MEDIUM — Ongoing maintenance cost.
**Mitigation:**
- Parser versioning (`parser_name`, `parser_version` in `import_parse_results`)
- Configurable parser rules (not hardcoded per supplier)
- Store raw output so re-parsing is possible without re-uploading
- Alert on parser confidence scores below threshold

### 4. Large File Processing
**Risk:** Excel files with 10k+ products or multi-page PDFs take too long, timeout.
**Impact:** MEDIUM — Bad user experience.
**Mitigation:**
- Async processing via BullMQ (never block the API)
- Job progress tracking with percentage updates
- Chunked processing for large files
- Timeout limits with graceful failure messages

### 5. Query Performance with Historical Data
**Risk:** As price lists accumulate, queries joining `price_list_items` with change detection become slow.
**Impact:** LOW for MVP, MEDIUM at scale.
**Mitigation:**
- Proper indexes on `commerce_id`, `supplier_id`, `supplier_product_id`
- `price_change_events` table as materialized change log
- Consider `supplier_product_price_history` materialized table
- Pagination on all list endpoints
- Database query monitoring from the start

## Business Risks

### 6. Supplier Cooperation
**Risk:** Some suppliers provide inconsistent or poor-quality price lists.
**Impact:** MEDIUM — Limits product usefulness for some suppliers.
**Mitigation:**
- Support multiple input formats (PDF, Excel, CSV, manual)
- Manual entry always available as safety net
- Set user expectations: some suppliers may need manual processing

### 7. User Expects Full Automation
**Risk:** Commerce owners expect the system to perfectly parse every PDF without intervention.
**Impact:** HIGH — Expectation mismatch leads to churn.
**Mitigation:**
- Clear onboarding explaining what works automatically vs what needs review
- Show confidence indicators on parsed data
- Import review screen before confirming products
- Gradually improve automation based on feedback

### 8. Scope Creep
**Risk:** Adding too many features before the core is solid.
**Impact:** HIGH — Delays launch, dilutes focus.
**Mitigation:**
- Strict MVP scope defined in `mvp-plan.md`
- Feature requests logged but deferred to backlog
- Launch with core flow: upload → parse → detect changes → purchase list
- User feedback drives prioritization of v2 features

## Product Risks

### 9. Complex UI
**Risk:** Mixing catalog management, price analysis, and purchase in one interface overwhelms users.
**Impact:** MEDIUM — Reduces adoption.
**Mitigation:**
- Clear navigation with distinct sections
- Progressive disclosure: show complexity only when needed
- Dashboard as landing page with quick actions
- Mobile-first responsive design

### 10. Supplier Product vs Commerce Product Confusion
**Risk:** Users don't understand the two-layer catalog model.
**Impact:** MEDIUM — Frustration, data entry errors.
**Mitigation:**
- Commerce product creation is optional in MVP
- Default view shows supplier products directly
- Internal catalog is a power-user feature introduced after onboarding
- Clear labeling in UI: "Producto del proveedor" vs "Tu producto"

## Scalability Risks

### 11. Growing Number of Parser Configurations
**Risk:** Each new supplier format requires new parser rules.
**Impact:** MEDIUM at scale.
**Mitigation:**
- Templated parser system with configurable column mappings
- UI for defining parser rules (v2)
- Common templates for standard formats (Excel with headers, simple PDF tables)

### 12. Notification Volume
**Risk:** Many price changes on a single import flood the user with notifications.
**Impact:** LOW.
**Mitigation:**
- Group notifications by import event
- Summary notification: "15 products changed in Proveedor X's latest list"
- User can configure which suppliers/products trigger notifications
