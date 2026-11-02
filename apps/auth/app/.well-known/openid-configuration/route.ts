import { NextResponse } from "next/server";
import { issuer } from "@/lib/issuer";

export async function GET() {
  const iss = issuer();
  return NextResponse.json({
    issuer: iss,
    authorization_endpoint: `${iss}/api/oidc/authorize`,
    token_endpoint: `${iss}/api/oidc/token`,
    userinfo_endpoint: `${iss}/api/oidc/userinfo`,
    jwks_uri: `${iss}/jwks.json`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["EdDSA"],
    scopes_supported: ["openid", "email", "profile"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "none"],
    code_challenge_methods_supported: ["S256"],
    grant_types_supported: ["authorization_code"],
    claims_supported: ["sub", "email", "email_verified", "name"],
  });
}
