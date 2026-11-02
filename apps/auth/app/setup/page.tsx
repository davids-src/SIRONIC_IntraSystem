import { redirect } from "next/navigation";
import { connectAuthDb, PlatformUserModel } from "@crm/auth-core";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  await connectAuthDb();
  if ((await PlatformUserModel.estimatedDocumentCount()) > 0) {
    redirect("/login");
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
      <SetupForm />
    </div>
  );
}
