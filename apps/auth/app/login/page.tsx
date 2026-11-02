import { redirect } from "next/navigation";
import { connectAuthDb, PlatformUserModel } from "@crm/auth-core";
import { getSession } from "@/lib/session-cookie";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await connectAuthDb();
  if ((await PlatformUserModel.estimatedDocumentCount()) === 0) {
    redirect("/setup");
  }
  if (await getSession()) {
    redirect("/me");
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
