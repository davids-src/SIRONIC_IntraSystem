import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { bizonylatApi } from "@erp/bizonylat";
import { BIZONYLAT_PERMISSIONS as P } from "@erp/bizonylat/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { IgazolasTabla } from "../_components/lista-tablak";

export const dynamic = "force-dynamic";

const FT = new Intl.NumberFormat("hu-HU");

function Csempe({ cim, ertek, alcim }: { cim: string; ertek: string; alcim?: string }) {
  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm">
      <p className="text-muted-foreground text-xs">{cim}</p>
      <p className="text-xl font-semibold">{ertek}</p>
      {alcim && <p className="text-muted-foreground text-xs">{alcim}</p>}
    </div>
  );
}

export default async function IgazolasokPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission(P.igazolasRead);
  const params = await searchParams;
  const canWrite = await hasPermission(P.igazolasWrite);
  const archivaltakkal = params.archivalt === "1";
  const query = parseDataTableQuery(params);
  const nezo = { kind: "staff", userId: user.id, belsoLathato: canWrite } as const;
  const [{ data, total }, kpi] = await Promise.all([
    bizonylatApi.listIgazolasok(query, nezo, { archivaltakkal }),
    bizonylatApi.osszesitesIgazolas(nezo),
  ]);
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <PageHeader
        title="Teljesítésigazolások"
        subtitle="Ügyfél általi online aláírás."
        actions={
          <>
            <Button asChild variant="outline">
              <Link
                href={
                  archivaltakkal
                    ? "/bizonylat/igazolasok"
                    : "/bizonylat/igazolasok?archivalt=1"
                }
              >
                {archivaltakkal ? "Archiváltak elrejtése" : "Archiváltak mutatása"}
              </Link>
            </Button>
            {canWrite && (
              <Button asChild>
                <Link href="/bizonylat/igazolasok/new">Új igazolás</Link>
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Csempe
          cim="Aláírt érték (bruttó)"
          ertek={`${FT.format(kpi.alairtBrutto)} Ft`}
          alcim={`${kpi.alairtDb} db · nettó ${FT.format(kpi.alairtNetto)} Ft`}
        />
        <Csempe
          cim="Aláírásra vár (bruttó)"
          ertek={`${FT.format(kpi.fuggoBrutto)} Ft`}
          alcim={`${kpi.fuggoDb} db · nettó ${FT.format(kpi.fuggoNetto)} Ft`}
        />
        <Csempe cim="Elutasított" ertek={String(kpi.elutasitottDb)} />
        <Csempe cim="Piszkozat" ertek={String(kpi.piszkozatDb)} />
      </div>
      <IgazolasTabla data={data} query={query} total={total} />
    </Container>
  );
}
