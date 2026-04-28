FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @crm/partner-portal-app build
EXPOSE 3000
CMD ["pnpm", "--filter", "@crm/partner-portal-app", "start"]
