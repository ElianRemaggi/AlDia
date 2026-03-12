# Lessons Learned — PriceHub

## Format

Each lesson follows this structure:
- **Date:** When discovered
- **Category:** logic | syntax | architecture | requirements | devops | performance
- **Error:** What went wrong
- **Root Cause:** Why it happened
- **Fix:** What solved it
- **Rule:** Concrete rule to prevent recurrence

---

## Lessons

---

### L-001 — Config mock incompleto en route tests

- **Date:** 2026-03-12
- **Category:** syntax / testing
- **Error:** Al agregar `import.queue.ts` (que lee `config.redis.host` a nivel de módulo), los 3 route test files existentes fallaron con `TypeError: Cannot read properties of undefined (reading 'host')`.
- **Root Cause:** Los route tests mockean `../../config` con solo las propiedades que necesitaban en ese momento (`jwt`, `cors`, `logLevel`). Al importar `app.ts` → `import.routes.ts` → `import.queue.ts`, el mock incompleto causó que `config.redis` fuera `undefined` en la inicialización del módulo.
- **Fix:** Agregar `redis` y `storage` al mock de config en los 3 route test files.
- **Rule:** Cuando un módulo leído por `app.ts` acceda a propiedades de `config` a nivel de módulo (fuera de funciones), todos los tests que importen `app` deben incluir esas propiedades en su mock. Al agregar secciones a `config/index.ts`, revisar todos los `vi.mock('../../config', ...)` existentes.

---

### L-002 — Side-effects de conexión van en server.ts, no en app.ts

- **Date:** 2026-03-12
- **Category:** architecture
- **Error:** Importar `import.worker.ts` en `app.ts` hace que BullMQ intente conectar a Redis en cada test que importe el app.
- **Root Cause:** `app.ts` es importado por todos los route tests. El worker registra listeners y llama `worker.run()` al cargar, iniciando conexiones reales.
- **Fix:** Mover `import './modules/import/import.worker'` a `server.ts`.
- **Rule:** `app.ts` debe ser puro: solo middlewares y rutas, sin conexiones externas. Todo lo que inicie conexiones (DB, Redis, workers) va exclusivamente en `server.ts`, que nunca es importado por tests.
