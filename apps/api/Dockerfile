# syntax=docker/dockerfile:1.7
# Build context: repository root (see docker-compose.yml).

FROM node:22-alpine AS manifests
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/schema/package.json packages/schema/
COPY packages/game-logic/package.json packages/game-logic/

FROM manifests AS build
RUN --mount=type=cache,target=/root/.npm npm ci --workspace @itd/api --include-workspace-root
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api
RUN npm run build -w @itd/api

FROM manifests AS prod-deps
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --workspace @itd/api

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY apps/api/drizzle ./drizzle
USER node
EXPOSE 4000
ENV HOST=0.0.0.0 PORT=4000
CMD ["node", "--enable-source-maps", "dist/main.js"]
