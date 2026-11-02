import { redirect } from "next/navigation";
import { isSafeReturnTo } from "@crm/auth-core";
import { connectAuthDb, PlatformUserModel } from "@crm/auth-core/server";
import { getSession } from "@/lib/session-cookie";
import { issuer } from "@/lib/issuer";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

function safeReturnTo(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (v && isSafeReturnTo(v, issuer())) return v;
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connectAuthDb();
  if ((await PlatformUserModel.estimatedDocumentCount()) === 0) {
    redirect("/setup");
  }
  if (await getSession()) {
    const params = await searchParams;
    redirect(safeReturnTo(params.return_to) ?? "/me");
  }
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
