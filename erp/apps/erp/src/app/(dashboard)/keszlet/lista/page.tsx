import { requirePermission } from "@erp/auth";
import { Container, parseDataTableQuery } from "@erp/ui";
import {
  KESZLET_PERMISSIONS as P,
  NINCS_HELY_LABEL,
  canSeeErtek,
  keszletApi,
} from "@erp/keszlet";
import { KeszletTable } from "./_components/keszlet-table";

export const dynamic = "force-dynamic";

export default async function KeszletListaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission(P.keszletRead);
  const viewer = { userId: user.id, permissions: user.permissions };
  const query = parseDataTableQuery(await searchParams);
  const [{ data, total }, helyek] = await Promise.all([
    keszletApi.listKeszlet(viewer, query),
    keszletApi.listRaktarhelyek(),
  ]);
  const helyOpciok = [
    { value: "", label: NINCS_HELY_LABEL },
    ...helyek.map((h) => ({ value: h.kod, label: `${h.kod} — ${h.nev}` })),
  ];

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">Készletlista</h1>
        <p className="text-muted-foreground text-sm">
          Termékenként és raktárhelyenként: készlet, foglalt és szabad mennyiség.
        </p>
      </div>
      <KeszletTable
        data={data}
        query={query}
        total={total}
        helyek={helyOpciok}
        mutatErtek={canSeeErtek(viewer)}
      />
    </Container>
  );
}
