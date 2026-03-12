# Feature: Dashboard

## Overview

Landing page after login for commerce users. Provides a quick overview of recent activity, price changes, and key metrics.

## Sections

### 1. Summary Cards

| Card | Value | Source |
|------|-------|--------|
| Active Suppliers | Count of active suppliers | `suppliers WHERE is_active = true` |
| Total Products | Count of tracked supplier products | `supplier_products WHERE is_active = true` |
| Recent Imports | Imports in last 7 days | `price_lists WHERE uploaded_at > 7 days ago` |
| Pending Imports | Imports still processing | `price_lists WHERE status IN ('pending', 'processing')` |

### 2. Recent Price Changes

Table showing the biggest recent changes:

| Column | Description |
|--------|-------------|
| Product | supplier_product name |
| Supplier | Supplier name |
| Previous Price | old_price |
| Current Price | new_price |
| Change % | change_percentage (color coded: red for increase, green for decrease) |
| Date | created_at of change event |

Default: Top 10 changes sorted by `abs(change_percentage) DESC` from last 30 days.

### 3. Recent Import Activity

Timeline or list of last 5 imports:
- Supplier name
- File name
- Status (with color indicator)
- Products processed count
- Date
- Quick link to view details

### 4. Favorite Price Alerts

If any favorite products changed price recently:
- Product name
- Old → New price
- Change %
- Link to product detail

### 5. Quick Actions

Buttons/cards for common tasks:
- "Upload new price list"
- "View all products"
- "My purchase lists"
- "View notifications"

## API Endpoint

```
GET /dashboard/summary

Response:
{
  "stats": {
    "active_suppliers": 8,
    "total_products": 1247,
    "recent_imports": 3,
    "pending_imports": 1
  },
  "recent_changes": [...],     // Top 10 price changes
  "recent_imports": [...],      // Last 5 imports
  "favorite_alerts": [...]      // Changed favorites
}
```

## Admin Dashboard (separate)

For admin users, a different dashboard:
- Total commerces (active/inactive)
- Total users
- System-wide import stats
- Recent failed imports across all commerces
- Platform usage metrics
