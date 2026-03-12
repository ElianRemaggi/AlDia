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
| POST | `/auth/register` | Bearer | admin |
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
  "commerceId": "uuid"        // requerido si role = "commerce"
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

## Health Check

### GET `/health`

No requiere autenticación.

```json
// Response 200
{ "status": "ok", "timestamp": "2026-03-12T15:00:00.000Z" }
```

---

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
| `parser` | string | `"excel"` o `"csv"` |
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
