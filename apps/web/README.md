# PriceHub — web

Next.js 16 (App Router, Cache Components) + React 19 + Tailwind v4 + shadcn/ui (Base UI) + TanStack Query.

```bash
pnpm dev:web          # desde la raíz → http://localhost:3000 (necesita la API en :4000)
pnpm --filter web build
pnpm --filter web lint
```

- El browser llama a `/api/v1` en el mismo origen; `next.config.ts` lo reescribe a `API_PROXY_TARGET` (default `http://localhost:4000`).
- Auth, convenciones y trampas de Next 16: [`mds/frontend.md`](../../mds/frontend.md).
- Deploy: Docker en servidor propio, ver [`mds/deployment.md`](../../mds/deployment.md).
