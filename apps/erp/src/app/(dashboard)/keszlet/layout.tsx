import { requireAnyPermission } from "@erp/auth";

/** Any készlet read permission gets you into the shell — every page/action gates on its own key. */
export default async function KeszletLayout({ children }: { children: React.ReactNode }) {
  await requireAnyPermission(["keszlet:keszlet:read", "keszlet:rma:read"]);
  return <>{children}</>;
}
