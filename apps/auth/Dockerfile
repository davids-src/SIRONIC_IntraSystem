FROM node:20-alpine
WORKDIR /app
RUN corepack enable

# Unlike apps/crm and apps/partner-portal, this app needs no build-time env placeholders:
# every route here is force-dynamic (route handlers, or pages with `export const dynamic =
# "force-dynamic"`) — nothing touches the database or reads a secret during `next build`.

COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @crm/auth-app build
EXPOSE 3000
CMD ["pnpm", "--filter", "@crm/auth-app", "start"]
