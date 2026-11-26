import { redirect } from "next/navigation";
import { connectDB, hasAnyAdminUser } from "@erp/db-core";
import { SetupForm } from "./setup-form";

export default async function SetupPage() {
  await connectDB();
  if (await hasAnyAdminUser()) {
    redirect("/setup/complete");
  }

  return <SetupForm />;
}
