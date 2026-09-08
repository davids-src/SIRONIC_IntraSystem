# Next Template — 02 Auth Client

## 1. Local users + platform link

Each deployment database has:

```ts
// LocalUser
{
  email: string,
  display_name: string | null,
  role: "admin" | "editor" | "viewer",
  platform_user_id: string | null,  // IdP sub
  invited_at: Date | null,
  invite_token_hash: string | null,
  created_at, updated_at
}
```

Passwords are **not** required locally when OIDC is enabled. Optional local password only for break-glass (discouraged).

---

## 2. Auth.js / NextAuth provider

```ts
providers: [
  {
    id: "sironic",
    name: "Sironic",
    type: "oidc",
    issuer: process.env.PLATFORM_AUTH_ISSUER,
    clientId: process.env.PLATFORM_AUTH_CLIENT_ID,
    clientSecret: process.env.PLATFORM_AUTH_CLIENT_SECRET, // may be empty with PKCE public client
    checks: ["pkce", "state"],
  },
];
```

Callbacks:

- On sign-in, run account-linking algorithm from [`../auth-platform/03-oidc-and-linking.md`](../auth-platform/03-oidc-and-linking.md).
- Session includes `localUserId`, `role`.

---

## 3. Invite flow

1. Site admin (or CRM later) creates `LocalUser` with email + invite token.
2. User opens invite link → redirected to IdP login → link `platform_user_id`.
3. Without invite, OIDC login fails closed (`allowAutoProvision=false`).

Partner portal “add employee to deployment” (future): CRM API creates local user via deployment **admin API** secured by machine token — optional; MVP invites from site admin UI.

---

## 4. Parity with portal credentials

Same email on IdP means one password/passkey/TOTP for portal and all deployments they were invited to. Authorization remains per-app.
