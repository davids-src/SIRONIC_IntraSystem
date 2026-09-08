# Auth Platform — 03 OIDC and Account Linking

## 1. Discovery

```http
GET https://auth.example.com/.well-known/openid-configuration
```

Standard endpoints:

| Endpoint         | Purpose             |
| ---------------- | ------------------- |
| `GET /authorize` | Auth request        |
| `POST /token`    | Code exchange       |
| `GET /userinfo`  | Profile             |
| `GET /jwks.json` | Signature keys      |
| `POST /revoke`   | Optional            |
| `GET /logout`    | RP-initiated logout |

---

## 2. Authorization request (deployment)

```text
/authorize?
  client_id=dep_xxx
  &redirect_uri=https://partner-site.example/api/auth/callback/sironic
  &response_type=code
  &scope=openid email profile
  &state=...
  &code_challenge=...
  &code_challenge_method=S256
  &login_hint=user@example.com
```

---

## 3. Token response

```json
{
  "access_token": "...",
  "id_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**id_token claims:** `iss`, `sub`, `aud`, `exp`, `iat`, `email`, `email_verified`, `name`.

`sub` is stable `PlatformUser._id` string.

---

## 4. Account linking algorithm (deployment)

On successful OIDC callback:

```
sub = id_token.sub
email = id_token.email

local = LocalUser.findByPlatformUserId(sub)
if (!local) {
  local = LocalUser.findByEmail(email)
  if (local && !local.platform_user_id) {
    // link existing local account (same as Google link)
    local.platform_user_id = sub
  } else if (!local) {
    if (allowAutoProvision) {
      local = LocalUser.create({ email, platform_user_id: sub, role: defaultRole })
    } else {
      reject: "Nincs jogosultságod ehhez a site-hoz — kérj meghívót"
    }
  } else {
    // email taken by different platform link
    reject conflict
  }
}
createAppSession(local)
```

**Who can access which deployment:** CRM/portal already control partner employees. For site admins:

- Option A: Partner admin on portal grants `PartnerDeploymentAccess` + deployment app reads a **provisioning API** from CRM to allowlist emails.
- Option B: First OIDC login only if email already invited into local users table (manual/CRM sync).

**Recommended MVP for template:** Option B — local invite table; OIDC only links. Portal “add user to deployment” creates local allowlist row via CRM API or deployment admin webhook.

---

## 5. CRM / Portal as OIDC clients

Phased:

1. **Bridge mode:** Keep NextAuth; add `Sironic` provider (OAuth) alongside credentials.
2. **Cutover:** Disable credentials; IdP only.
3. Remove password hashes from `CrmUser` / `PortalUser` after all linked.

Session still carries `tenantId`, `roleKeys`, `contactId` loaded from DB by `platform_user_id`.

---

## 6. Registering a deployment client

When orchestrator finishes `stack_deploy` (or on wizard):

1. Create `OidcClient` with redirect `https://{domain}/api/auth/callback/sironic`.
2. Inject `PLATFORM_AUTH_ISSUER`, `PLATFORM_AUTH_CLIENT_ID`, `PLATFORM_AUTH_CLIENT_SECRET` (if any) into stack env.
3. Store client id on `Deployment.external_ids` or `meta.oidc_client_id`.

---

## 7. Security notes

- PKCE mandatory for public clients.
- Redirect URI exact match.
- Rotate JWKS; keep old keys during overlap.
- Rate-limit `/authorize` and password endpoints.
- Passkeys bound to auth RP ID — deployments do **not** re-implement WebAuthn; they rely on IdP.
