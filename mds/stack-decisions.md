# Stack Decisions

## Technology Choices and Rationale

### Frontend: Next.js + TypeScript + Tailwind CSS

**Why Next.js:**
- Server-side rendering for initial load performance
- File-based routing reduces boilerplate
- API routes available as fallback (though main API is Express)
- Strong TypeScript support
- Easy deployment on Vercel

**Why Tailwind CSS:**
- Utility-first approach speeds up UI development
- Consistent design system without custom CSS files
- Responsive design built-in
- Small production bundle with purging

**UI Component Library:** shadcn/ui (recommended)
- Accessible, composable components
- Built on Radix UI primitives
- Tailwind-native styling
- Copy-paste approach keeps bundle small

**State Management:** React Query (TanStack Query)
- Server state management (caching, refetching, pagination)
- Reduces need for global state libraries for API data
- Automatic background refetching for fresh data
- For local UI state: React useState/useReducer is sufficient

### Backend: Express.js + TypeScript

**Why Express over Next.js API routes:**
- Separation of concerns: frontend deploy != backend deploy
- More control over middleware, error handling, and routing
- Better suited for long-running processes and queue integration
- Easier to scale independently
- Mature ecosystem for auth, validation, file handling

**Project Structure (backend):**
```
apps/api/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.middleware.ts
│   │   │   └── auth.dto.ts
│   │   ├── catalog/
│   │   ├── import/
│   │   ├── purchase/
│   │   └── notification/
│   ├── shared/
│   │   ├── database/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── types/
│   ├── config/
│   └── app.ts
├── tests/
└── package.json
```

### Database: PostgreSQL + TypeORM

**Why PostgreSQL:**
- Robust relational model fits the domain (products, prices, versions)
- JSON/JSONB columns for flexible parser metadata
- Excellent indexing for filtered queries
- Proven at scale for SaaS

**Why TypeORM:**
- TypeScript-native decorators
- Migration system for schema versioning
- Query builder for complex queries
- Active Record and Data Mapper patterns supported

**Alternatives considered:**
- Prisma: Better DX but less flexible for complex queries and raw SQL
- Drizzle: Lighter but less mature migration tooling

### Document Processing: Python Microservice

**Why Python (not Node):**
- pdfplumber, PyMuPDF: best PDF table extraction libraries
- Tesseract OCR bindings (pytesseract) are mature
- pandas for Excel/CSV normalization
- Tabula-py for complex table detection
- ML/NLP libraries available if needed later

**Communication with Node backend:**
- BullMQ job queue via Redis
- Python worker polls queue, processes file, pushes result back
- Alternative: HTTP API between services (simpler but less resilient)

### Queue System: Redis + BullMQ

**Why BullMQ:**
- Reliable job processing with retries and backoff
- Job progress tracking (useful for UI progress bars)
- Delayed jobs and rate limiting
- Dashboard available (Bull Board) for monitoring
- Works seamlessly with both Node and Python workers

### File Storage: Google Cloud Storage

**Why GCS:**
- Scalable file storage for uploaded PDFs/Excel
- Signed URLs for secure temporary access
- Cost-effective for file archival
- Integrates well with the rest of GCP if needed later

**Alternative for MVP:** Local filesystem or S3-compatible (MinIO for development)

### Authentication: JWT

**Implementation:**
- Access token: short-lived (15 min), stored in memory
- Refresh token: longer-lived (7 days), stored in httpOnly cookie
- Password hashing: bcrypt with salt rounds = 12
- No OAuth/social login for MVP

### Deployment

**Frontend:** Vercel
- Zero-config Next.js deployment
- Preview deployments per PR
- Edge network for static assets

**Backend + Services:** Docker + VPS/Cloud Run
- docker-compose for local development
- Single Dockerfile per service
- Environment-based configuration

### Development Tools

- **Package manager:** pnpm (monorepo workspaces)
- **Linting:** ESLint + Prettier (shared config)
- **Testing:** Vitest (unit) + Supertest (API integration)
- **API Documentation:** OpenAPI/Swagger auto-generated from route definitions
- **Database migrations:** TypeORM CLI
- **Git workflow:** trunk-based development with feature branches
