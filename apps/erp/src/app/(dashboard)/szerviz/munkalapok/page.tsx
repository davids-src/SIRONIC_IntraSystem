import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { szervizApi } from "@erp/szerviz";
import { SZERVIZ_PERMISSIONS as P } from "@erp/szerviz/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { KpiTile } from "@/components/kpi-tile";
import { MunkalapTabla } from "../_components/lista-tablak";

export const dynamic = "force-dynamic";

export default async function MunkalapokPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission(P.munkalapRead);
  const params = await searchParams;
  const canWrite = await hasPermission(P.munkalapWrite);
  const archivaltakkal = params.archivalt === "1";
  const query = parseDataTableQuery(params);
  const nezo = { kind: "staff", userId: user.id } as const;
  const [{ data, total }, ossz] = await Promise.all([
    szervizApi.listMunkalapok(query, nezo, { archivaltakkal }),
    szervizApi.getMunkalapOsszesito(),
  ]);
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <PageHeader
        title="Munkalapok"
        subtitle="Elvégzett munkák, felhasznált anyagok és aláírások."
        actions={
          <>
            <Button asChild variant="outline">
              <Link
                href={
                  archivaltakkal
                    ? "/szerviz/munkalapok"
                    : "/szerviz/munkalapok?archivalt=1"
                }
              >
                {archivaltakkal ? "Archiváltak elrejtése" : "Archiváltak mutatása"}
              </Link>
            </Button>
            {canWrite && (
              <Button asChild>
                <Link href="/szerviz/munkalapok/new">Új munkalap</Link>
              </Button>
            )}
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiTile label="Piszkozat" value={ossz.piszkozat} tone="warning" icon={null} />
        <KpiTile
          label="Lezárt"
          hint="ebben a hónapban"
          value={ossz.lezartHonap}
          tone="success"
          icon={null}
        />
        <KpiTile
          label="Készletkiadás hibás"
          value={ossz.keszletHibas}
          tone={ossz.keszletHibas > 0 ? "danger" : "success"}
          icon={null}
        />
      </div>
      <MunkalapTabla data={data} query={query} total={total} />
    </Container>
  );
}
