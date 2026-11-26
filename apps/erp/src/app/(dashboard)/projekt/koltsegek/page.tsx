import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { projektApi } from "@erp/projekt";
import { PROJEKT_PERMISSIONS as P } from "@erp/projekt/client";
import { KoltsegekTable } from "../_components/koltsegek-table";

export default async function KoltsegekPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission(P.koltsegRead);
  const params = await searchParams;
  const canWrite = await hasPermission(P.koltsegWrite);
  const projektId = typeof params.projektId === "string" ? params.projektId : undefined;
  const archivaltakkal = params.archivalt === "1";
  const query = parseDataTableQuery(params);
  const { data, total } = await projektApi.listKoltsegek(
    query,
    { kind: "staff", userId: user.id },
    { projektId, archivaltakkal },
  );
  const alap = projektId ? `?projektId=${projektId}` : "";
  const archivHref = `/projekt/koltsegek${projektId ? `?projektId=${projektId}&archivalt=1` : "?archivalt=1"}`;

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Projektköltségek</h1>
          <p className="text-muted-foreground text-sm">
            {projektId ? "Egy projekt költségei." : "Minden projekt rögzített költsége."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={archivaltakkal ? `/projekt/koltsegek${alap}` : archivHref}>
              {archivaltakkal ? "Archiváltak elrejtése" : "Archiváltak mutatása"}
            </Link>
          </Button>
          {projektId && (
            <Button asChild variant="outline">
              <Link href={`/projekt/${projektId}`}>Vissza a projekthez</Link>
            </Button>
          )}
          {canWrite && (
            <Button asChild>
              <Link href={`/projekt/koltsegek/new${alap}`}>Új költség</Link>
            </Button>
          )}
        </div>
      </div>
      <KoltsegekTable data={data} query={query} total={total} szerkesztheto={canWrite} />
    </Container>
  );
}
