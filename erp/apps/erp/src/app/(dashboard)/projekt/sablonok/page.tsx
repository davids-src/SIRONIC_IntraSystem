import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { projektApi } from "@erp/projekt";
import { PROJEKT_PERMISSIONS as P } from "@erp/projekt/client";
import { SablonokTable } from "../_components/sablonok-table";

export default async function SablonokPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(P.sablonRead);
  const params = await searchParams;
  const canWrite = await hasPermission(P.sablonWrite);
  const archivaltakkal = params.archivalt === "1";
  const query = parseDataTableQuery(params);
  const { data, total } = await projektApi.listSablonok(query, { archivaltakkal });

  return (
    <Container className="flex max-w-5xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ellenőrzőlista-sablonok</h1>
          <p className="text-muted-foreground text-sm">
            Újrahasznált tételsorok, amelyeket egy kattintással ráteheted egy projektre.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link
              href={
                archivaltakkal ? "/projekt/sablonok" : "/projekt/sablonok?archivalt=1"
              }
            >
              {archivaltakkal ? "Archiváltak elrejtése" : "Archiváltak mutatása"}
            </Link>
          </Button>
          {canWrite && (
            <Button asChild>
              <Link href="/projekt/sablonok/new">Új sablon</Link>
            </Button>
          )}
        </div>
      </div>
      <SablonokTable data={data} query={query} total={total} szerkesztheto={canWrite} />
    </Container>
  );
}
