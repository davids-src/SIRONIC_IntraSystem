import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { arlistaApi, ARLISTA_PERMISSIONS as P } from "@erp/arlista";
import { TermekekTable } from "./_components/termekek-table";

export const dynamic = "force-dynamic";

export default async function TermekekPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission(P.termekRead);
  const canWrite = await hasPermission(P.termekWrite);
  const query = parseDataTableQuery(await searchParams);
  const viewer = { userId: user.id, permissions: user.permissions };
  const [{ data, total }, opciok] = await Promise.all([
    arlistaApi.listTermekek(viewer, query),
    arlistaApi.getTermekFilterOptions(),
  ]);

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Termék árlista</h1>
          <p className="text-muted-foreground text-sm">
            Termékek, munkadíjak és csomagok nettó árral. A beszerzési adatok külön
            jogosultsághoz kötöttek.
          </p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/arlista/termekek/new">Új tétel felvétele</Link>
          </Button>
        )}
      </div>
      <TermekekTable
        data={data}
        query={query}
        total={total}
        kategoriak={opciok.kategoria}
      />
    </Container>
  );
}
