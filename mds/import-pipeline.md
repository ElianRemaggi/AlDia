# Feature: Import Pipeline (Paso 3)

## Visión general

El pipeline de importación es el núcleo del producto. Toma un archivo subido por el usuario, lo parsea con el Document Processor Python, guarda los precios como snapshot inmutable y detecta cambios.

**Piezas involucradas:**
- `apps/api` — recibe el archivo, crea registros DB, encola el job, procesa el resultado
- `services/document-processor` — parsea el archivo, devuelve JSON normalizado vía BullMQ
- Redis — bus de mensajes entre API y Python
- PostgreSQL — persistencia final

---

## Flujo completo

```
[1] POST /suppliers/:id/price-lists/upload (multipart/form-data)
      │  multer valida tipo y tamaño (max 20MB)
      ▼
[2] Subir archivo a GCS
      │  key: commerces/{commerceId}/suppliers/{supplierId}/{priceListId}/{filename}
      ▼
[3] Crear price_list (status: pending, version_number: MAX+1)
      │
      ▼
[4] Crear import_job (type: parse_document, status: queued)
      │
      ▼
[5] queue.add('parse_document', jobPayload)  ← BullMQ
      │  queue: 'document-processing'
      ▼
[6] Python worker recibe el job
      │  Descarga archivo desde URL firmada GCS
      │  Selecciona parser (excel/csv/pdf) por extensión
      │  Parsea → ParseResult
      │  Guarda raw_output en import_parse_results
      ▼
[7] Python completa el job con returnValue = { status, parseResult }
      │
      ▼
[8] Node Worker event: 'completed'
      │  Recibe ParseResult
      │  Actualiza import_job → running
      ▼
[9] Node procesa ParseResult:
      │  Match rows → supplier_products (por código, luego nombre)
      │  Crea supplier_products nuevos para filas sin match
      │  Inserta price_list_items (INMUTABLES)
      ▼
[10] Detección de cambios:
      │  Busca price_list anterior del mismo supplier
      │  Compara unit_cost por supplier_product_id
      │  Crea price_change_events para diferencias
      ▼
[11] Notificaciones:
      │  Filtra productos favoritos (commerce_product_supplier_links.is_favorite)
      │  Crea notifications para cambios en favoritos
      ▼
[12] Actualizar price_list → processed (o failed/partially_processed)
      Actualizar import_job → completed
      Setear price_list.processed_at = now()
```

---

## Migración necesaria (Paso 3)

La migración inicial solo crea `commerces`, `users`, `suppliers`. Para el Paso 3 se necesita una segunda migración con estas tablas:

```bash
pnpm --filter api migration:generate -- src/shared/database/migrations/ImportPipeline
```

Tablas a crear en orden (respetando FK):

1. `supplier_products`
2. `price_lists` (enums: source_type, status)
3. `price_list_items`
4. `price_change_events`
5. `import_jobs` (enum: job_type, job_status)
6. `import_parse_results`

Enums nuevos:
```sql
CREATE TYPE "price_list_source_type_enum" AS ENUM ('pdf', 'csv', 'excel', 'manual', 'image');
CREATE TYPE "price_list_status_enum"      AS ENUM ('pending', 'processing', 'processed', 'failed', 'partially_processed');
CREATE TYPE "import_job_type_enum"        AS ENUM ('parse_document', 'normalize', 'detect_changes');
CREATE TYPE "import_job_status_enum"      AS ENUM ('queued', 'running', 'completed', 'failed');
```

---

## BullMQ — Configuración Node

```typescript
// apps/api/src/modules/import/import.queue.ts
import { Queue, Worker } from 'bullmq';
import { config } from '../../config';

const connection = {
  host:     config.redis.host,
  port:     config.redis.port,
  password: config.redis.password,
};

export const documentProcessingQueue = new Queue('document-processing', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff:            { type: 'exponential', delay: 5000 },
    removeOnComplete:   { age: 86400 },   // 24h
    removeOnFail:       { age: 604800 },  // 7 días
  },
});

// Node no procesa jobs (Python es el worker), solo escucha eventos
export const documentProcessingWorker = new Worker(
  'document-processing',
  async () => {},
  { connection, autorun: false },
);
```

---

## Payload del Job (Node → Python)

Lo que Node manda al encolar el job:

```typescript
// apps/api/src/modules/import/import.types.ts
export interface ParseDocumentJobData {
  priceListId:   string;   // uuid
  supplierId:    string;   // uuid
  commerceId:    string;   // uuid
  fileUrl:       string;   // URL firmada de GCS (expira en 1h)
  fileName:      string;   // nombre original del archivo
  sourceType:    'excel' | 'csv' | 'pdf';
  parserConfig: {
    header_row:      number | null;
    column_mapping:  Record<string, string> | null;
    skip_rows:       number[];
    price_format:    'decimal_point' | 'decimal_comma';
    encoding:        string;
  };
}
```

Ejemplo concreto:

```json
{
  "priceListId":  "550e8400-e29b-41d4-a716-446655440000",
  "supplierId":   "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "commerceId":   "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "fileUrl":      "https://storage.googleapis.com/pricehub-uploads/commerces/.../lista.xlsx?X-Goog-Signature=...",
  "fileName":     "lista_precios_marzo_2026.xlsx",
  "sourceType":   "excel",
  "parserConfig": {
    "header_row":     null,
    "column_mapping": null,
    "skip_rows":      [],
    "price_format":   "decimal_comma",
    "encoding":       "utf-8"
  }
}
```

---

## Resultado del Job (Python → Node)

Python completa el job retornando este objeto como `returnValue`. BullMQ lo almacena en Redis y Node lo recibe en el evento `completed`.

```python
# services/document-processor/worker/job_handler.py — valor de retorno
{
    "priceListId":  "550e8400-...",
    "status":       "success",   # "success" | "partial" | "failed"
    "errorMessage": None,        # string si status == "failed"
    "parseResult": {
        "parser":      "excel",
        "version":     "1.0.0",
        "source_file": "lista_precios_marzo_2026.xlsx",
        "total_rows":  150,
        "rows": [
            {
                "position_index":        0,
                "raw_name":              "Leche Entera x 1L",
                "supplier_product_code": "LAC-001",
                "unit":                  "unidad",
                "unit_cost":             1500.50,
                "currency":              "ARS",
                "brand":                 null,
                "category":              null
            }
        ],
        "errors": [
            { "row": 5, "reason": "price missing or unparseable" }
        ]
    }
}
```

Regla: `status = "partial"` si `parseResult.errors.length > 0` y `total_rows > 0`.
Regla: `status = "failed"` si `total_rows == 0` o si el parser lanza excepción.

---

## Python Worker (adición al Paso 2)

Agregar al `services/document-processor`:

```
services/document-processor/
├── requirements.txt         ← agregar: bullmq, google-cloud-storage
├── worker/
│   ├── __init__.py
│   ├── bullmq_worker.py     ← conecta a Redis, consume jobs
│   └── job_handler.py       ← descarga GCS, parsea, retorna resultado
└── main.py                  ← CLI sigue funcionando igual (sin cambios)
```

### `worker/bullmq_worker.py`

```python
import asyncio
import os
from bullmq import Worker
from worker.job_handler import handle_job

async def start_worker():
    worker = Worker(
        'document-processing',
        handle_job,
        {
            'connection': {
                'host':     os.getenv('REDIS_HOST', 'localhost'),
                'port':     int(os.getenv('REDIS_PORT', 6379)),
                'password': os.getenv('REDIS_PASSWORD') or None,
            }
        }
    )
    print("Document processor worker started.")
    await worker.waitUntilReady()
    while True:
        await asyncio.sleep(1)

if __name__ == '__main__':
    asyncio.run(start_worker())
```

### `worker/job_handler.py`

```python
import os
import tempfile
import urllib.request
from bullmq import Job
from core.factory import select_parser
from core.models import ParserConfig

async def handle_job(job: Job, job_token: str) -> dict:
    data        = job.data
    price_list_id = data['priceListId']

    local_path = _download(data['fileUrl'], data['fileName'])
    try:
        config = ParserConfig.from_dict(data.get('parserConfig', {}))
        parser = select_parser(local_path, config)
        result = parser.parse(local_path)

        if result.total_rows == 0:
            status = 'failed'
        elif result.errors:
            status = 'partial'
        else:
            status = 'success'

        return {
            'priceListId':  price_list_id,
            'status':       status,
            'parseResult':  result.to_dict(),
            'errorMessage': None,
        }
    except Exception as e:
        return {
            'priceListId':  price_list_id,
            'status':       'failed',
            'parseResult':  None,
            'errorMessage': str(e),
        }
    finally:
        os.unlink(local_path)

def _download(url: str, filename: str) -> str:
    suffix = os.path.splitext(filename)[1]
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    urllib.request.urlretrieve(url, tmp.name)
    return tmp.name
```

---

## Almacenamiento en GCS

**Estructura de keys:**
```
gs://{GCS_BUCKET_NAME}/
└── commerces/
    └── {commerceId}/
        └── suppliers/
            └── {supplierId}/
                └── {priceListId}/
                    └── {originalFilename}
```

**Ejemplo:**
```
gs://pricehub-uploads/commerces/f47ac10b/suppliers/7c9e6679/550e8400/lista_precios_marzo.xlsx
```

**Módulo GCS en Node:**

```typescript
// apps/api/src/shared/storage/gcs.ts
import { Storage } from '@google-cloud/storage';
import { config } from '../../config';

const storage = new Storage({ keyFilename: config.gcs.keyFile });
const bucket  = storage.bucket(config.gcs.bucketName);

export async function uploadFile(
  commerceId:  string,
  supplierId:  string,
  priceListId: string,
  filename:    string,
  buffer:      Buffer,
  mimeType:    string,
): Promise<string> {
  const key  = `commerces/${commerceId}/suppliers/${supplierId}/${priceListId}/${filename}`;
  const file = bucket.file(key);
  await file.save(buffer, { contentType: mimeType });
  return `gs://${config.gcs.bucketName}/${key}`;
}

export async function getSignedUrl(gcsUrl: string, expiresInSeconds = 3600): Promise<string> {
  const key  = gcsUrl.replace(`gs://${config.gcs.bucketName}/`, '');
  const [url] = await bucket.file(key).getSignedUrl({
    action:  'read',
    expires: Date.now() + expiresInSeconds * 1000,
  });
  return url;
}
```

Agregar a `config/index.ts`:
```typescript
gcs: {
  bucketName: process.env.GCS_BUCKET_NAME || '',
  projectId:  process.env.GCS_PROJECT_ID  || '',
  keyFile:    process.env.GCS_KEY_FILE     || '',
},
```

---

## version_number — auto-incremento

Cada `price_list` tiene un `version_number` auto-incremental por supplier:

```typescript
// apps/api/src/modules/import/import.service.ts
const { max } = await priceListRepo()
  .createQueryBuilder('pl')
  .select('MAX(pl.versionNumber)', 'max')
  .where('pl.supplierId = :supplierId', { supplierId })
  .getRawOne();

const versionNumber = (Number(max) || 0) + 1;
```

---

## Node — Procesamiento del resultado (Worker events)

```typescript
// apps/api/src/modules/import/import.worker.ts
documentProcessingWorker.on('completed', async (job, returnValue) => {
  const { priceListId, status, parseResult, errorMessage } = returnValue;

  if (status === 'failed') {
    await setPriceListStatus(priceListId, 'failed');
    await setImportJobStatus(priceListId, 'failed', errorMessage);
    return;
  }

  await saveParseResults(priceListId, parseResult);

  const priceList = await getPriceList(priceListId);
  for (const row of parseResult.rows) {
    const product = await matchOrCreateProduct(
      priceList.supplierId,
      priceList.commerceId,
      row,
    );
    await createPriceListItem(priceListId, product.id, row);
  }

  await detectPriceChanges(priceListId, priceList.supplierId, priceList.commerceId);
  await generateNotifications(priceList.commerceId, priceListId);

  const finalStatus = parseResult.errors.length > 0 ? 'partially_processed' : 'processed';
  await setPriceListStatus(priceListId, finalStatus, new Date());
  await setImportJobStatus(priceListId, 'completed');
});

documentProcessingWorker.on('failed', async (job, error) => {
  if (job) {
    await setPriceListStatus(job.data.priceListId, 'failed');
    await setImportJobStatus(job.data.priceListId, 'failed', error.message);
  }
});
```

---

## Lógica de matching de productos

```typescript
async function matchOrCreateProduct(
  supplierId: string,
  commerceId: string,
  row: ParsedRow,
): Promise<SupplierProduct> {
  // 1. Match por código (más confiable)
  if (row.supplier_product_code) {
    const byCode = await supplierProductRepo().findOne({
      where: { supplierId, supplierProductCode: row.supplier_product_code },
    });
    if (byCode) return byCode;
  }

  // 2. Match por nombre normalizado (fallback)
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const all = await supplierProductRepo().find({ where: { supplierId, isActive: true } });
  const byName = all.find((p) => normalize(p.name) === normalize(row.raw_name));
  if (byName) return byName;

  // 3. Crear nuevo producto
  return supplierProductRepo().save(
    supplierProductRepo().create({
      supplierId,
      commerceId,
      name:                row.raw_name,
      supplierProductCode: row.supplier_product_code ?? null,
      unit:                row.unit ?? null,
      brand:               row.brand ?? null,
      category:            row.category ?? null,
    }),
  );
}
```

---

## Lógica de detección de cambios

```typescript
async function detectPriceChanges(
  newPriceListId: string,
  supplierId:     string,
  commerceId:     string,
): Promise<void> {
  // Price list anterior más reciente con status = processed
  const previous = await priceListRepo()
    .createQueryBuilder('pl')
    .where('pl.supplierId = :supplierId', { supplierId })
    .andWhere('pl.status = :status', { status: 'processed' })
    .andWhere('pl.id != :id', { id: newPriceListId })
    .orderBy('pl.versionNumber', 'DESC')
    .getOne();

  if (!previous) return;  // Primera importación, sin historial

  const [newItems, oldItems] = await Promise.all([
    priceListItemRepo().find({ where: { priceListId: newPriceListId } }),
    priceListItemRepo().find({ where: { priceListId: previous.id } }),
  ]);

  const oldPriceMap = new Map(oldItems.map((i) => [i.supplierProductId, i.unitCost]));

  for (const item of newItems) {
    if (!item.supplierProductId) continue;
    const oldPrice = oldPriceMap.get(item.supplierProductId);
    if (oldPrice === undefined) continue;
    if (Number(item.unitCost) === Number(oldPrice)) continue;

    const changePct =
      ((Number(item.unitCost) - Number(oldPrice)) / Number(oldPrice)) * 100;

    await priceChangeEventRepo().save(
      priceChangeEventRepo().create({
        commerceId,
        supplierId,
        supplierProductId:     item.supplierProductId,
        oldPrice,
        newPrice:              item.unitCost,
        changePercentage:      changePct,
        detectedInPriceListId: newPriceListId,
      }),
    );
  }
}
```

---

## Estructura de módulos Node para Paso 3

```
apps/api/src/modules/
└── import/
    ├── import.routes.ts        ← POST upload, GET price-lists, GET price-list, GET import-job
    ├── import.controller.ts    ← handlers HTTP
    ├── import.service.ts       ← version_number, crear price_list + job, enqueue
    ├── import.worker.ts        ← BullMQ Worker events: completed, failed
    ├── import.queue.ts         ← Queue + Worker instances
    ├── import.processor.ts     ← matchOrCreate, detectChanges, notifications
    ├── import.dto.ts           ← Zod schemas
    └── entities/
        ├── price-list.entity.ts
        ├── price-list-item.entity.ts
        ├── import-job.entity.ts
        ├── import-parse-result.entity.ts
        ├── supplier-product.entity.ts
        └── price-change-event.entity.ts
```

Registrar en `apps/api/src/app.ts`:
```typescript
import importRoutes    from './modules/import/import.routes';
// ...
app.use('/api/v1/suppliers', supplierRoutes);   // ya existe — el upload va como subruta
app.use('/api/v1/import-jobs', importJobRoutes); // nuevo
```

> El upload se monta bajo `/api/v1/suppliers/:supplierId/price-lists/upload`.
> Puede vivir en `import.routes.ts` montado con `mergeParams: true` o directamente en `supplier.routes.ts`.

---

## Manejo de errores

| Escenario | Acción |
|-----------|--------|
| Archivo > 20MB | multer rechaza, `400` |
| Tipo de archivo no soportado | validación en controller, `400` |
| Falla al subir a GCS | no crear `price_list`, devolver `500` |
| Python falla al parsear | `price_list.status = failed`, `import_job.error_message = <detalle>` |
| Filas parcialmente parseadas | `price_list.status = partially_processed` |
| Job timeout (5 min) | BullMQ reintenta 1 vez; si falla → `price_list.status = failed` |
| Redis caído | `queue.add()` lanza error → responder `503` |

---

## Dependencias a agregar

**Node (`apps/api`):**
```bash
pnpm --filter api add bullmq @google-cloud/storage multer
pnpm --filter api add -D @types/multer
```

**Python (`services/document-processor/requirements.txt`):**
```
bullmq>=2.0.0
google-cloud-storage>=2.14.0
```

---

## File Types y Parsers (referencia)

| Tipo | Librería | Estado |
|------|----------|--------|
| Excel (.xlsx, .xls) | openpyxl + pandas | ✅ Implementado (Paso 2) |
| CSV (.csv) | pandas + chardet | ✅ Implementado (Paso 2) |
| PDF con tablas | pdfplumber (`parser: "pdf"`) | ✅ Implementado (Paso 6) |
| PDF sin tablas | pdfplumber + LLM (`parser: "pdf_llm"`) | ✅ Implementado (Paso 6) |
| PDF escaneado | pdf2image + pytesseract → LLM | ⚠️ Best-effort: solo si el container tiene `tesseract-ocr`, `tesseract-ocr-spa` y `poppler-utils` |
| Imágenes | — | Fase 2 (post-MVP) |

### PdfParser (`parsers/pdf_parser.py`)

1. **Tablas (determinista, sin costo):** `pdfplumber.extract_tables()` + la misma detección de header/columnas que Excel. Se descartan headers repetidos por página. El formato de precio (`1.500,50` vs `1,500.50`) se infiere de los valores (`infer_price_format`).
2. **Fallback LLM** (`core/llm_extractor.py`): si no hay tabla con columnas de nombre y precio, o la tabla es mayormente ruido. El texto se parte por líneas (nunca corta una fila), los chunks posteriores reciben las primeras líneas del documento como contexto de columnas, y se procesan en paralelo (`LLM_MAX_WORKERS`). Cualquier API compatible con OpenAI (DeepSeek por defecto, ver `env-vars.md`).
3. **Salvaguardas sobre la respuesta del LLM:**
   - El LLM devuelve `price_text` copiado textualmente; si no aparece en el texto fuente la fila se rechaza (`price not found in source text`). El precio lo normaliza `normalize_price`, nunca el LLM.
   - Códigos que no aparecen en el texto se descartan (`supplier_product_code = null`) para no romper el matching del próximo import. Nunca se generan códigos.
   - Respuestas truncadas, JSON inválido o errores de API se registran en `errors` por chunk → el import queda `partial`.
4. Sin `LLM_API_KEY`, un PDF sin tablas falla con un mensaje claro (los PDFs con tablas funcionan igual).

---

## Parser Configuration (por supplier)

Para MVP las configuraciones pueden hardcodearse. Estructura para futura configurabilidad:

```json
{
  "supplier_id": "uuid",
  "parser_type": "excel",
  "config": {
    "header_row": 0,
    "column_mapping": {
      "code":  "A",
      "name":  "B",
      "unit":  "C",
      "price": "D"
    },
    "skip_rows":    [],
    "price_format": "decimal_comma",
    "encoding":     "utf-8"
  }
}
```
