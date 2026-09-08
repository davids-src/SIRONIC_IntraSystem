# Auth Platform — 02 Data Model

Prefer a dedicated MongoDB database `sironic_auth` on the same cluster (isolation) with its own models in `packages/auth-core` or `packages/db-auth`. Shared cluster URI with different DB name is fine.

---

## 1. `PlatformUser` (identity)

```ts
{
  _id: ObjectId,
  email: string,                 // unique, lowercase
  email_verified_at: Date | null,
  display_name: string | null,
  status: "active" | "disabled" | "locked",
  password_hash: string | null,  // null if passkey-only
  failed_login_count: number,
  locked_until: Date | null,
  totp: {
    enabled: boolean,
    // AES-GCM encrypted secret
    encrypted_secret: string | null,
    confirmed_at: Date | null,
  },
  recovery_codes_hashes: string[],  // bcrypt/sha256 of single-use codes
  created_at, updated_at
}
```

---

## 2. `WebAuthnCredential`

```ts
{
  user_id: string,
  credential_id: string,         // base64url unique
  public_key: Binary | string,
  counter: number,
  transports: string[],
  device_name: string | null,
  created_at, last_used_at
}
```

---

## 3. `MagicToken` / embed on user

Prefer fields on `PlatformUser` (match existing CRM pattern):

```ts
(magic_token_hash, magic_token_expires);
(reset_token_hash, reset_token_expires);
```

---

## 4. `OidcClient` (relying parties)

```ts
{
  client_id: string,             // public id
  client_secret_hash: string,    // or encrypted secret for confidential clients
  name: string,
  type: "crm" | "portal" | "deployment" | "other",
  redirect_uris: string[],
  post_logout_redirect_uris: string[],
  grant_types: ["authorization_code"],
  token_endpoint_auth_method: "client_secret_basic" | "none", // public + PKCE for SPAs
  // deployment linkage
  deployment_id: string | null,  // CRM Deployment._id when type=deployment
  contact_id: string | null,
  tenantId: string | null,       // SIRONIC tenant for CRM/portal clients
  created_at, updated_at
}
```

Public clients (Next deployments) use **PKCE** + `token_endpoint_auth_method: none` where possible; confidential if server-side only.

---

## 5. `OidcAuthorizationCode` / `OidcRefreshToken`

Store hashed codes/tokens with expiry, client_id, user_id, scope, code_challenge.

Or use a mature library (e.g. **oidc-provider**, **Panva oauth4webapi** + custom store). Spec requirement: authorization code + PKCE + refresh optional.

---

## 6. Account linking (on each relying party)

Not in auth DB — in CRM / portal / deployment DBs:

### CRM / Portal (after migration)

```ts
CrmUser.platform_user_id: string | null
PortalUser.platform_user_id: string | null
```

### Deployment local user

```ts
{
  email: string,
  role: string,
  platform_user_id: string,      // IdP `sub`
  platform_email: string,
  last_login_at: Date,
  // local-only profile fields...
}
```

Unique index on `platform_user_id` per deployment DB.

---

## 7. Sessions

Auth app: encrypted JWT or server session store.  
OIDC: short-lived access token + id_token (`sub`, `email`, `email_verified`).

Claims for CRM/portal bridge may include custom `sironic_roles` only if users are linked — **prefer** looking up roles in CRM DB by `platform_user_id` after login, not encoding RBAC in IdP.
