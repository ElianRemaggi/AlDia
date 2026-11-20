# API Reference — PriceHub

Base URL: `http://localhost:4000/api/v1`

## Convenciones

**Autenticación:** `Authorization: Bearer <accessToken>` en el header.

**Respuesta exitosa:**
```json
{ "status": "success", "data": { ... } }
```

**Respuesta de error:**
```json
{ "status": "error", "message": "descripción del error" }
```

**Paginación** (cuando aplica):
```json
{
  "status": "success",
  "data": [...],
  "meta": { "total": 45, "page": 1, "limit": 20, "totalPages": 3 }
}
```

---

## Auth

| Método | Ruta | Auth | Rol |
|--------|------|------|-----|
| POST | `/auth/login` | — | — |
| POST | `/auth/register` | Bearer | admin (equivale a `POST /admin/users`) |
| POST | `/auth/refresh` | Cookie | — |
| POST | `/auth/logout` | Bearer | — |
| GET  | `/auth/me` | Bearer | — |

---

### POST `/auth/login`

```json
// Request
{
  "email": "user@example.com",
  "password": "secret123"
}

// Response 200
{
  "status": "success",
  "data": {
    "accessToken": "<jwt>",
    "user": {
      "id": "uuid",
      "name": "Nombre",
      "email": "user@example.com",
      "role": "commerce",
      "commerceId": "uuid"
    }
  }
}
```

El `refreshToken` se setea como cookie `httpOnly` con `path=/api/v1/auth/refresh`.

---

### POST `/auth/register` — admin only

```json
// Request
{
  "name": "Nombre Apellido",
  "email": "user@example.com",
  "password": "minimo6chars",
  "role": "commerce",         // "admin" | "commerce"
  "commerceId": "uuid"        // requerido si role = "commerce" (ver reglas en Admin Users)
}

// Response 201
{
  "status": "success",
  "data": { "id": "uuid", "name": "...", "email": "...", "role": "commerce", "commerceId": "uuid" }
}
```

---

### POST `/auth/refresh`

Usa la cookie `refreshToken` (no requiere header). Devuelve un nuevo `accessToken`.

```json
// Response 200
{
  "status": "success",
  "data": { "accessToken": "<nuevo jwt>" }
}
```

---

### POST `/auth/logout`

Limpia la cookie `refreshToken`. No tiene body.

```json
// Response 200
{ "status": "success", "message": "Logged out" }
```

---

### GET `/auth/me`

```json
// Response 200
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Nombre",
    "email": "user@example.com",
    "role": "commerce",
    "commerceId": "uuid",
    "isActive": true
  }
}
```

---

## Commerces

Todos los endpoints requieren rol `admin`. En el frontend, estas operaciones estarán disponibles en el **Admin Panel** (`/admin/commerces`), visible únicamente para usuarios con rol `admin`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/commerces` | Listar todos los commerces |
| POST   | `/commerces` | Crear commerce |
| GET    | `/commerces/:id` | Obtener commerce por ID |
| PATCH  | `/commerces/:id` | Actualizar commerce |

---

### GET `/commerces`

```json
// Response 200
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Almacén Don Pedro",
      "identifier": "ADP-001",
      "email": "contacto@almacen.com",
      "phone": "+54 9 11 1234-5678",
      "isActive": true,
      "createdAt": "2026-03-01T00:00:00Z",
      "updatedAt": "2026-03-01T00:00:00Z"
    }
  ]
}
```

---

### POST `/commerces`

```json
// Request
{
  "name": "Almacén Don Pedro",         // requerido
  "identifier": "ADP-001",             // opcional, único
  "email": "contacto@almacen.com",     // opcional
  "phone": "+54 9 11 1234-5678"        // opcional
}

// Response 201
{ "status": "success", "data": { ...commerce } }
```

---

### GET `/commerces/:id`

```json
// Response 200
{ "status": "success", "data": { ...commerce } }
// Response 404
{ "status": "error", "message": "Commerce not found" }
```

---

### PATCH `/commerces/:id`

Todos los campos son opcionales.

```json
// Request
{
  "name": "Nuevo Nombre",
  "identifier": "NUEVO-ID",
  "email": "nuevo@email.com",
  "phone": "+54 9 11 0000-0000",
  "isActive": false
}

// Response 200
{ "status": "success", "data": { ...commerce actualizado } }
```

---

## Admin Users

Todos los endpoints requieren rol `admin`. Montados en `/admin/users`. Las respuestas nunca incluyen `passwordHash`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/admin/users` | Listar usuarios (paginado, filtros) |
| POST   | `/admin/users` | Crear usuario |
| GET    | `/admin/users/:id` | Obtener usuario (incluye `commerce`) |
| PATCH  | `/admin/users/:id` | Actualizar usuario |
| DELETE | `/admin/users/:id` | Desactivar usuario (soft delete: `isActive = false`) |

**Reglas (también aplican a `POST /auth/register`):**
- `email` único → `409 Email already in use`
- `role = "commerce"` requiere `commerceId` de un commerce existente (`422`) y sin otro usuario activo (`409 Commerce already has an active user` — MVP: un usuario por commerce)
- `role = "admin"` → `commerceId` siempre `null`
- Un admin no puede desactivarse ni cambiarse el rol a sí mismo (`422`)
- Reactivar un usuario (`isActive: true`) vuelve a validar que su commerce no tenga otro usuario activo

---

### GET `/admin/users`

**Query params:** `page` (default 1), `limit` (default 20, max 100), `role` (`admin` | `commerce`), `commerceId`, `search` (nombre o email, ILIKE), `isActive` (`true` | `false`). Parámetros inválidos → `400`.

```json
// Response 200
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Ana Pérez",
      "email": "ana@almacen.com",
      "role": "commerce",
      "commerceId": "uuid",
      "isActive": true,
      "createdAt": "2026-03-01T00:00:00Z",
      "updatedAt": "2026-03-01T00:00:00Z",
      "commerce": { "id": "uuid", "name": "Almacén Don Pedro", "...": "..." }
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### POST `/admin/users`

Mismo body que `POST /auth/register`. Response `201` con el usuario creado.

---

### PATCH `/admin/users/:id`

Todos los campos son opcionales, pero el body no puede estar vacío (`400`). `password` se re-hashea.

```json
// Request
{
  "name": "Ana P.",
  "email": "ana@nuevo.com",
  "password": "nueva123",
  "role": "commerce",
  "commerceId": "uuid",
  "isActive": true
}

// Response 200
{ "status": "success", "data": { ...usuario actualizado } }
```

---

### DELETE `/admin/users/:id`

Soft delete. Response `200` con el usuario (`isActive: false`). El usuario ya no puede hacer login ni refrescar su token; un access token emitido antes sigue siendo válido hasta que expire (15 min).

---

## Suppliers

Todos los endpoints requieren autenticación. Las operaciones se filtran automáticamente por `commerceId` del usuario autenticado.

Los admins pueden operar sobre cualquier commerce usando `?commerce_id=<uuid>`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/suppliers` | Listar proveedores |
| POST   | `/suppliers` | Crear proveedor |
| GET    | `/suppliers/:id` | Obtener proveedor por ID |
| PATCH  | `/suppliers/:id` | Actualizar proveedor |
| DELETE | `/suppliers/:id` | Desactivar proveedor (soft delete) |

---

### GET `/suppliers`

**Query params:**

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `page` | number | 1 | Página |
| `limit` | number | 20 | Máx 100 |
| `search` | string | — | Busca por nombre (ILIKE) |
| `isActive` | `"true"` \| `"false"` | — | Filtrar por estado |
| `sortBy` | `"name"` \| `"createdAt"` | `"name"` | Campo de orden |
| `sortOrder` | `"ASC"` \| `"DESC"` | `"ASC"` | Dirección |
| `commerce_id` | uuid | — | Solo admins |

```json
// Response 200
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "commerceId": "uuid",
      "name": "Lácteos del Norte",
      "supplierCode": "LDN-01",
      "description": "Proveedor de lácteos",
      "contactName": "Juan López",
      "contactEmail": "juan@lacteos.com",
      "contactPhone": "+54 9 11 5555-0000",
      "isActive": true,
      "createdAt": "2026-03-01T00:00:00Z",
      "updatedAt": "2026-03-01T00:00:00Z"
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### POST `/suppliers`

```json
// Request
{
  "name": "Lácteos del Norte",         // requerido
  "supplierCode": "LDN-01",            // opcional, único por commerce
  "description": "...",                // opcional
  "contactName": "Juan López",         // opcional
  "contactEmail": "juan@lacteos.com",  // opcional
  "contactPhone": "+54 9 11 5555-0000" // opcional
}

// Response 201
{ "status": "success", "data": { ...supplier } }

// Response 409 (supplierCode duplicado)
{ "status": "error", "message": "Supplier code already exists for this commerce" }
```

---

### GET `/suppliers/:id`

```json
// Response 200
{ "status": "success", "data": { ...supplier } }
// Response 404
{ "status": "error", "message": "Supplier not found" }
```

---

### PATCH `/suppliers/:id`

Todos los campos son opcionales.

```json
// Request
{
  "name": "Nuevo Nombre",
  "supplierCode": "NUEVO-001",
  "description": "Nueva descripción",
  "contactName": "Otro Contacto",
  "contactEmail": "otro@email.com",
  "contactPhone": "+54 9 11 0000-0000",
  "isActive": true
}

// Response 200
{ "status": "success", "data": { ...supplier actualizado } }
```

---

### DELETE `/suppliers/:id`

Soft delete: setea `isActive = false`. No elimina el registro.

```json
// Response 200
{ "status": "success", "message": "Supplier deactivated" }
// Response 404
{ "status": "error", "message": "Supplier not found" }
```

---

## Products — campos de precio

`GET /products` y `GET /products/:id` agregan a cada producto:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `unitCost` | string \| null | Costo del proveedor según la última lista procesada |
| `markupPercentage` | number \| null | Markup aplicado, resuelto por precedencia `supplier_product` → `commerce_product` (si el producto está vinculado) → `supplier`. `null` si no hay regla |
| `salePrice` | number \| null | `unitCost × (1 + markupPercentage / 100)`, redondeado a 2 decimales. `null` si falta costo o regla |
| `changePercentage` | string \| null | Último cambio de precio detectado |
| `isFavorite` | boolean | Si el producto está marcado como favorito |

---

## Health Check

### GET `/health`

No requiere autenticación.

```json
// Response 200
{ "status": "ok", "timestamp": "2026-03-12T15:00:00.000Z" }
```

---

---

## Price Lists e Import ✅

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST   | `/suppliers/:supplierId/price-lists/upload` | Bearer | Subir archivo e iniciar importación |
| GET    | `/suppliers/:supplierId/price-lists` | Bearer | Listar price lists del supplier |
| GET    | `/suppliers/:supplierId/price-lists/:id` | Bearer | Detalle de un price list |
| GET    | `/import-jobs/:id` | Bearer | Estado de un job de importación |

---

### POST `/suppliers/:supplierId/price-lists/upload`

Request: `multipart/form-data`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `file` | File | sí | `.xlsx`, `.xls`, `.csv` o `.pdf`. Máx 20MB |
| `effectiveDate` | string `YYYY-MM-DD` | no | Fecha desde cuando rige la lista |
| `notes` | string | no | Nota libre (máx 1000) |
| `priceFormat` | `"decimal_point"` \| `"decimal_comma"` | no | Cómo escribe los precios el archivo (`1,500.50` vs `1.500,50`). Default `decimal_point`. Se pasa al parser como `parserConfig.price_format` |

```json
// Response 202 — aceptado, procesando en background
{
  "status": "success",
  "data": {
    "priceList": { "id": "uuid", "status": "pending", "versionNumber": 3, "sourceType": "excel", "sourceFileName": "lista.xlsx", "...": "..." },
    "importJob": { "id": "uuid", "priceListId": "uuid", "status": "queued", "...": "..." }
  }
}
```

| Error | Status | Mensaje |
|---|---|---|
| Sin archivo | 400 | `File is required` |
| Tipo no soportado | 400 | `Unsupported file type. Allowed: xlsx, xls, csv, pdf` |
| Más de 20MB | 413 | `File too large. Maximum size is 20MB` |
| Proveedor de otro commerce / inexistente | 404 | `Supplier not found` |
| Proveedor inactivo | 422 | `Supplier is inactive. Reactivate it to upload price lists.` |

---

### GET `/suppliers/:supplierId/price-lists`

**Query params:** `page`, `limit`, `status` (`pending` | `processing` | `processed` | `failed` | `partially_processed`), `sortOrder` (default `DESC`)

> No incluye `totalItems`; el resumen de filas de cada importación está en el `import_job` (`metaJson`).

```json
// Response 200
{
  "status": "success",
  "data": [
    {
      "id":             "uuid",
      "supplierId":     "uuid",
      "sourceType":     "excel",
      "sourceFileName": "lista_precios_marzo.xlsx",
      "status":         "processed",
      "versionNumber":  3,
      "effectiveDate":  "2026-03-01",
      "uploadedAt":     "2026-03-12T10:00:00Z",
      "processedAt":    "2026-03-12T10:00:45Z",
      "notes":          null
    }
  ],
  "meta": { "total": 3, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### GET `/suppliers/:supplierId/price-lists/:id`

```json
// Response 200
{
  "status": "success",
  "data": {
    "id":             "uuid",
    "supplierId":     "uuid",
    "sourceType":     "excel",
    "sourceFileName": "lista_precios_marzo.xlsx",
    "status":         "processed",
    "versionNumber":  3,
    "effectiveDate":  "2026-03-01",
    "uploadedAt":     "2026-03-12T10:00:00Z",
    "processedAt":    "2026-03-12T10:00:45Z",
    "notes":          null,
    "items": [
      {
        "id":                   "uuid",
        "supplierProductId":    "uuid",
        "rawName":              "Leche Entera x 1L",
        "unitCost":             "1500.50",
        "currency":             "ARS",
        "unit":                 "unidad",
        "positionIndex":        0
      }
    ]
  }
}
```

---

### GET `/import-jobs/:id`

Polling del estado de una importación (el frontend consulta cada 2s). `status`: `queued` → `running` → `completed` | `failed`.

```json
// Response 200 — completado
{
  "status": "success",
  "data": {
    "id":           "uuid",
    "priceListId":  "uuid",
    "jobType":      "parse_document",
    "status":       "completed",
    "startedAt":    "2026-03-12T10:00:10Z",
    "finishedAt":   "2026-03-12T10:00:11Z",
    "errorMessage": null,
    "metaJson":     { "parser": "excel", "total_rows": 150, "error_count": 2 }
  }
}

// Response 200 — fallido (errorMessage viene del parser, en inglés)
{ "status": "success", "data": { "id": "uuid", "status": "failed", "errorMessage": "File is not a zip file", "metaJson": null, "...": "..." } }
```

`metaJson` es `null` hasta que el job termina bien. `total_rows` = filas importadas; `error_count` = filas que el parser no pudo leer (la lista queda `partially_processed`).

---

# Document Processor — Python CLI

Ubicación: `services/document-processor/`

El servicio recibe un archivo (Excel o CSV) y devuelve JSON normalizado. En el Paso 3 se conectará a BullMQ; por ahora funciona de forma completamente aislada.

## Uso

```bash
# Parsear archivo (salida compacta)
python main.py <filepath>

# Salida con pretty-print
python main.py <filepath> --pretty

# Con configuración explícita de columnas
python main.py <filepath> --config config.json
```

**Tipos de archivo soportados:** `.xlsx`, `.xls`, `.csv`

---

## Formato de salida (ParseResult)

```json
{
  "parser": "excel",
  "version": "1.0.0",
  "source_file": "lista_precios.xlsx",
  "total_rows": 3,
  "rows": [
    {
      "position_index": 0,
      "raw_name": "Leche Entera x 1L",
      "supplier_product_code": "LAC-001",
      "unit": "unidad",
      "unit_cost": 1500.50,
      "currency": "ARS",
      "brand": null,
      "category": null
    }
  ],
  "errors": [
    { "row": 5, "reason": "price missing or unparseable" }
  ]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `parser` | string | `"excel"`, `"csv"`, `"pdf"` (tablas) o `"pdf_llm"` (extracción con IA) |
| `version` | string | Versión del parser |
| `source_file` | string | Nombre del archivo de origen |
| `total_rows` | number | Cantidad de filas parseadas exitosamente |
| `rows` | array | Filas normalizadas |
| `errors` | array | Filas que no pudieron parsearse (no fatales) |

---

## Campos de cada fila (`rows[n]`)

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `position_index` | number | sí | Posición 0-based en el archivo |
| `raw_name` | string | sí | Nombre del producto tal como viene en la fuente |
| `unit_cost` | float | sí | Precio unitario normalizado |
| `currency` | string | sí | Siempre `"ARS"` en MVP |
| `supplier_product_code` | string \| null | no | Código del proveedor |
| `unit` | string \| null | no | Unidad de medida (ej: `"kg"`, `"unidad"`) |
| `brand` | string \| null | no | Marca |
| `category` | string \| null | no | Categoría |

---

## Archivo de configuración (`--config config.json`)

Todos los campos son opcionales. Si se omiten, el parser los auto-detecta.

```json
{
  "header_row": 0,
  "column_mapping": {
    "code":     "A",
    "name":     "B",
    "unit":     "C",
    "price":    "D",
    "brand":    "E",
    "category": "F"
  },
  "skip_rows": [1, 2],
  "price_format": "decimal_comma",
  "encoding": "utf-8"
}
```

| Campo | Valores | Default | Descripción |
|-------|---------|---------|-------------|
| `header_row` | number | auto-detect | Índice 0-based de la fila de encabezados |
| `column_mapping` | object | auto-detect | Mapeo de campo → letra de columna o nombre de header |
| `skip_rows` | number[] | `[]` | Índices de filas a ignorar |
| `price_format` | `"decimal_point"` \| `"decimal_comma"` | `"decimal_point"` | Formato de números (`"decimal_comma"` para `1.500,50`) |
| `encoding` | string | `"utf-8"` | Encoding del CSV (solo aplica a CSV) |

---

## Auto-detección de columnas

Cuando no se provee `column_mapping`, el parser escanea la fila de headers y busca coincidencias con estas palabras clave:

| Campo | Palabras clave reconocidas |
|-------|---------------------------|
| `code` | código, cod, code, sku, ref, referencia, articulo |
| `name` | nombre, descripcion, producto, name, description, detalle, item |
| `price` | precio, price, costo, cost, pvp, importe, valor, unitario |
| `unit` | unidad, unit, um, medida, presentacion, pack, bulto |
| `brand` | marca, brand, fabricante, manufacturer |
| `category` | categoria, category, rubro, tipo, familia |

---

## Formatos de precio soportados

| Entrada | `price_format` | Resultado |
|---------|---------------|-----------|
| `"1500.50"` | `decimal_point` | `1500.50` |
| `"1,500.50"` | `decimal_point` | `1500.50` |
| `"$1,500.50"` | `decimal_point` | `1500.50` |
| `"1.500,50"` | `decimal_comma` | `1500.50` |
| `"$ 1.500,50"` | `decimal_comma` | `1500.50` |
| `"1500,5"` | `decimal_comma` | `1500.50` |
| `1500` (int/float) | cualquiera | `1500.00` |

---

## Códigos de salida CLI

| Código | Descripción |
|--------|-------------|
| `0` | Éxito |
| `1` | Error de input (archivo no encontrado, tipo no soportado) |
| `2` | Error inesperado durante el parsing |
