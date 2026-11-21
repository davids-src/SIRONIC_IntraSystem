import Link from "next/link";
import { hasPermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { BIZONYLAT_PERMISSIONS as P } from "@erp/bizonylat/client";
import { PageHeader, Section } from "@/app/(dashboard)/partner/_components/form-ui";

export const dynamic = "force-dynamic";

const KARTYAK = [
  {
    href: "/bizonylat/szallitolevelek",
    cim: "Szállítólevelek",
    leiras: "Kiadás a készletből, elérhetőség-ellenőrzéssel.",
    jog: P.szallitolevelRead,
  },
  {
    href: "/bizonylat/igazolasok",
    cim: "Teljesítésigazolások",
    leiras: "Ügyfél általi online aláírás.",
    jog: P.igazolasRead,
  },
  {
    href: "/bizonylat/szamlak",
    cim: "Számlák",
    leiras: "Billingo-s számlák állapota, lejárat.",
    jog: P.szamlaRead,
  },
  {
    href: "/bizonylat/jotallasok",
    cim: "Jótállási jegyek",
    leiras: "Jegyek kiállítása és nyomtatása.",
    jog: P.jotallasRead,
  },
] as const;

export default async function BizonylatPage() {
  const lathato = await Promise.all(KARTYAK.map((k) => hasPermission(k.jog)));
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <PageHeader
        title="Bizonylatok"
        subtitle="Szállítólevél, igazolás, számla, jótállás."
      />
      <Section title="Bizonylattípusok">
        <ul className="grid gap-3 sm:grid-cols-2">
          {KARTYAK.filter((_, i) => lathato[i]).map((k) => (
            <li key={k.href} className="rounded-lg border p-3">
              <Link href={k.href} className="font-medium underline">
                {k.cim}
              </Link>
              <p className="text-muted-foreground text-sm">{k.leiras}</p>
            </li>
          ))}
        </ul>
      </Section>
    </Container>
  );
}
