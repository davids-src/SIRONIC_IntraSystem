FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @crm/crm-app build
EXPOSE 3000
CMD ["pnpm", "--filter", "@crm/crm-app", "start"]
