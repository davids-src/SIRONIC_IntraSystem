import { isPublicRegistrationEnabled } from "@erp/lib";
import { isOidcConfigured, oidcErrorMessage } from "@erp/auth/oidc";
import { LoginForm } from "./login-form";

// OIDC availability is read from runtime env, never baked in at build time.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ oidc?: string }>;
}) {
  const { oidc } = await searchParams;
  return (
    <LoginForm
      showRegisterLink={isPublicRegistrationEnabled()}
      oidcEnabled={isOidcConfigured()}
      oidcError={oidcErrorMessage(oidc)}
    />
  );
}
