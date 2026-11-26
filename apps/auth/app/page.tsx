import { redirect } from "next/navigation";
import { connectAuthDb, PlatformUserModel } from "@crm/auth-core/server";
import { getSession } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await connectAuthDb();
  if ((await PlatformUserModel.estimatedDocumentCount()) === 0) {
    redirect("/setup");
  }
  const session = await getSession();
  redirect(session ? "/me" : "/login");
}
