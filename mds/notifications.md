# Feature: Notifications

## Overview

In-app notification system. No email, SMS, or push notifications for MVP. Notifications alert users about price changes, import results, and changes to favorite products.

## Notification Types

| Type | Trigger | Example |
|------|---------|---------|
| `price_change` | Price change detected after import | "15 productos cambiaron de precio en la lista de Distribuidora Norte" |
| `favorite_price_change` | Favorite product price changed | "Azúcar 1kg (Dist. Norte) subió 25%: $1,200 → $1,500" |
| `import_finished` | Import completed successfully | "Lista de Distribuidora Norte procesada: 142 productos importados" |
| `import_failed` | Import failed | "Error procesando lista de Mayorista Sur: formato no reconocido" |

## Notification Creation Flow

### After successful import:

```
1. Import completes → create 'import_finished' notification

2. Change detection runs:
   For each price_change_event:
     Check if supplier_product is a favorite
     If yes → create 'favorite_price_change' notification

3. If any price changes detected:
   Create summary 'price_change' notification
   "X productos cambiaron en [Supplier Name]"
```

### After failed import:

```
1. Import fails → create 'import_failed' notification with error details
```

## Notification Grouping

To avoid flooding:
- Summary notification per import (e.g., "15 products changed")
- Individual notifications only for favorites
- Maximum 20 individual notifications per import event
- If more than 20 favorites changed, group them: "20+ favoritos cambiaron de precio"

## Data Model

```
notifications:
  id, commerce_id, user_id, type, title, message,
  is_read, reference_type, reference_id, created_at, read_at
```

`reference_type` + `reference_id` enable deep linking:
- Click notification → navigate to the referenced entity
- Examples: `supplier_product:uuid`, `price_list:uuid`, `purchase_list:uuid`

## API

| Endpoint | Description |
|----------|-------------|
| `GET /notifications` | Paginated list, newest first. Filter by `is_read`, `type` |
| `GET /notifications/unread-count` | Returns `{ count: 5 }` |
| `PATCH /notifications/:id/read` | Mark single notification as read |
| `POST /notifications/mark-all-read` | Mark all as read |

## UI Integration

- Bell icon in navigation bar with unread count badge
- Dropdown panel showing recent notifications
- Click notification → navigate to relevant page
- "Mark all as read" button
- Notification center page with full history and filters

## Polling Strategy (MVP)

For MVP, use polling instead of WebSockets:
- Poll `GET /notifications/unread-count` every 30 seconds
- Full notification list loaded on panel open
- Future: upgrade to WebSocket/SSE for real-time updates
