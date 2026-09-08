# Auth Platform — 04 Migration

## 1. Current state

| App    | Auth                                   | User model                         |
| ------ | -------------------------------------- | ---------------------------------- |
| CRM    | NextAuth JWT, credentials + magic-link | `CrmUser` (password_hash, magic_*) |
| Portal | Duplicate NextAuth config              | `PortalUser`                       |

`@crm/auth` only maps session → `ActorContext`.

---

## 2. Target state

- Single IdP (`apps/auth`) owns credentials, MFA, passkeys.
- CRM/Portal: NextAuth (or Auth.js) with OIDC provider `sironic`.
- `CrmUser` / `PortalUser` retain RBAC + tenant/contact linkage + `platform_user_id`.

---

## 3. Migration steps

### Step A — Stand up IdP

- Deploy `apps/auth` with empty user store.
- Create OIDC clients for CRM and portal redirect URIs.

### Step B — Dual-run import

Script `scripts/migrate-users-to-platform-auth.ts`:

1. For each `CrmUser` / `PortalUser` with email:
   - Upsert `PlatformUser` by email.
   - **Do not** copy password_hash if bcrypt parameters differ — safer: force set-password / magic link on first IdP login **or** copy hash if same bcrypt cost (12) and document.
2. Set `platform_user_id` on CRM/portal user rows.
3. If same email exists as both CrmUser and PortalUser: **one** PlatformUser; both rows link to same `sub` (person can be staff and partner — rare; allow).

### Step C — Enable OIDC login in UI

- “Belépés Sironic fiókkal” button.
- Keep password login until adoption metric OK.

### Step D — Enforce MFA for crm.admin (optional policy)

### Step E — Disable local passwords

- Remove credentials provider.
- Null out `password_hash` columns after backup.

### Step F — Deduplicate auth.ts

- Shared Auth.js config helper in `packages/auth` that only configures OIDC + session callbacks loading roles from DB.

---

## 4. Rollback

- Keep password hashes until E complete.
- Feature flag `AUTH_OIDC_ONLY=false` restores credentials provider.

---

## 5. Email uniqueness

Platform email is global. CRM tenant model remains; identity is global, authorization is app-local. If two tenants ever needed isolation of people, add `PlatformUserTenantMembership` — **not required** for single-tenant SIRONIC ops today.
