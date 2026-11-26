import { Button } from "@erp/ui";
import { PORTAL_PERMISSIONS } from "@erp/portal-auth/constants";
import { TopNav, type NavItem } from "@/components/top-nav";
import { logoutAction } from "@/lib/actions";
import { can } from "@/lib/nezo";
import { getPortalNezo } from "@/lib/portal-nezo";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const nezo = await getPortalNezo();
  const items: NavItem[] = [
    { href: "/", label: "Műszerfal" },
    { href: "/hibajegyek", label: "Hibajegyek" },
    { href: "/munkalapok", label: "Munkalapok" },
    { href: "/teljesitesigazolasok", label: "Teljesítésigazolások" },
    { href: "/projektek", label: "Projektek" },
    { href: "/oldalak", label: "Weboldalak" },
    { href: "/szamlak", label: "Számlák" },
    { href: "/jotallasok", label: "Jótállások" },
    ...(can(nezo, PORTAL_PERMISSIONS.usersManage)
      ? [{ href: "/csapat", label: "Csapat" }]
      : []),
  ];
  return (
    <>
      <header className="bg-card border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-bold tracking-widest">SIRONIC</span>
            <TopNav items={items} />
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {nezo.nev} · {nezo.partnerNev}
            </span>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                Kilépés
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
