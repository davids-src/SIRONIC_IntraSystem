import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { KESZLET_PERMISSIONS as P, keszletApi } from "@erp/keszlet";
import { RmaLista } from "./_components/rma-lista";

export const dynamic = "force-dynamic";

export default async function RmaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(P.rmaRead);
  const query = parseDataTableQuery(await searchParams);
  const [{ data, total }, canWrite] = await Promise.all([
    keszletApi.listRma(query),
    hasPermission(P.rmaWrite),
  ]);
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">RMA ügyek</h1>
          <p className="text-muted-foreground text-sm">
            Hibás vagy visszaküldött termékek: beérkezéstől a beszállítói ügyintézésen át
            a lezárásig.
          </p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/keszlet/rma/new">Új RMA ügy</Link>
          </Button>
        )}
      </div>
      <RmaLista data={data} query={query} total={total} />
    </Container>
  );
}
