# PriceHub API. Build from the repo root:
#   docker build -f apps/api/Dockerfile -t pricehub-api .
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable

FROM base AS build
WORKDIR /repo
# Manifests first so the dependency layer is cached across source changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @pricehub/api...
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @pricehub/api build
# Production-only node_modules for the API, then the compiled output next to it.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter @pricehub/api deploy --prod /out \
 && rm -rf /out/src /out/dist && cp -r apps/api/dist /out/dist

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=4000 \
    LOCAL_UPLOADS_DIR=/data/uploads
WORKDIR /app
COPY --from=build --chown=node:node /out ./
# Uploaded price lists (when GCS is not configured); shared read-only with the processor.
RUN mkdir -p /data/uploads && chown node:node /data/uploads
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/api/v1/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
# Migrations are idempotent and run on every start, before the server accepts traffic.
CMD ["sh", "-c", "node dist/shared/database/migrate.js && exec node dist/server.js"]
