# Database Schema

## Overview

The database is organized in 4 layers:
1. **Identity & Access** — Users and authentication
2. **Organization** — Commerces and suppliers
3. **Source Catalog** — Supplier products, price lists, import pipeline
4. **Commerce Operations** — Internal catalog, markup, purchases, notifications

All tables include `commerce_id` for multi-tenancy (except `users` for admin-level users).

---

## 1. Identity & Access

### users

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen_random_uuid() | |
| name | varchar(255) | NOT NULL | |
| email | varchar(255) | NOT NULL, UNIQUE | |
| password_hash | varchar(255) | NOT NULL | bcrypt |
| role | enum('admin', 'commerce') | NOT NULL | |
| commerce_id | uuid | FK → commerces.id, NULLABLE | NULL for global admins |
| is_active | boolean | DEFAULT true | |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Indexes:** `email` (unique), `commerce_id`

**Notes:**
- Admin users may have `commerce_id = NULL` (global admin).
- Commerce users always have a `commerce_id`.
- MVP: single user per commerce. Structure supports multiple users for future.

---

## 2. Organization

### commerces

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| name | varchar(255) | NOT NULL | |
| identifier | varchar(100) | UNIQUE, NULLABLE | Internal code |
| email | varchar(255) | NULLABLE | |
| phone | varchar(50) | NULLABLE | |
| is_active | boolean | DEFAULT true | |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Indexes:** `identifier` (unique)

### suppliers

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| commerce_id | uuid | FK → commerces.id, NOT NULL | |
| name | varchar(255) | NOT NULL | |
| supplier_code | varchar(100) | NULLABLE | |
| description | text | NULLABLE | |
| contact_name | varchar(255) | NULLABLE | |
| contact_email | varchar(255) | NULLABLE | |
| contact_phone | varchar(50) | NULLABLE | |
| is_active | boolean | DEFAULT true | |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Indexes:** `commerce_id`, `(commerce_id, supplier_code)` unique where supplier_code is not null

**Notes:** Suppliers are scoped to a commerce. Two commerces can have suppliers with the same name independently.

---

## 3. Source Catalog

### supplier_products

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| commerce_id | uuid | FK → commerces.id, NOT NULL | |
| supplier_id | uuid | FK → suppliers.id, NOT NULL | |
| supplier_product_code | varchar(100) | NULLABLE | Code from supplier's list |
| name | varchar(500) | NOT NULL | Original name from supplier |
| description | text | NULLABLE | |
| unit | varchar(50) | NULLABLE | e.g., "kg", "unidad", "pack x6" |
| brand | varchar(255) | NULLABLE | |
| category | varchar(255) | NULLABLE | |
| is_active | boolean | DEFAULT true | |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Indexes:** `commerce_id`, `supplier_id`, `(supplier_id, supplier_product_code)` unique where code is not null

**Critical:** Do NOT store "current price" here. Price comes from the latest `price_list_items`.

### price_lists

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| commerce_id | uuid | FK → commerces.id, NOT NULL | |
| supplier_id | uuid | FK → suppliers.id, NOT NULL | |
| source_type | enum('pdf','csv','excel','manual','image') | NOT NULL | |
| source_file_url | text | NULLABLE | URL in cloud storage |
| source_file_name | varchar(500) | NULLABLE | Original filename |
| uploaded_by_user_id | uuid | FK → users.id, NOT NULL | |
| status | enum('pending','processing','processed','failed','partially_processed') | DEFAULT 'pending' | |
| version_number | integer | NOT NULL | Auto-incremented per supplier |
| effective_date | date | NULLABLE | Date the list is valid from |
| uploaded_at | timestamptz | DEFAULT now() | |
| processed_at | timestamptz | NULLABLE | |
| notes | text | NULLABLE | |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Indexes:** `commerce_id`, `supplier_id`, `(supplier_id, version_number)` unique, `status`

### price_list_items

**IMMUTABLE** — Never updated. Each import creates new rows.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| price_list_id | uuid | FK → price_lists.id, NOT NULL | |
| supplier_product_id | uuid | FK → supplier_products.id, NULLABLE | NULL if product not yet matched |
| raw_name | varchar(500) | NULLABLE | Name as extracted from source |
| raw_description | text | NULLABLE | |
| unit_cost | decimal(12,2) | NOT NULL | |
| currency | varchar(3) | DEFAULT 'ARS' | |
| min_quantity | integer | NULLABLE | Reserved for future |
| bulk_price | decimal(12,2) | NULLABLE | Reserved for future |
| position_index | integer | NULLABLE | Row order in source document |
| created_at | timestamptz | DEFAULT now() | |

**Indexes:** `price_list_id`, `supplier_product_id`

### price_change_events

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| commerce_id | uuid | FK → commerces.id, NOT NULL | |
| supplier_id | uuid | FK → suppliers.id, NOT NULL | |
| supplier_product_id | uuid | FK → supplier_products.id, NOT NULL | |
| old_price | decimal(12,2) | NOT NULL | |
| new_price | decimal(12,2) | NOT NULL | |
| change_percentage | decimal(8,2) | NOT NULL | |
| detected_in_price_list_id | uuid | FK → price_lists.id, NOT NULL | |
| created_at | timestamptz | DEFAULT now() | |

**Indexes:** `commerce_id`, `supplier_product_id`, `detected_in_price_list_id`, `created_at`

### import_jobs

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| price_list_id | uuid | FK → price_lists.id, NOT NULL | |
| job_type | enum('parse_document','normalize','detect_changes') | NOT NULL | |
| status | enum('queued','running','completed','failed') | DEFAULT 'queued' | |
| started_at | timestamptz | NULLABLE | |
| finished_at | timestamptz | NULLABLE | |
| error_message | text | NULLABLE | |
| meta_json | jsonb | NULLABLE | Extra metadata |
| created_at | timestamptz | DEFAULT now() | |

**Indexes:** `price_list_id`, `status`

### import_parse_results (optional, recommended)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| price_list_id | uuid | FK → price_lists.id, NOT NULL | |
| parser_name | varchar(100) | NOT NULL | e.g., "pdf_table_v1" |
| parser_version | varchar(20) | NOT NULL | e.g., "1.0.0" |
| raw_output_json | jsonb | NOT NULL | Raw extraction output |
| normalized_output_json | jsonb | NULLABLE | Post-normalization |
| created_at | timestamptz | DEFAULT now() | |

---

## 4. Commerce Operations

### commerce_products

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| commerce_id | uuid | FK → commerces.id, NOT NULL | |
| name | varchar(500) | NOT NULL | Commerce's internal name |
| description | text | NULLABLE | |
| internal_sku | varchar(100) | NULLABLE | |
| category | varchar(255) | NULLABLE | Manually assigned |
| notes | text | NULLABLE | |
| is_active | boolean | DEFAULT true | |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Indexes:** `commerce_id`, `(commerce_id, internal_sku)` unique where sku is not null

### commerce_product_supplier_links

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| commerce_id | uuid | FK → commerces.id, NOT NULL | |
| commerce_product_id | uuid | FK → commerce_products.id, NOT NULL | |
| supplier_product_id | uuid | FK → supplier_products.id, NOT NULL | |
| is_favorite | boolean | DEFAULT false | |
| is_active | boolean | DEFAULT true | |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Indexes:** `commerce_product_id`, `supplier_product_id`, `(commerce_product_id, supplier_product_id)` unique

### markup_rules

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| commerce_id | uuid | FK → commerces.id, NOT NULL | |
| scope_type | enum('supplier','supplier_product','commerce_product') | NOT NULL | |
| supplier_id | uuid | FK, NULLABLE | When scope = supplier |
| supplier_product_id | uuid | FK, NULLABLE | When scope = supplier_product |
| commerce_product_id | uuid | FK, NULLABLE | When scope = commerce_product |
| markup_percentage | decimal(8,2) | NOT NULL | e.g., 30.00 for 30% |
| is_active | boolean | DEFAULT true | |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Indexes:** `commerce_id`, `scope_type`

**Precedence rules (most specific wins):**
1. `supplier_product` specific markup
2. `commerce_product` markup
3. `supplier` general markup

### purchase_lists

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| commerce_id | uuid | FK → commerces.id, NOT NULL | |
| created_by_user_id | uuid | FK → users.id, NOT NULL | |
| name | varchar(255) | NOT NULL | |
| status | enum('draft','exported','archived') | DEFAULT 'draft' | |
| notes | text | NULLABLE | |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Indexes:** `commerce_id`, `status`

### purchase_list_items

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| purchase_list_id | uuid | FK → purchase_lists.id, NOT NULL | |
| supplier_id | uuid | FK → suppliers.id, NOT NULL | |
| supplier_product_id | uuid | FK → supplier_products.id, NOT NULL | |
| commerce_product_id | uuid | FK → commerce_products.id, NULLABLE | |
| quantity | decimal(10,2) | NOT NULL | |
| estimated_unit_cost | decimal(12,2) | NULLABLE | Snapshot at time of adding |
| estimated_total_cost | decimal(12,2) | NULLABLE | quantity × unit_cost |
| notes | text | NULLABLE | |
| sort_order | integer | NULLABLE | |
| created_at | timestamptz | DEFAULT now() | |

**Indexes:** `purchase_list_id`, `supplier_id`

### notifications

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| commerce_id | uuid | FK → commerces.id, NOT NULL | |
| user_id | uuid | FK → users.id, NULLABLE | NULL = all users of commerce |
| type | enum('price_change','favorite_price_change','import_finished','import_failed') | NOT NULL | |
| title | varchar(255) | NOT NULL | |
| message | text | NOT NULL | |
| is_read | boolean | DEFAULT false | |
| reference_type | varchar(50) | NULLABLE | e.g., 'supplier_product', 'price_list' |
| reference_id | uuid | NULLABLE | ID of referenced entity |
| created_at | timestamptz | DEFAULT now() | |
| read_at | timestamptz | NULLABLE | |

**Indexes:** `commerce_id`, `user_id`, `is_read`, `created_at`

---

## Relationship Summary

```
commerces
├── users (1:N)
├── suppliers (1:N)
│   ├── supplier_products (1:N)
│   └── price_lists (1:N)
│       ├── price_list_items (1:N)
│       ├── import_jobs (1:N)
│       └── import_parse_results (1:N)
├── commerce_products (1:N)
│   └── commerce_product_supplier_links (1:N) → supplier_products
├── markup_rules (1:N)
├── purchase_lists (1:N)
│   └── purchase_list_items (1:N) → supplier_products
├── notifications (1:N)
└── price_change_events (1:N) → supplier_products
```

## Key Design Decisions

1. **No "current price" column on supplier_products.** The current price is always derived from the latest processed `price_list` for that supplier. This prevents data drift.

2. **price_list_items are immutable.** Each import generates new rows. Historical data is never overwritten.

3. **Separate supplier_product from commerce_product.** This keeps imported source data clean and lets the commerce customize names, categories, and groupings independently.

4. **markup_rules as a separate table with scope types.** Supports multiple markup strategies without cluttering product tables.

5. **UUIDs as primary keys.** Avoids sequential ID guessing and simplifies distributed systems in the future.
