FROM node:20-alpine
WORKDIR /app
RUN corepack enable

# Build-time placeholders: CI/Docker image build has no .env; `next build` still evaluates config and auth.
# Replace at runtime with real values (Compose, K8s, `-e`, etc.).
ENV MONGODB_URI=mongodb://127.0.0.1:27017/docker-build-placeholder \
    AUTH_SECRET=docker-build-only-placeholder-auth-secret-min-32-chars \
    AUTH_URL=http://127.0.0.1:3000 \
    NEXTAUTH_URL=http://127.0.0.1:3000

COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @crm/crm-app build
EXPOSE 3000
CMD ["pnpm", "--filter", "@crm/crm-app", "start"]
