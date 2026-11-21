import Link from "next/link";
import { LayersIcon, CheckCircle2Icon, FolderTreeIcon } from "lucide-react";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container } from "@erp/ui";
import { arlistaApi, ARLISTA_PERMISSIONS as P } from "@erp/arlista";
import { KpiTile } from "@/components/kpi-tile";
import { SzolgaltatasArlista } from "./_components/szolgaltatas-arlista";
import { SeedGomb } from "./_components/seed-gomb";

export const dynamic = "force-dynamic";

export default async function SzolgaltatasokPage() {
  await requirePermission(P.szolgaltatasRead);
  const [canWrite, canSettings] = await Promise.all([
    hasPermission(P.szolgaltatasWrite),
    hasPermission(P.beallitasWrite),
  ]);
  const [kategoriak, tetelek, beallitasok] = await Promise.all([
    arlistaApi.listKategoriak(),
    arlistaApi.listSzolgaltatasok(),
    arlistaApi.getBeallitasok(),
  ]);
  const aktiv = tetelek.filter((t) => t.aktiv).length;

  return (
    <Container className="flex max-w-7xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Szolgáltatás árlista</h1>
          <p className="text-muted-foreground text-sm">
            Kategóriák szerint rendezett szolgáltatások, ügyfélkategóriánként számolt árakkal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canSettings && (
            <Button asChild variant="outline">
              <Link href="/arlista/beallitasok">Árképzési beállítások</Link>
            </Button>
          )}
          {canWrite && (
            <>
              <Button asChild variant="outline">
                <Link href="/arlista/szolgaltatasok/kategoriak">Kategóriák</Link>
              </Button>
              <Button asChild>
                <Link href="/arlista/szolgaltatasok/new">Új szolgáltatás</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiTile label="Összes tétel" value={tetelek.length} icon={<LayersIcon className="size-5" />} />
        <KpiTile
          label="Aktív tételek"
          value={aktiv}
          tone="success"
          icon={<CheckCircle2Icon className="size-5" />}
        />
        <KpiTile
          label="Kategóriák"
          value={kategoriak.length}
          icon={<FolderTreeIcon className="size-5" />}
          href={canWrite ? "/arlista/szolgaltatasok/kategoriak" : undefined}
        />
      </div>

      {kategoriak.length === 0 ? (
        <div className="bg-card flex flex-col items-start gap-3 rounded-xl border p-6">
          <p className="text-sm">Még nincs szolgáltatás-kategória.</p>
          {canWrite && <SeedGomb />}
        </div>
      ) : (
        <SzolgaltatasArlista
          kategoriak={kategoriak}
          tetelek={tetelek}
          beallitasok={beallitasok}
          canWrite={canWrite}
        />
      )}
    </Container>
  );
}
