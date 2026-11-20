# Frontend Planning — PriceHub

Stack: **Next.js 16 App Router (Cache Components) + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui (Base UI) + TanStack Query v5**

> **Estado (2026-11-20):** F1 implementada en `apps/web`. Las secciones de auth y estructura de abajo reflejan lo implementado; donde difiere del plan original se indica.
>
> **Next 16 no es el Next que conocés:** antes de escribir código leé la guía correspondiente en `apps/web/node_modules/next/dist/docs/` (ver `apps/web/AGENTS.md`).

---

## Estructura de directorios

```
apps/web/
├── app/
│   ├── layout.tsx                        # Root layout — providers globales
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx                  # Página de login (pública)
│   ├── (dashboard)/                      # Rutas protegidas — commerce users
│   │   ├── layout.tsx                    # Layout con sidebar + header + notif bell
│   │   ├── page.tsx                      # Dashboard home
│   │   ├── suppliers/
│   │   │   ├── page.tsx                  # Lista de proveedores
│   │   │   ├── new/
│   │   │   │   └── page.tsx              # Crear proveedor
│   │   │   └── [id]/
│   │   │       ├── page.tsx              # Detalle del proveedor
│   │   │       ├── edit/
│   │   │       │   └── page.tsx          # Editar proveedor
│   │   │       └── price-lists/
│   │   │           ├── page.tsx          # Historial de listas de precios
│   │   │           └── upload/
│   │   │               └── page.tsx      # Subir nueva lista
│   │   ├── products/
│   │   │   ├── page.tsx                  # Catálogo de productos (cross-supplier)
│   │   │   └── [id]/
│   │   │       └── page.tsx              # Detalle + historial de precios
│   │   ├── purchase-lists/
│   │   │   ├── page.tsx                  # Mis listas de compra
│   │   │   └── [id]/
│   │   │       └── page.tsx              # Detalle de lista de compra
│   │   └── notifications/
│   │       └── page.tsx                  # Centro de notificaciones
│   └── admin/                            # Rutas solo admin
│       ├── layout.tsx                    # Layout admin (nav diferente)
│       ├── page.tsx                      # Dashboard admin
│       ├── commerces/
│       │   ├── page.tsx                  # Lista de commerces
│       │   ├── new/
│       │   │   └── page.tsx              # Crear commerce
│       │   └── [id]/
│       │       └── edit/
│       │           └── page.tsx          # Editar commerce
│       └── users/
│           ├── page.tsx                  # Lista de usuarios
│           └── new/
│               └── page.tsx              # Crear usuario
├── components/
│   ├── ui/                               # shadcn/ui (auto-generados con CLI)
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── notification-bell.tsx         # Badge con unread count
│   │   └── role-guard.tsx               # Wrapper que redirige por rol
│   ├── suppliers/
│   │   ├── supplier-table.tsx
│   │   ├── supplier-form.tsx             # Crear/editar (mismo form)
│   │   └── supplier-card.tsx
│   ├── price-lists/
│   │   ├── upload-form.tsx               # Drag & drop + config
│   │   ├── import-job-poller.tsx         # Polling GET /import-jobs/:id
│   │   └── price-list-table.tsx
│   ├── products/
│   │   ├── product-table.tsx             # Con filtros inline
│   │   ├── product-filters.tsx
│   │   └── price-history-chart.tsx
│   ├── purchase-lists/
│   │   ├── purchase-list-form.tsx
│   │   ├── purchase-items-table.tsx
│   │   └── whatsapp-export-modal.tsx
│   └── shared/
│       ├── page-header.tsx
│       ├── empty-state.tsx
│       ├── error-boundary.tsx
│       └── confirm-dialog.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts                     # fetch wrapper con interceptors
│   │   ├── auth.api.ts
│   │   ├── suppliers.api.ts
│   │   ├── commerces.api.ts
│   │   ├── products.api.ts
│   │   ├── import.api.ts
│   │   ├── purchase-lists.api.ts
│   │   └── notifications.api.ts
│   ├── hooks/                            # TanStack Query hooks
│   │   ├── use-auth.ts
│   │   ├── use-suppliers.ts
│   │   ├── use-commerces.ts
│   │   ├── use-products.ts
│   │   ├── use-import.ts
│   │   ├── use-purchase-lists.ts
│   │   └── use-notifications.ts
│   ├── auth/
│   │   ├── auth-provider.tsx             # AuthContext + Provider
│   │   └── token-store.ts               # In-memory access token
│   ├── query-keys.ts                     # Centralized query key factory
│   └── utils.ts
├── middleware.ts                         # Next.js middleware — route protection
└── .env.local
    └── NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

---

## Rutas y acceso requerido

| Ruta | Rol | API que consume |
|------|-----|-----------------|
| `/login` | público | `POST /auth/login` |
| `/` (dashboard) | commerce, admin | `GET /dashboard/summary` |
| `/suppliers` | commerce | `GET /suppliers` |
| `/suppliers/new` | commerce | `POST /suppliers` |
| `/suppliers/:id` | commerce | `GET /suppliers/:id` |
| `/suppliers/:id/edit` | commerce | `PATCH /suppliers/:id` |
| `/suppliers/:id/price-lists` | commerce | `GET /suppliers/:id/price-lists` |
| `/suppliers/:id/price-lists/upload` | commerce | `POST /suppliers/:id/price-lists/upload` |
| `/products` | commerce | `GET /products` |
| `/products/:id` | commerce | `GET /products/:id/price-history` |
| `/purchase-lists` | commerce | `GET /purchase-lists` |
| `/purchase-lists/:id` | commerce | `GET /purchase-lists/:id` |
| `/notifications` | commerce | `GET /notifications` |
| `/admin` | admin | `GET /dashboard/summary` (admin) |
| `/admin/commerces` | admin | `GET /commerces` |
| `/admin/commerces/new` | admin | `POST /commerces` |
| `/admin/commerces/:id/edit` | admin | `PATCH /commerces/:id` |
| `/admin/users` | admin | `GET /admin/users` |
| `/admin/users/new` | admin | `POST /admin/users` |

---

## Auth — Flujo y almacenamiento de tokens (implementado)

### Tokens
- **Access token:** en memoria (`lib/auth/token-store.ts`), nunca en `localStorage` (XSS)
- **Refresh token:** cookie httpOnly que setea la API con `sameSite: strict` y `path: /api/v1/auth/refresh`

### Mismo origen: el browser siempre llama a `/api/v1`
- En dev, `next.config.ts` hace rewrite de `/api/v1/*` → `API_PROXY_TARGET` (default `http://localhost:4000`). **Se evalúa en build**: para un build de producción, setear `API_PROXY_TARGET` al buildear o rutear `/api/*` en el reverse proxy (ver `deployment.md`).
- Así la cookie `sameSite: strict` + `path` funciona sin CORS.
- `NEXT_PUBLIC_API_URL` es opcional (default `/api/v1`).

### Protección de rutas — sin middleware/proxy
El plan original usaba `middleware.ts` leyendo la cookie de refresh. **No funciona**: la cookie tiene `path=/api/v1/auth/refresh`, el browser no la manda a `/suppliers`. En su lugar:

```
AuthProvider (app/providers.tsx)
  └── al montar: tokenStore vacío → POST /auth/refresh (cookie) → GET /auth/me
        ├── ok   → state = authenticated
        └── fail → state = unauthenticated

AuthGate role="commerce" | "admin"   (layouts de (dashboard) y admin)
  ├── loading          → skeleton (mismo HTML en server y client → sin hydration mismatch)
  ├── unauthenticated  → router.replace('/login')
  └── rol incorrecto   → router.replace(homeFor(user))   // admin → /admin, commerce → /
```

### `lib/api/client.ts`
- `api<T>(path, { method, body, query })` devuelve el body JSON (`{ status, data, meta? }`) o lanza `ApiError(message, status, fieldErrors)`.
- En 401 refresca el token **una vez** (requests concurrentes comparten un único refresh) y reintenta; si el refresh falla, llama al handler de sesión expirada (AuthProvider limpia token + cache de TanStack Query).
- Endpoints tipados en `lib/api/endpoints.ts` (`authApi`, `suppliersApi`, `commercesApi`, `usersApi`).

### Next 16 + Cache Components — reglas usadas en `apps/web`
- Páginas = Server Components finos (metadata) que renderizan componentes cliente.
- Rutas dinámicas: la page pasa `params` (Promise) al componente cliente dentro de `<Suspense>`, que lo resuelve con `use(params)`.
- `usePathname` (nav activa) va dentro de `<Suspense>`.
- Con `cacheComponents` Next preserva rutas visitadas con `<Activity>`: los componentes no se desmontan al navegar. **No usar `key={...updatedAt}` para resetear forms**: remonta el form y TanStack descarta los callbacks de `mutate()` (pasó en F1).
- Rutas visitadas quedan montadas (ocultas) por `<Activity>`: en tests E2E, `getByText` puede matchear texto de una página oculta → acotar a `{ visible: true }` o a un contenedor.
- Botones que navegan: `ButtonLink` (un `<Link>` real con estilos de botón). No usar `<Button render={<Link/>}>`: Base UI le pone `role="button"`.

---

## TanStack Query — Convenciones

> Implementado en `lib/query-keys.ts` **sin `commerceId` en las keys**: la API ya scopea por token y el cache completo se limpia en logout. Hooks en `lib/hooks/` (`use-suppliers.ts`, `use-admin.ts`). Los ejemplos de abajo son el plan original.

### Query key factory (`lib/query-keys.ts`)
```typescript
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  suppliers: {
    all:    (commerceId: string)                       => ['suppliers', commerceId] as const,
    list:   (commerceId: string, params?: object)      => ['suppliers', commerceId, 'list', params] as const,
    detail: (id: string)                               => ['suppliers', id] as const,
  },
  priceLists: {
    bySuplier: (supplierId: string)                    => ['price-lists', supplierId] as const,
    detail:    (id: string)                            => ['price-lists', 'detail', id] as const,
  },
  importJobs: {
    detail: (id: string)                               => ['import-jobs', id] as const,
  },
  products: {
    list:   (commerceId: string, params?: object)      => ['products', commerceId, params] as const,
    detail: (id: string)                               => ['products', id] as const,
  },
  commerces: {
    list:   ()         => ['commerces'] as const,
    detail: (id: string) => ['commerces', id] as const,
  },
  notifications: {
    list:        (commerceId: string) => ['notifications', commerceId] as const,
    unreadCount: (commerceId: string) => ['notifications', commerceId, 'unread'] as const,
  },
  purchaseLists: {
    list:   (commerceId: string)  => ['purchase-lists', commerceId] as const,
    detail: (id: string)          => ['purchase-lists', 'detail', id] as const,
  },
};
```

### Ejemplo de hook (`lib/hooks/use-suppliers.ts`)
```typescript
export function useSuppliers(params?: ListSuppliersParams) {
  const { commerceId } = useAuth();
  return useQuery({
    queryKey: queryKeys.suppliers.list(commerceId!, params),
    queryFn:  () => suppliersApi.list(params),
    enabled:  !!commerceId,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const { commerceId } = useAuth();
  return useMutation({
    mutationFn: suppliersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all(commerceId!) });
    },
  });
}
```

### Polling de import job
```typescript
export function useImportJobPoller(jobId: string | null) {
  return useQuery({
    queryKey:        queryKeys.importJobs.detail(jobId!),
    queryFn:         () => importApi.getJob(jobId!),
    enabled:         !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Dejar de hacer polling cuando el job termina
      if (status === 'completed' || status === 'failed') return false;
      return 3000;  // poll cada 3s mientras procesa
    },
  });
}
```

---

## Páginas — Descripción detallada

### `/login`
- Form: email + password
- Submit → `POST /auth/login` → guardar accessToken en memoria → redirigir a `/`
- Mostrar error de credenciales inválidas inline (no toast)
- Redirigir a `/admin` si `role === 'admin'`

---

### `/` — Dashboard
- 4 stat cards: proveedores activos, total productos, importaciones recientes, pendientes
- Tabla "últimos cambios de precio" (top 10, 30 días)
- Lista "últimas importaciones" (últimas 5)
- Sección "alertas de favoritos" (si hay)
- Botones de acceso rápido: upload, ver productos, mis listas
- API: `GET /dashboard/summary`

---

### `/suppliers` — Lista de proveedores
- Tabla con: nombre, código, contacto, estado, fecha
- Buscar por nombre (debounce 300ms)
- Filtro: activos / todos
- Botón "Nuevo proveedor" → `/suppliers/new`
- Fila clickeable → `/suppliers/:id`
- API: `GET /suppliers?search=&isActive=&page=&limit=`

---

### `/suppliers/new` y `/suppliers/:id/edit`
- Mismo componente `SupplierForm` con `mode: 'create' | 'edit'`
- Campos: nombre*, código, descripción, contacto (nombre, email, teléfono)
- Validación client-side con zod (espejando el server schema)
- Submit → invalidar `queryKeys.suppliers.all(commerceId)`
- API: `POST /suppliers` / `PATCH /suppliers/:id`

---

### `/suppliers/:id` — Detalle del proveedor
- Header: nombre, estado, botones editar / desactivar
- Tab "Listas de precio": historial de importaciones
- Tab "Productos": productos de este proveedor con precios actuales
- Botón "Subir nueva lista" → `/suppliers/:id/price-lists/upload`
- API: `GET /suppliers/:id`, `GET /suppliers/:id/price-lists`

---

### `/suppliers/:id/price-lists/upload`
- Drag & drop o file picker (xlsx, xls, csv)
- Campo opcional: fecha efectiva, notas
- Selector `price_format`: "Punto decimal" / "Coma decimal (ARS)"
- Submit → `POST /suppliers/:id/price-lists/upload` → respuesta 202 con `importJobId`
- Mostrar progress card con `ImportJobPoller` haciendo polling de `GET /import-jobs/:id`
- Estados visuales: procesando → completado (N productos) / fallido (mensaje de error)

---

### `/products` — Catálogo completo
- Tabla con: producto, proveedor, precio actual, precio anterior, cambio %, favorito
- Filtros: búsqueda, proveedor, categoría, solo favoritos, solo con cambios
- Sort por: nombre, precio, % de cambio
- Toggle favorito inline (optimistic update)
- Fila → `/products/:id`
- API: `GET /products` con todos los params

---

### `/products/:id` — Detalle de producto
- Nombre, proveedor, código, unidad, categoría
- Precio actual + badge de cambio
- Gráfico de historial de precios (área o línea, últimas N importaciones)
- API: `GET /products/:id/price-history`

---

### `/purchase-lists` — Mis listas de compra
- Cards o tabla con: nombre, estado (draft/exported/archived), items count, fecha
- Botón "Nueva lista"
- API: `GET /purchase-lists`

---

### `/purchase-lists/:id`
- Header: nombre, estado, botones cambiar estado
- Tabla de items: producto, proveedor, cantidad (editable inline), precio estimado
- Total estimado al pie (agrupado por proveedor)
- Botón "Exportar para WhatsApp" → modal con texto copiable
- API: `GET /purchase-lists/:id`, mutations de items

---

### `/notifications`
- Lista paginada de notificaciones con tipo, mensaje, fecha, leído/no leído
- Botón "Marcar todo como leído"
- API: `GET /notifications`, `POST /notifications/mark-all-read`

---

### `/admin` — Panel administrador

#### `/admin/commerces`
- Tabla: nombre, identificador, email, teléfono, estado, fecha
- Filtro: activos/inactivos, búsqueda
- Toggle `isActive` directo en tabla (optimistic update)
- Botón "Nuevo commerce" → `/admin/commerces/new`
- API: `GET /commerces`

#### `/admin/commerces/new` y `/admin/commerces/:id/edit`
- Campos: nombre*, identificador, email, teléfono, activo
- API: `POST /commerces` / `PATCH /commerces/:id`

#### `/admin/users`
- Tabla: nombre, email, rol, commerce asignado, estado
- Filtros: rol (admin/commerce), commerce
- API: `GET /admin/users`

#### `/admin/users/new`
- Campos: nombre*, email*, password*, rol*, commerce (si rol = commerce)
- API: `POST /admin/users` (mismas reglas que `/auth/register`)

---

## Fases de implementación frontend

Las páginas se construyen **en orden de disponibilidad de la API**:

### Fase F1 — ✅ Implementada (2026-11-20)
- [x] Setup `apps/web` (Next.js 16 + Tailwind v4 + shadcn/ui Base UI + TanStack Query)
- [x] `lib/api/client.ts` — fetch wrapper con refresh (deduplicado) + `ApiError`
- [x] `lib/auth/` — AuthProvider, token-store, useAuth
- [x] Protección de rutas con `AuthGate` (no middleware: ver sección Auth)
- [x] `/login` — form con validación, error inline, redirect por rol
- [x] Layout (sidebar + header con menú de usuario; nav horizontal en mobile)
- [x] `/suppliers` — lista con búsqueda (debounce), filtro de estado y paginación
- [x] `/suppliers/new` y `/suppliers/:id/edit` — SupplierForm (código duplicado → error en el campo)
- [x] `/suppliers/:id` — detalle, desactivar (confirm) / reactivar
- [x] `/admin/commerces` — lista + búsqueda/filtro + toggle isActive optimista
- [x] `/admin/commerces/new` y `edit`
- [x] `/admin/users` — lista con filtros rol/comercio/búsqueda + toggle activo (deshabilitado para uno mismo)
- [x] `/admin/users/new` — `POST /admin/users`
- Verificado con Playwright contra build de producción + API real (21 escenarios).

### Fase F2 — ✅ Implementada (2026-11-20)
- [x] Sección "Listas de precios" en `/suppliers/:id` (últimas 5) + `/suppliers/:id/price-lists` (historial paginado). Se refresca sola mientras haya importaciones en curso
- [x] `/suppliers/:id/price-lists/upload` — drag & drop / file picker (xlsx, xls, csv, pdf; 20MB validado en el cliente), formato de precio (default coma decimal), vigencia, notas. Bloqueado si el proveedor está inactivo
- [x] `ImportJobProgress` — polling de `GET /import-jobs/:id` cada 2s hasta `completed`/`failed`; muestra productos importados y filas con error (`metaJson`)
- [x] Toasts al completar/fallar
- Verificado con Playwright + pipeline real (API + worker Python + Redis): Excel ok, CSV parcial, archivo roto, drag & drop, proveedor inactivo.
- `next.config.ts`: `experimental.proxyClientMaxBodySize: "25mb"` — el rewrite cortaba los uploads en 10MB.

### Fase F3 — Con API Paso 4 (Catálogo completo)
- [ ] `/products` — tabla con todos los filtros
- [ ] Toggle favorito con optimistic update
- [ ] `/products/:id` — detalle + gráfico historial
- [ ] Tab "Productos" en `/suppliers/:id`

### Fase F4 — Con API Paso 5 (Compras + Notificaciones)
- [ ] `/purchase-lists` — lista y creación
- [ ] `/purchase-lists/:id` — detail, items inline edit, export WhatsApp
- [ ] `NotificationBell` en header con polling 30s
- [ ] `/notifications` — centro de notificaciones

### Fase F5 — Paso 6 Dashboard + Polish
- [ ] `/` dashboard con stats reales
- [ ] `/admin` dashboard admin
- [ ] Empty states en todas las páginas vacías
- [ ] Loading skeletons
- [ ] Error boundaries
- [ ] Responsive: tablas → cards en mobile
- [ ] Toast system global (shadcn Toaster)

---

## Dependencias del proyecto web

Instaladas: `@tanstack/react-query` (+ devtools), `zod`, `sonner`, `lucide-react`, shadcn/ui (`base-nova`, sobre `@base-ui/react`).

```bash
# Agregar componentes shadcn (desde apps/web)
pnpm dlx shadcn@latest add <componente>
```

---

## Variables de entorno (`apps/web/.env.local`)

```env
# Opcional: por defecto el browser usa /api/v1 (mismo origen)
NEXT_PUBLIC_API_URL=/api/v1
# Destino del rewrite /api/v1/* (dev y build). Default http://localhost:4000
API_PROXY_TARGET=http://localhost:4000
```
