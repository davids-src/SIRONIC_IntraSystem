import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDb, CrmUserModel } from "@crm/db";
import { CrmShell } from "../crm-shell";
import { toSidebarUser } from "@/lib/shell-user";

/** Avoid DB during `next build` (no Mongo in CI); this tree always needs session + tenant checks at request time. */
export const dynamic = "force-dynamic";

export default async function CrmProtectedLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await connectDb();
  if ((await CrmUserModel.estimatedDocumentCount()) === 0) {
    redirect("/setup");
  }
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.roleKeys?.length) {
    redirect("/login");
  }
  const sidebarUser = toSidebarUser({
    name: session.user.name,
    email: session.user.email,
    roleKeys: session.user.roleKeys,
  });
  return <CrmShell sidebarUser={sidebarUser}>{children}</CrmShell>;
}
