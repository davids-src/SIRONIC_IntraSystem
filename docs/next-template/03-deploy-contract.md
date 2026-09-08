# Next Template — 03 Deploy Contract

This contract is what Track 1 orchestrator and `StackTemplate` assume. **Any** site image (template or custom) that wants one-click provision should comply.

---

## 1. Next.js output

```ts
// next.config.ts
const nextConfig = {
  output: "standalone",
};
```

Dockerfile uses standalone server (not full monorepo `pnpm start` like current CRM images — CRM can migrate later).

---

## 2. Dockerfile (canonical)

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm i --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
USER node
CMD ["node", "server.js"]
```

---

## 3. GHCR naming

```text
ghcr.io/<owner-lowercase>/sironic-site-template:latest
ghcr.io/<owner-lowercase>/sironic-site-template:<git-sha>
ghcr.io/<owner-lowercase>/sironic-site-template:v<semver>
```

Workflow on push to `main`: build + push sha + latest.  
Orchestrator `image_build` step dispatches this workflow or adopts an existing tag.

Custom partner forks should still publish under a predictable name stored on `Deployment.image.repository`.

---

## 4. Required environment variables

| Variable                      | Required        | Purpose            |
| ----------------------------- | --------------- | ------------------ |
| `MONGODB_URI`                 | yes             | App DB             |
| `AUTH_SECRET`                 | yes             | Session encryption |
| `AUTH_URL` / `NEXTAUTH_URL`   | yes             | `https://{domain}` |
| `PLATFORM_AUTH_ISSUER`        | yes (SSO)       | IdP issuer URL     |
| `PLATFORM_AUTH_CLIENT_ID`     | yes (SSO)       | OIDC client        |
| `PLATFORM_AUTH_CLIENT_SECRET` | if confidential | OIDC secret        |
| `SITE_NAME`                   | optional        | Branding           |
| `CONTACT_ID`                  | optional        | CRM correlation    |
| `DEPLOYMENT_ID`               | optional        | CRM correlation    |

Stack template placeholders must include these.

---

## 5. Health endpoint

```http
GET /api/health
```

Response `200`:

```json
{ "ok": true, "version": "1.2.3" }
```

Orchestrator `stack_deploy.verify` may HTTP-check `https://{domain}/api/health` after DNS/proxy settle (retry with backoff).

---

## 6. Portainer AutoUpdate webhook

After GHCR push, CI calls:

```http
POST {PORTAINER_URL}/api/stacks/webhooks/{webhookID}
```

Webhook ID comes from stack create response; stored on Deployment; injected into GitHub repo secrets **or** called from CRM redeploy.

Prefer image tag pin to **sha** in compose for prod; webhook updates stack to pull new tag from env `IMAGE_TAG`.

---

## 7. Network

Compose must attach to external network **`nginxproxy_default`** so NPM can reach the container by service/container name.

---

## 8. Compliance checklist (PR template for template repo)

- [ ] `output: "standalone"`
- [ ] Dockerfile runner serves port 3000
- [ ] `/api/health` returns ok
- [ ] OIDC env documented
- [ ] Image published to GHCR with sha tag
- [ ] Example compose includes `nginxproxy_default`
- [ ] No secrets in image layers
