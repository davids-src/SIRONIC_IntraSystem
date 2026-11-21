import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { deploymentsApi } from "@erp/deployments";
import { SablonokTable } from "../_components/tablak";

export default async function SablonokPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("deployments:sablon:read");
  const canWrite = await hasPermission("deployments:sablon:write");
  const query = parseDataTableQuery(await searchParams);
  const { data, total } = await deploymentsApi.listSablonok(query);
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stack sablonok</h1>
          <p className="text-muted-foreground text-sm">
            Portainer compose sablonok helyőrzőkkel; a titkos helyőrzők értéke titkosítva
            tárolódik.
          </p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/telepitesek/sablonok/new">Új sablon</Link>
          </Button>
        )}
      </div>
      <SablonokTable data={data} query={query} total={total} szerkesztheto={canWrite} />
    </Container>
  );
}
