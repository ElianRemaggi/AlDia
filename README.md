# PriceHub — Centralizador de Listas de Precios para Comercios

## Descripción

PriceHub es una plataforma SaaS que permite a comercios centralizar, normalizar y gestionar listas de precios de múltiples proveedores. Resuelve el problema de trabajar con PDFs, Excel y formatos heterogéneos, ofreciendo comparación de precios, detección de aumentos, históricos, remarcación y generación de listas de compra.

## Problema que resuelve

Los comercios reciben listas de precios en formatos dispares (PDF, Excel, imágenes). El trabajo manual de comparar, detectar aumentos y definir precios de venta consume tiempo y genera errores. PriceHub automatiza este flujo.

## Usuarios

| Rol | Descripción |
|-----|-------------|
| **Admin** | Gestiona el sistema, crea comercios y administradores, administra accesos globales |
| **Comercio** | Crea proveedores, importa listas, analiza cambios de precio, define remarcación, genera listas de compra |

## Stack Tecnológico

- **Frontend:** Next.js + TypeScript + Tailwind CSS
- **Backend:** Express.js + TypeScript
- **Base de datos:** PostgreSQL + TypeORM
- **Procesamiento documental:** Python (microservicio)
- **Colas:** Redis + BullMQ
- **Almacenamiento de archivos:** Google Cloud Storage (Firestore)
- **Autenticación:** JWT
- **Deploy:** Vercel (frontend) + Docker (backend/servicios)

## Estructura del Proyecto

```
pricehub/
├── apps/
│   ├── web/                  # Next.js frontend
│   └── api/                  # Express backend
├── services/
│   └── document-processor/   # Python - parsing de PDFs/Excel/imágenes
├── packages/
│   └── shared/               # Tipos, utilidades, constantes compartidas
├── docs/                     # Documentación técnica
│   ├── architecture/
│   ├── features/
│   ├── api/
│   ├── database/
│   └── devops/
├── tasks/                    # Gestión de tareas y lecciones
│   ├── todo.md
│   └── lessons.md
├── docker-compose.yml
└── README.md
```

## Documentación

| Documento | Ubicación |
|-----------|-----------|
| Arquitectura general | `docs/architecture/overview.md` |
| Stack y decisiones técnicas | `docs/architecture/stack-decisions.md` |
| Modelo de datos | `docs/database/schema.md` |
| API REST | `docs/api/endpoints.md` |
| Flujo de importación | `docs/features/import-pipeline.md` |
| Sistema de autenticación | `docs/features/auth.md` |
| Catálogo y productos | `docs/features/catalog.md` |
| Remarcación | `docs/features/markup.md` |
| Listas de compra | `docs/features/purchase-lists.md` |
| Notificaciones | `docs/features/notifications.md` |
| Dashboard | `docs/features/dashboard.md` |
| Plan de deploy | `docs/devops/deployment.md` |
| Variables de entorno | `docs/devops/env-vars.md` |
| Riesgos y mitigaciones | `docs/architecture/risks.md` |
| Plan MVP | `docs/architecture/mvp-plan.md` |
| Tareas pendientes | `tasks/todo.md` |
| Lecciones aprendidas | `tasks/lessons.md` |

## Comandos rápidos

```bash
# Desarrollo local
docker-compose up -d          # Levantar PostgreSQL + Redis
cd apps/web && npm run dev    # Frontend en localhost:3000
cd apps/api && npm run dev    # Backend en localhost:4000

# Servicio de procesamiento
cd services/document-processor
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py

# Tests
npm run test                  # Tests unitarios
npm run test:e2e              # Tests end-to-end
```
