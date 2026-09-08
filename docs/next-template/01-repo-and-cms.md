# Next Template — 01 Repo and CMS

> **Separate repository** (decision D9). Not created inside SIRONIC IntraSystem. This doc is the blueprint when you open that repo.

Suggested name: `sironic-next-template` (private).

---

## 1. Why a template repo

The previous plugin/CMS-in-one-deployment approach became messy. Cloning a clean template per partner (or building one image parameterized by env/content) keeps velocity high and upgrades controllable.

---

## 2. Target layout

```text
sironic-next-template/
  apps/web/                 # Next.js App Router site
  packages/cms-core/        # page/block schema, renderer
  packages/auth-client/     # OIDC + local user link helpers
  packages/ui/              # site design system (can diverge from CRM)
  docker/Dockerfile
  .github/workflows/build-image.yml
  README.md
  DEPLOY_CONTRACT.md        # copy of docs/next-template/03-deploy-contract.md
```

---

## 3. CMS / plugin model (keep it boring)

**Do**

- Content as typed **blocks** in MongoDB (or MDX in repo for static marketing).
- Registry: `blockType → React component`.
- Pages: `{ slug, title, blocks[], status, updated_at }`.
- Plugins are **packages** with explicit exports (`registerBlocks()`, `registerRoutes()`), imported statically in `apps/web` — no runtime eval, no arbitrary plugin upload.

**Don't**

- Dynamic `require` of customer-uploaded JS.
- One mega plugin that owns auth + billing + CMS + theme.
- Per-deployment forks that never merge upstream — prefer config + content over code forks; if fork needed, track `upstream_template_version` in Deployment meta.

### Example block types

`hero`, `richtext`, `image`, `cta`, `faq`, `form_contact`, `embed`.

Admin UI: either (a) minimal `/admin` in the template protected by OIDC + local `role=admin`, or (b) headless — edit content from CRM later (future). MVP: in-template admin.

---

## 4. Versioning

- Semver tags on template repo.
- GHCR image: `ghcr.io/<org>/sironic-site-template:vX.Y.Z` and `:sha`.
- Deployment record stores `template_version` / image tag for upgrade planning.
