import { requireAnyPermission } from "@erp/auth";

/** Any szerviz read permission gets you into the module shell; every page gates itself. */
export default async function SzervizLayout({ children }: { children: React.ReactNode }) {
  await requireAnyPermission([
    "szerviz:hibajegy:read",
    "szerviz:munkalap:read",
    "szerviz:karbantartas:read",
  ]);
  return <>{children}</>;
}
