# API Endpoints

## Base URL

```
/api/v1
```

## Authentication

All protected routes require `Authorization: Bearer <access_token>` header.

### Auth

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/register` | Register new user (admin only) | Admin |
| POST | `/auth/login` | Login, returns access + refresh tokens | Public |
| POST | `/auth/refresh` | Refresh access token | Public (cookie) |
| POST | `/auth/logout` | Invalidate refresh token | Authenticated |
| GET | `/auth/me` | Get current user profile | Authenticated |
| PATCH | `/auth/me` | Update current user profile | Authenticated |
| PATCH | `/auth/me/password` | Change password | Authenticated |

---

## Admin Routes

### Users Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | List all users (filterable by commerce, role) |
| POST | `/admin/users` | Create user |
| GET | `/admin/users/:id` | Get user details |
| PATCH | `/admin/users/:id` | Update user |
| DELETE | `/admin/users/:id` | Deactivate user (soft delete) |

### Commerces Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/commerces` | List all commerces |
| POST | `/admin/commerces` | Create commerce |
| GET | `/admin/commerces/:id` | Get commerce details |
| PATCH | `/admin/commerces/:id` | Update commerce |
| DELETE | `/admin/commerces/:id` | Deactivate commerce (soft delete) |

---

## Commerce Routes

All commerce routes are scoped to the authenticated user's `commerce_id`.

### Suppliers

| Method | Path | Description |
|--------|------|-------------|
| GET | `/suppliers` | List suppliers |
| POST | `/suppliers` | Create supplier |
| GET | `/suppliers/:id` | Get supplier details |
| PATCH | `/suppliers/:id` | Update supplier |
| DELETE | `/suppliers/:id` | Deactivate supplier |

**Query params for GET `/suppliers`:** `search`, `is_active`, `page`, `limit`, `sort_by`, `sort_order`

### Supplier Products

| Method | Path | Description |
|--------|------|-------------|
| GET | `/suppliers/:supplierId/products` | List products of a supplier |
| POST | `/suppliers/:supplierId/products` | Create product manually |
| GET | `/suppliers/:supplierId/products/:id` | Get product details with price history |
| PATCH | `/suppliers/:supplierId/products/:id` | Update product metadata |
| DELETE | `/suppliers/:supplierId/products/:id` | Deactivate product |

**Query params for GET:** `search`, `is_active`, `has_price_change`, `page`, `limit`

### Price Lists

| Method | Path | Description |
|--------|------|-------------|
| GET | `/suppliers/:supplierId/price-lists` | List price lists for a supplier |
| POST | `/suppliers/:supplierId/price-lists/upload` | Upload file and start import |
| GET | `/suppliers/:supplierId/price-lists/:id` | Get price list details + items |
| GET | `/suppliers/:supplierId/price-lists/:id/items` | Get items with pagination |
| POST | `/suppliers/:supplierId/price-lists/:id/reprocess` | Re-trigger processing |

**Upload request:** `multipart/form-data` with fields: `file`, `effective_date` (optional), `notes` (optional)

**Upload response:**
```json
{
  "id": "uuid",
  "status": "pending",
  "source_type": "pdf",
  "source_file_name": "lista-marzo.pdf",
  "version_number": 3,
  "message": "File uploaded. Processing started."
}
```

### Import Jobs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/import-jobs` | List recent import jobs |
| GET | `/import-jobs/:id` | Get job status and details |

### Products (Cross-supplier view)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | List all supplier products across all suppliers |
| GET | `/products/favorites` | List favorite products only |
| POST | `/products/:id/favorite` | Mark as favorite |
| DELETE | `/products/:id/favorite` | Remove from favorites |
| GET | `/products/:id/price-history` | Get price history for a product |
| GET | `/products/:id/changes` | Get price change events |

**Query params for GET `/products`:**
- `search` — Name or code search
- `supplier_id` — Filter by supplier
- `category` — Filter by category
- `is_favorite` — Boolean filter
- `has_recent_change` — Products with changes in last import
- `min_price`, `max_price` — Price range
- `sort_by` — name, price, change_percentage, supplier
- `sort_order` — asc, desc
- `page`, `limit`

**Response includes computed fields:**
```json
{
  "id": "uuid",
  "name": "Azúcar Común x 1kg",
  "supplier": { "id": "uuid", "name": "Distribuidora Norte" },
  "current_price": 1500.00,
  "previous_price": 1200.00,
  "change_percentage": 25.00,
  "is_favorite": true,
  "markup_percentage": 30.00,
  "sale_price": 1950.00,
  "last_updated": "2026-03-01T10:00:00Z"
}
```

### Commerce Products (Internal Catalog)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/commerce-products` | List internal products |
| POST | `/commerce-products` | Create internal product |
| GET | `/commerce-products/:id` | Get with linked supplier products |
| PATCH | `/commerce-products/:id` | Update internal product |
| DELETE | `/commerce-products/:id` | Deactivate |
| POST | `/commerce-products/:id/links` | Link supplier product |
| DELETE | `/commerce-products/:id/links/:linkId` | Unlink supplier product |

### Markup Rules

| Method | Path | Description |
|--------|------|-------------|
| GET | `/markup-rules` | List all markup rules |
| POST | `/markup-rules` | Create markup rule |
| PATCH | `/markup-rules/:id` | Update markup rule |
| DELETE | `/markup-rules/:id` | Delete markup rule |
| POST | `/markup-rules/bulk-update` | Update all products of a supplier |

**Request body for bulk update:**
```json
{
  "supplier_id": "uuid",
  "markup_percentage": 30.00
}
```

### Purchase Lists

| Method | Path | Description |
|--------|------|-------------|
| GET | `/purchase-lists` | List purchase lists |
| POST | `/purchase-lists` | Create purchase list |
| GET | `/purchase-lists/:id` | Get list with items |
| PATCH | `/purchase-lists/:id` | Update list metadata |
| DELETE | `/purchase-lists/:id` | Delete list (only drafts) |
| POST | `/purchase-lists/:id/items` | Add item to list |
| PATCH | `/purchase-lists/:id/items/:itemId` | Update item (quantity, notes) |
| DELETE | `/purchase-lists/:id/items/:itemId` | Remove item |
| GET | `/purchase-lists/:id/export/whatsapp` | Export as WhatsApp text |
| PATCH | `/purchase-lists/:id/status` | Change status (draft→exported→archived) |

**WhatsApp export response:**
```json
{
  "text": "📋 *Lista de Compra: Marzo 2026*\n\n*Distribuidora Norte:*\n• Azúcar x 1kg — 5 unidades\n• Harina 000 x 1kg — 3 unidades\n\n*Mayorista Sur:*\n• Aceite Girasol x 1.5L — 2 unidades\n..."
}
```

### Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications` | List notifications (paginated) |
| GET | `/notifications/unread-count` | Get unread count |
| PATCH | `/notifications/:id/read` | Mark as read |
| POST | `/notifications/mark-all-read` | Mark all as read |

### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/summary` | Overview: recent imports, active suppliers, product count |
| GET | `/dashboard/recent-changes` | Top price changes (last 7 days) |
| GET | `/dashboard/import-activity` | Import history chart data |

---

## Common Response Patterns

### Pagination
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      { "field": "email", "message": "Must be a valid email address" }
    ]
  }
}
```

### HTTP Status Codes
- `200` — Success
- `201` — Created
- `204` — No content (successful delete)
- `400` — Validation error
- `401` — Unauthorized
- `403` — Forbidden (wrong role/commerce)
- `404` — Not found
- `409` — Conflict (duplicate)
- `422` — Unprocessable entity
- `500` — Internal server error
