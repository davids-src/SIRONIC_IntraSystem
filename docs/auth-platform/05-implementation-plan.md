# Auth Platform — 05 Implementation Plan

## Phases (program P6)

| Phase | Work                                              | Exit                 |
| ----- | ------------------------------------------------- | -------------------- |
| A     | `packages/auth-core` password/magic/TOTP/lockout  | Unit tests           |
| B     | WebAuthn passkey register/login                   | Lab demo             |
| C     | `apps/auth` UI (HU) + session                     | Manual login works   |
| D     | OIDC authorization code + PKCE + JWKS             | oidc-client test app |
| E     | Migrate CRM/portal dual login                     | Staff can use either |
| F     | Orchestrator registers OIDC client per deployment | Template can sign in |
| G     | Cutover + remove duplicate credentials            | OIDC only            |

## Dependencies

- Track 1 can ship without IdP (CRM keeps current auth).
- Track 3 template **requires** D+F for “same creds as platform”.
- SMTP already via `@sironic/emails` — reuse for magic/reset.

## Libraries (recommendations)

| Concern       | Library                                                        |
| ------------- | -------------------------------------------------------------- |
| OIDC provider | `oidc-provider` (Node) **or** carefully scoped custom + `jose` |
| WebAuthn      | `@simplewebauthn/server` + browser package                     |
| TOTP          | `otplib`                                                       |
| Password      | `bcryptjs` (existing)                                          |

## Acceptance

- Passkey-only user can log in.
- TOTP user cannot skip MFA.
- Lockout after repeated failures.
- Deployment Next app links local user on first OIDC login.
- Partner uses same email/password as portal to open their site (after invite/link).
