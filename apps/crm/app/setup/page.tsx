import { redirect } from "next/navigation";
import { connectDb, CrmUserModel } from "@crm/db";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  await connectDb();
  if ((await CrmUserModel.estimatedDocumentCount()) > 0) {
    redirect("/login");
  }
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "var(--color-bg, #0a0a0a)",
      }}
    >
      <SetupForm />
    </div>
  );
}
