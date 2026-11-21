import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { projektApi } from "@erp/projekt";
import { PROJEKT_PERMISSIONS as P, hetekSzama, isoHet } from "@erp/projekt/client";
import { HetiBoard } from "../_components/heti-board";

const szam = (v: string | string[] | undefined) =>
  typeof v === "string" && /^\d+$/.test(v) ? Number(v) : undefined;

export default async function HetiTervPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission(P.hetitervRead);
  const params = await searchParams;
  const most = isoHet(new Date());
  const ev = szam(params.ev) ?? most.ev;
  const het = Math.min(Math.max(szam(params.het) ?? most.het, 1), hetekSzama(ev));
  const felelos = typeof params.felelos === "string" ? params.felelos : "";
  const archivaltakkal = params.archivalt === "1";

  const [tervek, felhasznalok, projektek] = await Promise.all([
    projektApi.listHetiTervek({
      ev,
      het,
      felelosId: felelos || undefined,
      archivaltakkal,
    }),
    projektApi.listFelhasznalok(),
    projektApi.listProjektOpciok(),
  ]);
  const delegalhat = user.permissions.includes(P.hetitervDelegal);
  const irhat = delegalhat || user.permissions.includes(P.hetitervWrite);

  return (
    <Container className="flex max-w-7xl flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">Heti terv</h1>
        <p className="text-muted-foreground text-sm">
          A csapat heti feladatai. Bárki megtekintheti, módosítani csak a saját terved
          lehet
          {delegalhat ? " (delegálási joggal bárkiét)" : ""}.
        </p>
      </div>
      <HetiBoard
        tervek={tervek}
        ev={ev}
        het={het}
        felhasznalok={felhasznalok}
        projektek={projektek}
        sajatId={user.id}
        delegalhat={delegalhat}
        irhat={irhat}
        felelosSzuro={felelos}
        archivaltakkal={archivaltakkal}
      />
    </Container>
  );
}
