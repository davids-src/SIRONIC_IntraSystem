import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { partnerApi } from "@erp/partner";
import { Button, Container } from "@erp/ui";
import { infraApi } from "@erp/infra";
import { SzinkronGomb } from "../_components/muveletek";
import { imageRovid } from "../_components/megjelenites";
import { StackokTabla } from "../_components/tablak";

export default async function StackekPage() {
  await requirePermission("infra:stack:read");
  const [irhat, muvelhet, partnerek, { stackek, arva }] = await Promise.all([
    hasPermission("infra:stack:write"),
    hasPermission("infra:stack:muvelet"),
    partnerApi.listPartnerOptions(),
    infraApi.listStackek(),
  ]);
  const nevek = new Map(partnerek.map((p) => [p.id, p.nev]));
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stackek</h1>
          <p className="text-muted-foreground text-sm">
            Egy stack egy Portainer stack: egy projekt vagy szolgáltatás összes
            image-ével. A hozzá tartozó oldalak (domainek) a stack adatlapján vannak.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {muvelhet && <SzinkronGomb />}
          {irhat && (
            <Button asChild>
              <Link href="/infra/stackek/new">Új stack</Link>
            </Button>
          )}
        </div>
      </div>

      <StackokTabla
        rows={stackek.map((s) => ({
          id: s.id,
          nev: s.nev,
          tipus: s.tipus,
          allapot: s.allapot,
          konteynerek: `${s.futoSzam}/${s.konteneriSzam}`,
          imagek: s.imagek.map(imageRovid).join(", "),
          oldalSzam: s.oldalSzam,
          partner: s.partnerId ? (nevek.get(s.partnerId) ?? "") : "",
        }))}
      />
      {arva.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {arva.length} konténer nem tartozik Portainer stackhez (lásd az Áttekintést).
        </p>
      )}
    </Container>
  );
}
