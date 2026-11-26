import { redirect } from "next/navigation";
import { connectAuthDb, PlatformUserModel } from "@crm/auth-core/server";
import { getSession } from "@/lib/session-cookie";
import { safeReturnTo, loginRedirectTarget } from "@/lib/redirect-target";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connectAuthDb();
  const params = await searchParams;
  const returnTo = safeReturnTo(params.return_to);
  const userCount = await PlatformUserModel.estimatedDocumentCount();
  const hasSession = Boolean(await getSession());
  const target = loginRedirectTarget({ userCount, hasSession, returnTo });
  if (target) redirect(target);
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <LoginForm />
    </div>
  );
}
