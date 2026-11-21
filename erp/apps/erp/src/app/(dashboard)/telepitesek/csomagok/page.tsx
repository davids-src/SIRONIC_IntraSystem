import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { deploymentsApi } from "@erp/deployments";
import { CsomagokTable } from "../_components/tablak";

export default async function CsomagokPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("deployments:csomag:read");
  const canWrite = await hasPermission("deployments:csomag:write");
  const query = parseDataTableQuery(await searchParams);
  const { data, total } = await deploymentsApi.listCsomagok(query);
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Csomagok</h1>
          <p className="text-muted-foreground text-sm">
            Számlázási csomagok: ár, ciklus és erőforrások.
          </p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/telepitesek/csomagok/new">Új csomag</Link>
          </Button>
        )}
      </div>
      <CsomagokTable data={data} query={query} total={total} szerkesztheto={canWrite} />
    </Container>
  );
}
