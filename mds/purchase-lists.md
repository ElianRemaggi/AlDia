# Feature: Purchase Lists

## Overview

Commerces build purchase lists by selecting products and setting quantities. Lists are grouped by supplier and can be exported as WhatsApp-friendly text.

## Lifecycle

```
draft → exported → archived
```

- **draft:** Active list being built. Items can be added/removed/edited.
- **exported:** List has been exported at least once. Still editable.
- **archived:** No longer active. Read-only.

## Creating a Purchase List

1. User creates a named list (`POST /purchase-lists`)
2. From the product catalog, user adds items to the list
3. Each item includes: supplier_product, quantity, optional notes
4. Estimated costs are snapshotted at time of adding

## Adding Items

```json
POST /purchase-lists/:id/items

{
  "supplier_product_id": "uuid",
  "quantity": 5,
  "notes": "Preferir la marca económica si no hay stock"
}
```

The backend automatically:
- Resolves `supplier_id` from the supplier product
- Snapshots `estimated_unit_cost` from the latest price
- Calculates `estimated_total_cost = quantity × unit_cost`

## Grouping by Supplier

When displaying or exporting, items are grouped by supplier:

```
Distribuidora Norte:
  - Azúcar 1kg × 5 ($1,500 c/u)
  - Harina 000 × 3 ($800 c/u)
  Subtotal: $9,900

Mayorista Sur:
  - Aceite Girasol 1.5L × 2 ($2,200 c/u)
  Subtotal: $4,400

Total estimado: $14,300
```

## WhatsApp Export Format

```
📋 *Lista de Compra: Reposición Marzo*

*Distribuidora Norte:*
• Azúcar 1kg — 5 unidades
• Harina 000 1kg — 3 unidades

*Mayorista Sur:*
• Aceite Girasol 1.5L — 2 unidades

_Generado con PriceHub_
```

Design decisions:
- Use WhatsApp markdown: *bold* for headers, • for items
- Include product name and quantity only (not prices, to avoid confusion with supplier)
- Keep it clean and copy-paste friendly
- Optional: include estimated costs if user toggles it

## Sort Order

Items within each supplier group are sorted by:
1. `sort_order` (if manually set by user via drag-and-drop)
2. Product name (alphabetical, default)

## Quick Add from Product Listing

The product listing page has an "Add to list" action on each product:
1. User clicks "Add to list"
2. Modal shows active purchase lists (draft status)
3. User selects list and enters quantity
4. Item is added

## Estimated Costs

Costs are snapshots, not live:
- `estimated_unit_cost` is captured when the item is added
- If prices change later, the estimate doesn't auto-update
- User can manually refresh estimates via a "Update prices" action on the list
