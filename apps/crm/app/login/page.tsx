import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDb, CrmUserModel } from "@crm/db";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  await connectDb();
  if ((await CrmUserModel.estimatedDocumentCount()) === 0) {
    redirect("/setup");
  }
  if (await auth()) {
    redirect("/");
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
      <LoginForm />
    </div>
  );
}
