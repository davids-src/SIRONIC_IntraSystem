import { requireAnyPermission } from "@erp/auth";

/** Any bizonylat read permission gets you into the module shell; every page gates itself. */
export default async function BizonylatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAnyPermission([
    "bizonylat:szallitolevel:read",
    "bizonylat:igazolas:read",
    "bizonylat:szamla:read",
    "bizonylat:jotallas:read",
  ]);
  return <>{children}</>;
}
