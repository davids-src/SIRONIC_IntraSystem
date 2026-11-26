import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@erp/ui";
import { PageHeader } from "@/components/page";
import { getPortalNezo } from "@/lib/portal-nezo";
import { portalMuszerfal } from "@/lib/portal-api";

export const metadata = { title: "Műszerfal" };

export default async function MuszerfalPage() {
  const nezo = await getPortalNezo();
  const d = await portalMuszerfal(nezo);
  const csempek = [
    { href: "/hibajegyek", cim: "Nyitott hibajegyek", ertek: d.nyitottHibajegy },
    {
      href: "/teljesitesigazolasok",
      cim: "Aláírásra váró igazolások",
      ertek: d.fuggoIgazolas,
    },
    { href: "/munkalapok", cim: "Lezárt munkalapok", ertek: d.munkalapDb },
    { href: "/projektek", cim: "Folyamatban lévő projektek", ertek: d.nyitottProjekt },
    { href: "/oldalak", cim: "Weboldalak", ertek: d.oldalDb },
    { href: "/szamlak", cim: "Lejárt számlák", ertek: d.lejartSzamla },
  ];
  return (
    <>
      <PageHeader title="Műszerfal" description={`${nezo.partnerNev} — áttekintés`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {csempek.map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className="hover:bg-muted/40 transition-colors">
              <CardHeader>
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {c.cim}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{c.ertek}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
