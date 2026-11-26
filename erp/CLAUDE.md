# Repository rules

## User documentation ships with the feature, not after it

Every new module, domain entity, or user-facing page/workflow must ship its Hungarian
end-user documentation in `docs/user-guide/` (rendered at `/sugo`) **in the same change**
that adds the feature — not as a follow-up task.

- One markdown file per feature/page (mirror the existing granularity: e.g.
  `partner-lista.md`, `partner-adatlap.md` — not one giant
  file per module).
- Follow the existing frontmatter shape exactly: `title`, `description`, `order`, `section`,
  optional `permissions` (array of permission keys — the article is hidden unless the viewer
  has at least one). See `docs/user-guide/admin-felhasznalok.md` for the reference shape and
  `apps/erp/src/lib/help/types.ts` for the frontmatter type.
- Structure the body like the existing docs: `## Hol találod` (route + sidebar path) → `## Mit
látsz` / workflow sections describing what the user can actually do, in plain task language
  → `## Kapcsolódó fejezetek` (links to related `/help/<slug>` pages) → a trailing
  `*Utolsó frissítés: YYYY-MM*` line.
- Gate each article on the same permission key(s) that gate the underlying page — don't
  document a page a viewer can't reach.
- If the doc introduces a **new** `section` value, add it to the `sectionOrder` array in
  `apps/erp/src/lib/help/load-help.ts` (in the position matching `docs/ARCHITECTURE.md` §8's
  chapter order) — otherwise it renders last, after Adminisztráció, instead of where it
  belongs.
- Update `docs/user-guide/index.md`'s "Modulok röviden" table and "Kapcsolódó fejezetek" list
  to reference the new pages.
- Add or extend a test in `apps/erp/src/lib/help/load-help.test.ts` asserting the new
  article's permission gating, matching the existing test style.

`docs/ARCHITECTURE.md` §8 has the full per-module chapter plan (topics to cover per module) —
check it before writing so coverage matches what was actually scoped, not more or less.
