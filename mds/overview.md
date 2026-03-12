# Architecture Overview

## System Architecture

PriceHub follows a modular monolith approach for the MVP, with a clear separation that allows extracting microservices later if needed.

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │   Auth    │ │ Catalog  │ │ Purchase │ │ Dashboard  │ │
│  │  Pages    │ │  Views   │ │  Lists   │ │  & Alerts  │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
└───────────────────────┬─────────────────────────────────┘
                        │ REST API (JSON)
┌───────────────────────┴─────────────────────────────────┐
│                   BACKEND (Express.js)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │   Auth   │ │ Catalog  │ │ Purchase │ │Notification│ │
│  │  Module  │ │  Module  │ │  Module  │ │   Module   │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│  ┌──────────────────────────────────────────────────────┐│
│  │              Import Pipeline Controller               ││
│  └──────────────────────┬───────────────────────────────┘│
└─────────────────────────┼───────────────────────────────┘
                          │ BullMQ Job Queue
┌─────────────────────────┴───────────────────────────────┐
│            DOCUMENT PROCESSOR (Python)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │   PDF    │ │  Excel   │ │  Image   │ │  Change    │ │
│  │  Parser  │ │  Parser  │ │  Parser  │ │  Detector  │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐
│  PostgreSQL │  │    Redis     │  │  Google Cloud Storage│
│  (data)     │  │  (queues)    │  │  (files)             │
└─────────────┘  └─────────────┘  └─────────────────────┘
```

## Module Responsibilities

### Auth Module
- JWT-based authentication (access + refresh tokens)
- Role-based access control: `admin`, `commerce`
- Middleware for route protection
- Password hashing with bcrypt

### Catalog Module
- CRUD for suppliers and supplier products
- Commerce product management (internal catalog)
- Product linking between commerce and supplier products
- Favorites management
- Filtering and search across products

### Import Pipeline
- File upload handling (PDF, Excel, CSV, images)
- Job creation and status tracking via BullMQ
- Communication with Python document processor
- Change detection: compares new prices against last known prices
- Price history recording
- Event emission for notifications

### Purchase Module
- Create/edit purchase lists (draft, exported, archived)
- Add items with quantities
- Group by supplier
- Export to WhatsApp-friendly text format

### Notification Module
- Internal notifications (in-app only, no email/SMS for MVP)
- Triggered by price change events
- Read/unread tracking
- Notification types: price_change, favorite_price_change, import_finished, import_failed

### Document Processor (Python)
- PDF text extraction (pdfplumber, PyMuPDF)
- OCR for scanned/mixed PDFs (Tesseract)
- Excel/CSV parsing (pandas, openpyxl)
- Configurable parser rules per supplier
- Outputs normalized JSON with product data

## Data Flow: Price List Import

```
1. User uploads file (PDF/Excel/CSV/Image)
       │
2. Backend saves file to Cloud Storage
       │
3. Backend creates price_list record (status: pending)
       │
4. Backend enqueues import job in BullMQ
       │
5. Python processor picks up job
       │
6. Parser extracts products + prices
       │
7. Processor returns normalized JSON to backend
       │
8. Backend creates price_list_items (immutable snapshot)
       │
9. Backend runs change detection:
   ├── Compares against previous price_list for same supplier
   ├── Creates price_change_events for differences
   └── Emits notifications for affected favorites
       │
10. price_list status → processed
```

## Multi-tenancy Model

- **Tenant = Commerce.** All data is scoped by `commerce_id`.
- Suppliers are NOT shared between commerces. Each commerce maintains its own supplier records.
- Admin users have cross-commerce visibility for platform management.
- Row-level filtering via `commerce_id` on all queries. Enforced at the service layer.

## Key Architectural Decisions

1. **Immutable price lists:** Each import creates new records. No overwriting. This guarantees audit trail and historical accuracy.
2. **Two-layer catalog:** Supplier products (source data) vs Commerce products (business data). Keeps imported data clean.
3. **Python for document processing:** Better ecosystem for PDF/OCR (pdfplumber, Tesseract, pandas). Communicates with Node backend via BullMQ.
4. **BullMQ for async processing:** File parsing can be slow. Queue-based processing prevents blocking the API and allows retries.
5. **Monorepo structure:** Shared types between frontend and backend reduce drift. Single repo simplifies CI/CD for MVP.
