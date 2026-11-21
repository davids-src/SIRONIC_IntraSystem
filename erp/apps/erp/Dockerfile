# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
ENV HUSKY=0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/erp/package.json ./apps/erp/
COPY packages/admin/package.json ./packages/admin/
COPY packages/arlista/package.json ./packages/arlista/
COPY packages/auth/package.json ./packages/auth/
COPY packages/core/package.json ./packages/core/
COPY packages/db-core/package.json ./packages/db-core/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/bizonylat/package.json ./packages/bizonylat/
COPY packages/ertekesites/package.json ./packages/ertekesites/
COPY packages/eszkoz/package.json ./packages/eszkoz/
COPY packages/keszlet/package.json ./packages/keszlet/
COPY packages/feladat/package.json ./packages/feladat/
COPY packages/jelzes/package.json ./packages/jelzes/
COPY packages/projekt/package.json ./packages/projekt/
COPY packages/lib/package.json ./packages/lib/
COPY packages/mail/package.json ./packages/mail/
COPY packages/media/package.json ./packages/media/
COPY packages/partner/package.json ./packages/partner/
COPY packages/rbac/package.json ./packages/rbac/
COPY packages/test-utils/package.json ./packages/test-utils/
COPY packages/secrets/package.json ./packages/secrets/
COPY packages/szerviz/package.json ./packages/szerviz/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS builder
ENV HUSKY=0
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholders so `next build` can resolve env at compile time only.
# These stay in the builder stage and are NOT copied into the runtime image.
# Real MONGODB_URI / AUTH_* / SMTP_* come from Portainer at container start.
ENV AUTH_SECRET=build-time-dummy-auth-secret-minimum-32-chars
ENV MONGODB_URI=mongodb://127.0.0.1:27017
ENV MONGODB_DB_NAME=sironic_erp
ENV AUTH_URL=http://localhost:3000
ENV APP_URL=http://localhost:3000
ENV SMTP_HOST=localhost
ENV SMTP_PORT=587
ENV SMTP_USER=build
ENV SMTP_PASS=build
ENV SMTP_FROM=no-reply@build.local
ENV SMTP_SECURE=false
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter @erp/erp build

# Runtime image: no app secrets. Configure everything via Portainer `environment:`.
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/erp/public ./apps/erp/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/erp/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/erp/.next/static ./apps/erp/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/erp/server.js"]
