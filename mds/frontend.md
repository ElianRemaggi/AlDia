# Frontend Planning — PriceHub

Stack: **Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query v5**

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

## Auth — Flujo y almacenamiento de tokens

### Tokens
- **Access token:** guardado en memoria (`AuthContext`), nunca en `localStorage` (protección XSS)
- **Refresh token:** httpOnly cookie — lo setea la API, el navegador lo envía automáticamente

### Flujo al cargar la app
```
app init
  └── AuthProvider mounts
        └── llama GET /auth/me con access token (si existe en memoria)
              ├── 200 → usuario autenticado, guardar en context
              └── 401 → llamar POST /auth/refresh (cookie se envía sola)
                      ├── 200 → nuevo accessToken → reintentar /auth/me
                      └── 401 → usuario no autenticado → redirigir a /login
```

### Token refresh automático en requests
```typescript
// lib/api/client.ts — interceptor de 401
async function fetchWithAuth(input: RequestInfo, init?: RequestInit) {
  let response = await fetch(input, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${tokenStore.get()}` },
    credentials: 'include',   // para que el cookie vaya en /auth/refresh
  });

  if (response.status === 401) {
    // Intentar refresh
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshed.ok) {
      const { data } = await refreshed.json();
      tokenStore.set(data.accessToken);
      // Reintentar request original
      response = await fetch(input, {
        ...init,
        headers: { ...init?.headers, Authorization: `Bearer ${data.accessToken}` },
        credentials: 'include',
      });
    } else {
      tokenStore.clear();
      window.location.href = '/login';
    }
  }
  return response;
}
```

### `lib/auth/token-store.ts`
```typescript
let _token: string | null = null;

export const tokenStore = {
  get:   () => _token,
  set:   (t: string) => { _token = t; },
  clear: () => { _token = null; },
};
```

### Protección de rutas (Next.js Middleware)
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // El middleware no puede leer la memoria — solo verifica la cookie de refresh
  // como señal de sesión activa. AuthProvider hace la validación real.
  const hasRefreshCookie = request.cookies.has('refreshToken');
  const isAuthPage  = request.nextUrl.pathname.startsWith('/login');
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin');

  if (!hasRefreshCookie && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (hasRefreshCookie && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
```

**Protección por rol** (en el layout, no en middleware):
```typescript
// components/layout/role-guard.tsx
'use client';
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/');
  }, [user, router]);

  if (!user || user.role !== 'admin') return null;
  return <>{children}</>;
}
```

---

## TanStack Query — Convenciones

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
- API: `POST /auth/register`

---

## Fases de implementación frontend

Las páginas se construyen **en orden de disponibilidad de la API**:

### Fase F1 — Con API Paso 1 (disponible ahora)
Estas páginas pueden construirse e integrarse hoy:
- [ ] Setup `apps/web` (Next.js + Tailwind + shadcn/ui)
- [ ] `lib/api/client.ts` — fetch wrapper con refresh interceptor
- [ ] `lib/auth/` — AuthProvider, token-store, useAuth hook
- [ ] `middleware.ts` — protección de rutas por cookie
- [ ] `/login` — form, submit, redirect
- [ ] Layout dashboard (sidebar, header, role-guard)
- [ ] `/suppliers` — list con search y paginación
- [ ] `/suppliers/new` y `/suppliers/:id/edit` — SupplierForm
- [ ] `/suppliers/:id` — detalle básico
- [ ] `/admin/commerces` — lista + toggle isActive
- [ ] `/admin/commerces/new` y `edit`
- [ ] `/admin/users` — lista
- [ ] `/admin/users/new` — crear usuario via `/auth/register`

### Fase F2 — Con API Paso 3 (Import Pipeline)
- [ ] `/suppliers/:id/price-lists` — historial de listas
- [ ] `/suppliers/:id/price-lists/upload` — upload form + ImportJobPoller
- [ ] Componente `ImportJobPoller` (polling cada 3s)
- [ ] Toasts al completar/fallar importación

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

```bash
# En apps/web después de crear el proyecto Next.js
pnpm add @tanstack/react-query @tanstack/react-query-devtools
pnpm add zod
pnpm add sonner                  # toasts
pnpm add lucide-react            # iconos

# shadcn/ui (CLI instala componentes individualmente)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input form table badge dialog
npx shadcn-ui@latest add select dropdown-menu sheet tabs card
```

---

## Variables de entorno (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_APP_NAME=PriceHub
```
