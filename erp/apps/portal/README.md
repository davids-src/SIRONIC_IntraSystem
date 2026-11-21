# SIRONIC Partnerportál (`apps/portal`)

Második composition root (PROJECT_PLAN #3): a partnerek saját adatait mutatja, **ugyanazokon a domain
facade-okon** keresztül, mint az `apps/erp`, de szűk, partner-szintű nézővel (`Nezo`). Port: **3001**.

```bash
cd erp
pnpm --filter @erp/portal dev          # http://localhost:3001
pnpm --filter @erp/portal build
node scripts/verify-portal-isolation.mjs
```

Környezeti változók: `MONGODB_URI`, `MONGODB_DB_NAME`, **`PORTAL_AUTH_SECRET`** (>= 32 karakter, NEM
egyezhet az `AUTH_SECRET`-tel), `PORTAL_URL` (a levelekben szereplő nyilvános cím), `SMTP_*`.

## Struktúrális izoláció

| Réteg                                 | Szerep                                                                                                                                                                                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@erp/portal-auth`                    | `PortalUser` (saját `portal_users` kollekció), bcrypt, meghívó / jelszó-beállítás / reset, zárolás, szerepkörök adatként (`partner-admin`, `partner-viewer`).                                                                                      |
| `src/lib/portal-nezo.ts`              | `getPortalNezo()` — **az egyetlen** módja a néző megszerzésének. A süti aláírt JWT-jéből, majd az adatbázisból (aktív-e, partner) származik; kérés-paraméterből soha.                                                                              |
| `src/lib/portal-api.ts`               | Akciós réteg: minden függvény első argumentuma a `nezo`, amit továbbad a facade-nak. Az integrációs teszt ezt hívja két partnerrel.                                                                                                                |
| `src/lib/actions.ts`                  | `"use server"` akciók: `getPortalNezo()` -> `portal-api`. Csak `export async function`.                                                                                                                                                            |
| `scripts/verify-portal-isolation.mjs` | CI-őr: hibázik, ha az `apps/portal` modellt/drivert/staff-auth-ot importál, facade-hívás `nezo` nélkül történik, a facade aliasolva van, vagy `kind: "portal"` literál készül a `lib/nezo.ts`-en kívül. A `preflight` és az `erp-ci.yml` futtatja. |

A facade-ok a szűrést maguk végzik (`partnerId` a nézőből, üres partner = nincs találat), a kimenet
allow-listelt DTO: belső megjegyzés, beszerzési ár, Billingo-hivatkozás, belső jegyzet nem hagyja el őket.

## Munkamenet (nem keverhető a staff alkalmazással)

- Süti: `sironic-portal-session` (a staff Auth.js `authjs.session-token`-jét soha nem olvassa/írja).
- Token: HS256 JWT `PORTAL_AUTH_SECRET`-tel (Web Crypto), `iss`/`aud` ellenőrzéssel; a staff Auth.js JWE-t
  nem tudja dekódolni, és a portál sem fogad el Auth.js tokent (teszt: `packages/portal-auth/src/session-token.test.ts`).
- A token `{portalUserId, partnerId, rolak}`-t hordoz, de a jogosultság és a partner minden kérésnél az
  adatbázisból frissül: letiltás / szerepkör-váltás azonnal érvényes.

## OIDC bekötési pont (nincs megépítve)

A központi IdP (`apps/auth`) később a `PortalUser.platformUserId`-t (az IdP `sub`) töltené, a
`@erp/auth` `linkOidcIdentity` mintájára: csak **verifikált e-mail**, **már meghívott** `PortalUser`
linkelhető, automatikus létrehozás nincs; a partner és a jogosultságok mindig a helyi
`portal_users`-ből jönnek. A bejelentkezési oldalon ekkor kerülne be a "Belépés SIRONIC fiókkal" gomb,
és a `startPortalSession` hívás ugyanúgy az `identity`-ből építene sütit. Lásd a `packages/portal-auth/src/api.ts` fejlécét.

## Publikus mágikus link

`/igazolas/<token>` (és a bizonylat csomag által generált `/portal/igazolas/<token>`, rewrite-tal) belépés
nélkül elérhető: `getIgazolasTokennel` / `elfogadIgazolasTokennel` / `elutasitIgazolasTokennel`. A token
csak a facade-nak kerül átadásra (nem naplózott, a válasz `no-store`, `Referrer-Policy: no-referrer`),
a megtekintés (60/perc) és a döntés (10/10 perc) kliensenként korlátozott (`src/lib/rate-limit.ts`, memóriában).

## Első partner-admin

A portál-felhasználók meghívását a `@erp/portal-auth` `invitePortalUser` függvénye végzi; a partner-admin a
saját csapatát a `/csapat` oldalon hívja meg. Az **első** admint a belső (ERP) oldalról kell meghívni — ennek
UI-ja még nincs (lásd AGENT_HANDOFF).

Felhasználói útmutató: [`../../docs/portal-guide/`](../../docs/portal-guide/index.md).
