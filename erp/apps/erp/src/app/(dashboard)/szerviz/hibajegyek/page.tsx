import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { szervizApi } from "@erp/szerviz";
import { SZERVIZ_PERMISSIONS as P } from "@erp/szerviz/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { KpiTile } from "@/components/kpi-tile";
import { HibajegyTabla } from "../_components/lista-tablak";

export const dynamic = "force-dynamic";

export default async function HibajegyekPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission(P.hibajegyRead);
  const params = await searchParams;
  const canWrite = await hasPermission(P.hibajegyWrite);
  const archivaltakkal = params.archivalt === "1";
  const query = parseDataTableQuery(params);
  const nezo = { kind: "staff", userId: user.id } as const;
  const [{ data, total }, osszegzes] = await Promise.all([
    szervizApi.listHibajegyek(query, nezo, { archivaltakkal }),
    szervizApi.getOsszegzes(),
  ]);
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <PageHeader
        title="Hibajegyek"
        subtitle="Bejelentett hibák és karbantartási feladatok."
        actions={
          <>
            <Button asChild variant="outline">
              <Link
                href={
                  archivaltakkal
                    ? "/szerviz/hibajegyek"
                    : "/szerviz/hibajegyek?archivalt=1"
                }
              >
                {archivaltakkal ? "Archiváltak elrejtése" : "Archiváltak mutatása"}
              </Link>
            </Button>
            {canWrite && (
              <Button asChild>
                <Link href="/szerviz/hibajegyek/new">Új hibajegy</Link>
              </Button>
            )}
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Nyitott" value={osszegzes.nyitott} tone="info" icon={null} />
        <KpiTile
          label="Új"
          value={osszegzes.uj}
          tone={osszegzes.uj > 0 ? "warning" : "success"}
          icon={null}
        />
        <KpiTile
          label="Várakozik"
          value={osszegzes.varakozik}
          tone="neutral"
          icon={null}
        />
        <KpiTile
          label="Kritikus"
          hint="nyitott"
          value={osszegzes.kritikus}
          tone={osszegzes.kritikus > 0 ? "danger" : "success"}
          icon={null}
        />
      </div>
      <HibajegyTabla data={data} query={query} total={total} />
    </Container>
  );
}
