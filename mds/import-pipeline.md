# Feature: Import Pipeline

## Overview

The import pipeline is the core feature. It takes a file (PDF, Excel, CSV, or image), extracts product and price data, saves it as an immutable snapshot, and detects price changes.

## Flow

```
User uploads file
      │
      ▼
[1] Backend receives file (multer)
      │
      ▼
[2] File saved to Cloud Storage
      │
      ▼
[3] price_list record created (status: pending)
      │
      ▼
[4] import_job created (type: parse_document, status: queued)
      │
      ▼
[5] Job enqueued in BullMQ
      │
      ▼
[6] Python worker picks up job
      │
      ├── Determines file type
      ├── Selects appropriate parser
      ├── Extracts rows: [{ name, code, price, unit, ... }]
      ├── Saves raw output to import_parse_results
      │
      ▼
[7] Normalized data sent back to Node backend
      │
      ▼
[8] Backend processes normalized data:
      ├── Match rows to existing supplier_products (by code or name)
      ├── Create new supplier_products for unmatched rows
      ├── Create price_list_items (immutable)
      │
      ▼
[9] Change detection:
      ├── Find previous price_list for same supplier
      ├── Compare prices: old vs new
      ├── Create price_change_events for differences
      │
      ▼
[10] Notification generation:
      ├── Check if changed products are favorites
      ├── Create notifications for affected users
      │
      ▼
[11] Update price_list status → processed
      Update import_job status → completed
```

## File Types and Parsers

### Excel / CSV (Priority: HIGH — most reliable)
- Library: pandas + openpyxl (Python)
- Strategy: detect header row, map columns to fields
- Expected columns: product code, name, price (at minimum)
- Configurable column mapping per supplier

### PDF — Text-based (Priority: HIGH)
- Library: pdfplumber (Python)
- Strategy: extract tables from PDF, parse rows
- Handles: standard table layouts, multi-page documents
- Challenge: column alignment detection

### PDF — Scanned / Mixed (Priority: LOW for MVP)
- Library: pytesseract + Pillow
- Strategy: OCR to text, then parse
- Lower accuracy, requires post-processing
- Deferred to Phase 2

### Image (Priority: LOW for MVP)
- Same OCR pipeline as scanned PDFs
- Deferred to Phase 2

## Parser Configuration

For MVP, parser rules can be hardcoded per supplier. Structure for future configurability:

```json
{
  "supplier_id": "uuid",
  "parser_type": "excel",
  "config": {
    "header_row": 0,
    "column_mapping": {
      "code": "A",
      "name": "B",
      "unit": "C",
      "price": "D"
    },
    "skip_rows": [0],
    "price_format": "decimal_comma",
    "encoding": "utf-8"
  }
}
```

## Product Matching Logic

When processing extracted rows:

1. **By supplier_product_code** (most reliable):
   - If extracted row has a code, search `supplier_products` by `(supplier_id, supplier_product_code)`
   - If match found → link `price_list_item` to existing product

2. **By name** (fallback):
   - Exact match first
   - Normalized match (lowercase, trim, remove extra spaces)
   - If no match → create new `supplier_product`

3. **Unmatched rows:**
   - Create new `supplier_product` from extracted data
   - Mark in `price_list_item.raw_name` for user review

## Change Detection

```
For each item in new price_list:
  Find the same supplier_product in the previous price_list
  If found:
    old_price = previous item's unit_cost
    new_price = current item's unit_cost
    If old_price != new_price:
      change_pct = ((new_price - old_price) / old_price) * 100
      Create price_change_event
  If not found:
    This is a new product (no change event)
```

## Error Handling

- **File too large:** Reject at upload (max 20MB for MVP)
- **Invalid file type:** Return 400 with supported types list
- **Parser failure:** Set price_list status to `failed`, log error in import_job
- **Partial failure:** Some rows parsed, others failed → status `partially_processed`
- **Timeout:** BullMQ job timeout at 5 minutes, auto-retry once

## Status Tracking

Frontend can poll `GET /import-jobs/:id` for status updates:

```json
{
  "id": "uuid",
  "status": "running",
  "job_type": "parse_document",
  "started_at": "2026-03-01T10:00:00Z",
  "meta_json": {
    "total_rows": 150,
    "processed_rows": 87,
    "progress_percentage": 58
  }
}
```

## BullMQ Configuration

```typescript
// Queue name: 'document-processing'
// Concurrency: 2 jobs at a time
// Retry: 1 retry with exponential backoff
// Timeout: 300000ms (5 min)
// Remove completed jobs after 24h
// Remove failed jobs after 7 days
```
