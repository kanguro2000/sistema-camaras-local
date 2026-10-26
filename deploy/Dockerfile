FROM node:26-bookworm-slim AS build

WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@12.14.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/gateway/package.json apps/gateway/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

COPY apps/gateway/ apps/gateway/
COPY apps/web/ apps/web/
COPY packages/shared/ packages/shared/
COPY deploy/nginx.conf deploy/nginx.conf

RUN pnpm exec tsc -b --clean packages/shared apps/gateway \
    && pnpm exec tsc -b packages/shared apps/gateway \
    && test -f packages/shared/dist/index.d.ts \
    && pnpm --filter @sistema-camaras/web build \
    && pnpm install --prod --offline --frozen-lockfile

FROM node:26-bookworm-slim AS gateway

ENV NODE_ENV=production
WORKDIR /workspace
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/gateway/package.json ./apps/gateway/package.json
COPY --from=build --chown=node:node /workspace/apps/gateway/node_modules ./apps/gateway/node_modules
COPY --from=build --chown=node:node /workspace/apps/gateway/dist ./apps/gateway/dist
COPY --from=build --chown=node:node /workspace/packages/shared/package.json ./packages/shared/package.json
COPY --from=build --chown=node:node /workspace/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build --chown=node:node /workspace/packages/shared/src ./packages/shared/src

WORKDIR /workspace/apps/gateway
USER node
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/index.js"]

FROM nginxinc/nginx-unprivileged:stable-alpine AS web
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
COPY --from=build /workspace/deploy/nginx.conf /etc/nginx/conf.d/default.conf
