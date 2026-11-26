import { redirect } from "next/navigation";
import { connectAuthDb, PlatformUserModel } from "@crm/auth-core/server";
import { safeReturnTo, setupRedirectTarget } from "@/lib/redirect-target";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connectAuthDb();
  const params = await searchParams;
  const returnTo = safeReturnTo(params.return_to);
  const userCount = await PlatformUserModel.estimatedDocumentCount();
  const target = setupRedirectTarget({ userCount, returnTo });
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
      <SetupForm returnTo={returnTo} />
    </div>
  );
}
