import { hasPermission, requirePermission } from "@erp/auth";
import { Container, parseDataTableQuery } from "@erp/ui";
import { KESZLET_PERMISSIONS as P, keszletApi } from "@erp/keszlet";
import { LeltarLista } from "./_components/leltar-lista";
import { UjLeltar } from "./_components/uj-leltar";

export const dynamic = "force-dynamic";

export default async function LeltarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(P.keszletRead);
  const query = parseDataTableQuery(await searchParams);
  const [{ data, total }, helyek, canWrite] = await Promise.all([
    keszletApi.listLeltarak(query),
    keszletApi.listRaktarhelyek(),
    hasPermission(P.leltarWrite),
  ]);
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leltár</h1>
          <p className="text-muted-foreground text-sm">
            Raktárhelyenkénti leltározás: számolt és várt mennyiség, indoklás, korrekciós
            mozgások.
          </p>
        </div>
        {canWrite && (
          <UjLeltar helyek={helyek.map((h) => ({ kod: h.kod, nev: h.nev }))} />
        )}
      </div>
      <LeltarLista data={data} query={query} total={total} />
    </Container>
  );
}
