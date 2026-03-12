# Feature: Markup Rules

## Overview

Commerces define markup percentages to calculate sale prices from supplier costs. Markup can be applied at different scopes with a clear precedence hierarchy.

## Scope Types

| Scope | Description | Example |
|-------|-------------|---------|
| `supplier` | All products from a supplier | "30% markup on everything from Distribuidora Norte" |
| `supplier_product` | Specific supplier product | "50% markup on Coca-Cola 2L from Distribuidora Norte" |
| `commerce_product` | Internal product (all linked suppliers) | "40% markup on my internal 'Azúcar 1kg'" |

## Precedence (most specific wins)

```
1. supplier_product  (highest priority)
2. commerce_product
3. supplier          (lowest priority — default)
```

If no rule matches at any level, the sale price is not calculated (shown as N/A or just the cost).

## Calculation

```
sale_price = unit_cost × (1 + markup_percentage / 100)
```

Example:
- unit_cost = $1,000
- markup_percentage = 30%
- sale_price = $1,000 × 1.30 = $1,300

## Bulk Update

Endpoint: `POST /markup-rules/bulk-update`

Allows setting the same markup for all products of a supplier at once:

```json
{
  "supplier_id": "uuid",
  "markup_percentage": 30.00
}
```

This creates or updates a single `markup_rules` record with `scope_type = 'supplier'`.

Individual product overrides remain unaffected and continue to take precedence.

## Resolution Logic (Service Layer)

```typescript
async function getMarkupForProduct(
  commerceId: string,
  supplierProductId: string,
  commerceProductId?: string,
  supplierId: string
): Promise<number | null> {
  // 1. Check supplier_product specific rule
  const productRule = await findRule({
    commerce_id: commerceId,
    scope_type: 'supplier_product',
    supplier_product_id: supplierProductId,
    is_active: true
  });
  if (productRule) return productRule.markup_percentage;

  // 2. Check commerce_product rule (if linked)
  if (commerceProductId) {
    const commerceRule = await findRule({
      commerce_id: commerceId,
      scope_type: 'commerce_product',
      commerce_product_id: commerceProductId,
      is_active: true
    });
    if (commerceRule) return commerceRule.markup_percentage;
  }

  // 3. Check supplier-wide rule
  const supplierRule = await findRule({
    commerce_id: commerceId,
    scope_type: 'supplier',
    supplier_id: supplierId,
    is_active: true
  });
  if (supplierRule) return supplierRule.markup_percentage;

  return null; // No markup defined
}
```

## UI Behavior

- Product listing shows: cost price, markup %, sale price
- Markup column is editable inline (creates/updates `supplier_product` scope rule)
- Supplier settings page has a "default markup" field (creates/updates `supplier` scope rule)
- Visual indicator when a product uses a specific override vs supplier default
