# Feature: Catalog & Products

## Overview

Two-layer catalog system:
1. **Supplier Catalog** — Products as they come from the supplier (source data)
2. **Commerce Catalog** — Internal products the commerce manages (business data)

## Layer 1: Supplier Catalog

### Supplier Products

These are created automatically during import or manually by the user.

**Fields:** name, code, unit, brand, category (all from supplier's data)

**Key behaviors:**
- Name comes from the supplier's list (original, unmodified)
- Code is the supplier's internal product code
- Price is NOT stored on the product — it comes from `price_list_items`
- A product can exist across multiple price lists (versioned prices)

### Current Price Derivation

The "current price" of a supplier product is calculated, not stored:

```sql
SELECT pli.unit_cost
FROM price_list_items pli
JOIN price_lists pl ON pli.price_list_id = pl.id
WHERE pli.supplier_product_id = :product_id
  AND pl.status = 'processed'
ORDER BY pl.uploaded_at DESC
LIMIT 1
```

This can be wrapped in a database view or computed at the service layer.

### Product Listing View

The main product listing combines data from multiple tables:

```
supplier_products
+ latest price from price_list_items
+ previous price from the prior price_list
+ change_percentage from price_change_events
+ is_favorite from commerce_product_supplier_links
+ markup from markup_rules
+ computed sale_price
```

### Filters

| Filter | Source |
|--------|--------|
| Search (name, code) | supplier_products |
| Supplier | supplier_products.supplier_id |
| Category | supplier_products.category |
| Favorites only | commerce_product_supplier_links.is_favorite |
| Has recent change | price_change_events (last import) |
| Price range | latest price_list_items.unit_cost |

### Sorting

| Sort | Notes |
|------|-------|
| Name (A-Z, Z-A) | |
| Price (low-high, high-low) | Current price |
| % Change (highest first) | From latest change event |
| Supplier name | |
| Last updated | Latest price_list upload date |

## Layer 2: Commerce Catalog

### Commerce Products

Optional layer where the commerce creates internal products.

**Use case:** The commerce wants to unify "Azucar comun x 1kg" (Supplier A) and "Azúcar 1000gr" (Supplier B) under a single internal product "Azúcar 1kg".

**Fields:**
- `name` — Commerce's internal name (editable)
- `internal_sku` — Optional internal code
- `category` — Manually assigned by commerce
- `notes` — Free text

### Linking

Via `commerce_product_supplier_links`:
- One commerce product can be linked to multiple supplier products
- Each link has `is_favorite` flag
- This enables comparing the same product across suppliers

**Example:**
```
Commerce Product: "Azúcar 1kg"
├── Link → Supplier A > "Azucar comun x 1kg" ($1,200) ⭐
└── Link → Supplier B > "Azúcar 1000gr" ($1,350)
```

### Favorites

Favorites can be set at two levels:
1. **Direct:** On `commerce_product_supplier_links.is_favorite` (when using internal catalog)
2. **Simple:** If commerce doesn't use internal catalog, favorites work directly on supplier products via a simplified link

For MVP, support the simple approach: a product is either favorite or not, regardless of internal catalog usage.

## Price History

For any supplier product, the full price history is available:

```
GET /products/:id/price-history

Response:
{
  "product": { "id": "...", "name": "Azúcar 1kg" },
  "history": [
    { "date": "2026-03-01", "price": 1500.00, "price_list_id": "..." },
    { "date": "2026-02-01", "price": 1200.00, "price_list_id": "..." },
    { "date": "2026-01-15", "price": 1100.00, "price_list_id": "..." }
  ]
}
```

Derived from `price_list_items` joined with `price_lists`, ordered by `uploaded_at DESC`.

## Category Management

- Categories are free-text strings (no category table for MVP)
- Commerce can assign categories to their internal products
- Supplier products may have categories from import (if detected)
- Future: dedicated category table with hierarchy
