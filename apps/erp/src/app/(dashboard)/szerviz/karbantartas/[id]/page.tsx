import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { Badge, Container } from "@erp/ui";
import { szervizApi } from "@erp/szerviz";
import {
  KARBANTARTAS_ALLAPOT_LABELS,
  SZERVIZ_PERMISSIONS as P,
} from "@erp/szerviz/client";
import {
  Facts,
  PageHeader,
  Section,
} from "@/app/(dashboard)/partner/_components/form-ui";
import { ArchiveControls } from "@/app/(dashboard)/partner/_components/archive-controls";
import {
  archivKarbantartasAction,
  generalHibajegyAction,
  visszaallitKarbantartasAction,
} from "../../actions";
import { AkcioGomb } from "../../_components/akcio-gomb";
import { KarbantartasForm } from "../../_components/karbantartas-form";
import { betoltPartnerOpciok } from "@/lib/szerviz-loaders";

export default async function KarbantartasTervPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission(P.karbantartasRead);
  const t = await szervizApi.getKarbantartas(id);
  if (!t) notFound();
  const [canWrite, canDelete] = await Promise.all([
    hasPermission(P.karbantartasWrite),
    hasPermission(P.karbantartasDelete),
  ]);
  const szerkesztheto = canWrite && !t.archivalt;
  const [partnerek, felhasznalok] = szerkesztheto
    ? await Promise.all([betoltPartnerOpciok(), szervizApi.listFelhasznalok()])
    : [[], []];
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-5">
      <PageHeader
        title={t.cim}
        subtitle={t.partnerNev}
        chips={
          <>
            <Badge variant={t.allapot === "lejart" ? "destructive" : "secondary"}>
              {KARBANTARTAS_ALLAPOT_LABELS[t.allapot]}
            </Badge>
            {t.archivalt && <Badge variant="outline">Archivált</Badge>}
          </>
        }
      />
      <Section title="Következő esedékesség">
        <Facts
          items={[
            { label: "Következő esedékes", value: t.kovetkezoEsedekes },
            { label: "Gyakoriság", value: `${t.intervallumHonap} hónap` },
            { label: "Generált ciklusok", value: String(t.utolsoCiklus + 1) },
            { label: "Felelős", value: t.felelosNev },
          ]}
        />
        {szerkesztheto && t.aktiv && (
          <div>
            <AkcioGomb
              action={generalHibajegyAction.bind(null, t.id)}
              label="Hibajegy generálása"
              variant="default"
              atiranyit={(ticketId) =>
                ticketId ? `/szerviz/hibajegyek/${ticketId}` : undefined
              }
            />
          </div>
        )}
      </Section>
      {szerkesztheto && (
        <Section title="Terv szerkesztése">
          <KarbantartasForm terv={t} partnerek={partnerek} felhasznalok={felhasznalok} />
        </Section>
      )}
      {canWrite && (
        <Section title="Archiválás">
          <ArchiveControls
            subject="karbantartási terv"
            archived={t.archivalt}
            archiveReason={t.archivalasOka}
            archiveAction={
              t.archivalt ? undefined : archivKarbantartasAction.bind(null, t.id)
            }
            restoreAction={
              canDelete ? visszaallitKarbantartasAction.bind(null, t.id) : undefined
            }
          />
        </Section>
      )}
    </Container>
  );
}
