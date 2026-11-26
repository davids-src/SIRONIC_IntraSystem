import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { Badge, Container, ListBackLink } from "@erp/ui";
import { arlistaApi, ARLISTA_PERMISSIONS as P } from "@erp/arlista";
import { TermekForm } from "../_components/termek-form";
import { BeszerzesPanel } from "../_components/beszerzes-panel";
import { ArchivalasKezelo } from "./archivalas-kezelo";

export const dynamic = "force-dynamic";

export default async function TermekAdatlapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(P.termekRead);
  const { id } = await params;
  const termek = await arlistaApi.getTermek(
    { userId: user.id, permissions: user.permissions },
    id,
  );
  if (!termek) notFound();
  const [canWrite, canWriteBeszerzes] = await Promise.all([
    hasPermission(P.termekWrite),
    hasPermission(P.beszerzesWrite),
  ]);

  return (
    <Container className="flex max-w-4xl flex-col gap-6">
      <div>
        <ListBackLink href="/arlista/termekek">Vissza a termék árlistához</ListBackLink>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{termek.nev}</h1>
          <span className="text-muted-foreground font-mono text-sm">{termek.kod}</span>
          {termek.archivalt && <Badge variant="warning">Archivált</Badge>}
        </div>
        {termek.archivalt && termek.archivalasOka && (
          <p className="text-muted-foreground mt-1 text-sm">Ok: {termek.archivalasOka}</p>
        )}
      </div>

      {canWrite && !termek.archivalt && <TermekForm termek={termek} />}
      {canWrite && <ArchivalasKezelo id={termek._id} archivalt={termek.archivalt} />}

      {termek.beszerzes && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Beszerzési adatok (titkos)</h2>
          <BeszerzesPanel
            termekId={termek._id}
            adatok={termek.beszerzes.beszerzesiAdatok}
            utolsoBeszerzesiAr={termek.beszerzes.utolsoBeszerzesiAr}
            elonyosBeszallito={termek.beszerzes.elonyosBeszallito}
            canWrite={canWriteBeszerzes}
          />
        </section>
      )}
    </Container>
  );
}
