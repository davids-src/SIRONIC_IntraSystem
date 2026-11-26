import Link from "next/link";
import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { Badge, Button } from "@erp/ui";
import { projektApi } from "@erp/projekt";
import {
  PROJEKT_ALLAPOT_LABELS,
  PROJEKT_ALLAPOT_TONES,
  PROJEKT_PERMISSIONS as P,
} from "@erp/projekt/client";
import {
  DangerZone,
  DetailHeader,
  Facts,
  Section,
  ConfirmDeleteButton,
  datum,
} from "../_components/layout";
import { ArchivGombok } from "../_components/kozos";
import {
  AllapotGombok,
  AlaprajzPanel,
  ChecklistPanel,
  FazisokPanel,
  StagingPanel,
} from "../_components/projekt-panelek";
import {
  archiveProjektAction,
  deleteProjektAction,
  restoreProjektAction,
} from "../actions";

export default async function ProjektAdatlapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(P.projektRead);
  const nezo = { kind: "staff", userId: user.id } as const;
  const projekt = await projektApi.getProjekt(id, nezo);
  if (!projekt) notFound();

  const [canWrite, canDelete, canKoltseg, canSablon] = await Promise.all([
    hasPermission(P.projektWrite),
    hasPermission(P.projektDelete),
    hasPermission(P.koltsegRead),
    hasPermission(P.sablonRead),
  ]);
  const [koltseg, alaprajzok, sablonok] = await Promise.all([
    canKoltseg ? projektApi.getKoltsegOsszesito(id, nezo) : null,
    projektApi.listAlaprajzok({ projektId: id, archivaltakkal: true }),
    canSablon && canWrite ? projektApi.listAktivSablonok() : [],
  ]);
  const szerkeszthet = canWrite && !projekt.archivalt;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:gap-5 md:p-6">
      <DetailHeader
        title={projekt.nev}
        subtitle={[projekt.azonosito, projekt.partnerNev].filter(Boolean).join(" · ")}
        backHref="/projekt"
        backLabel="Vissza a projektekhez"
        chips={
          <>
            <Badge variant={PROJEKT_ALLAPOT_TONES[projekt.allapot]}>
              {PROJEKT_ALLAPOT_LABELS[projekt.allapot]}
            </Badge>
            <Badge variant="neutral">{projekt.szazalek}% kész</Badge>
            {projekt.portalLathato && <Badge variant="info">Partnernek látható</Badge>}
            {projekt.archivalt && <Badge variant="warning">Archivált</Badge>}
          </>
        }
        actions={
          <>
            {canKoltseg && (
              <Button asChild variant="outline">
                <Link href={`/projekt/koltsegek?projektId=${projekt.id}`}>Költségek</Link>
              </Button>
            )}
            {szerkeszthet && (
              <Button asChild variant="outline">
                <Link href={`/projekt/${projekt.id}/edit`}>Szerkesztés</Link>
              </Button>
            )}
          </>
        }
      />

      {szerkeszthet && (
        <AllapotGombok
          id={projekt.id}
          allapot={projekt.allapot}
          portalLathato={projekt.portalLathato}
          archivalt={projekt.archivalt}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Section title="Fázisok" mode={szerkeszthet ? "editable" : "readonly"}>
            <FazisokPanel
              id={projekt.id}
              fazisok={projekt.fazisok}
              szerkeszthet={szerkeszthet}
            />
          </Section>
          <Section title="Ellenőrzőlista" mode={szerkeszthet ? "editable" : "readonly"}>
            <ChecklistPanel
              id={projekt.id}
              checklist={projekt.checklist}
              sablonok={sablonok}
              szerkeszthet={szerkeszthet}
            />
          </Section>
          <Section title="Staging linkek" mode={szerkeszthet ? "editable" : "readonly"}>
            <StagingPanel
              id={projekt.id}
              linkek={projekt.stagingLinkek}
              szerkeszthet={szerkeszthet}
            />
          </Section>
          <Section title="Alaprajzok" mode={szerkeszthet ? "editable" : "readonly"}>
            <AlaprajzPanel
              projektId={projekt.id}
              partnerId={projekt.partnerId}
              alaprajzok={alaprajzok}
              szerkeszthet={szerkeszthet}
            />
          </Section>
        </div>
        <aside className="flex flex-col gap-4">
          <Section title="Alapadatok" mode="readonly">
            <Facts
              items={[
                { label: "Partner", value: projekt.partnerNev },
                { label: "Felelős", value: projekt.felelosNev },
                { label: "Kategória", value: projekt.kategoria },
                { label: "Kezdet", value: datum(projekt.kezdet) },
                { label: "Határidő", value: datum(projekt.hatarido) },
                { label: "Lezárva", value: datum(projekt.lezarasIdopont) },
                { label: "Tervezett órák", value: projekt.tervezettOrak },
                ...(koltseg
                  ? [
                      {
                        label: "Költségek (nettó)",
                        value: `${koltseg.osszeg.toLocaleString("hu-HU")} ${koltseg.penznem} · ${koltseg.db} tétel`,
                      },
                    ]
                  : []),
              ]}
            />
          </Section>
          {projekt.leiras && (
            <Section title="Leírás" mode="readonly">
              <p className="text-sm whitespace-pre-wrap">{projekt.leiras}</p>
            </Section>
          )}
          {projekt.belsoJegyzet && (
            <Section
              title="Belső jegyzet"
              mode="readonly"
              description="A partner soha nem látja."
            >
              <p className="text-sm whitespace-pre-wrap">{projekt.belsoJegyzet}</p>
            </Section>
          )}
          {canWrite && (
            <Section title="Archiválás" mode="editable">
              <ArchivGombok
                alany="projekt"
                archivalt={projekt.archivalt}
                ok={projekt.archivalasOka}
                onArchive={archiveProjektAction.bind(null, projekt.id)}
                onRestore={restoreProjektAction.bind(null, projekt.id)}
              />
            </Section>
          )}
        </aside>
      </div>

      {canDelete && (
        <DangerZone
          description={
            koltseg && koltseg.db > 0
              ? "Költséggel rendelkező projekt nem törölhető — archiváld."
              : "A törlés nem vonható vissza (az alaprajzok is törlődnek)."
          }
        >
          <ConfirmDeleteButton
            onDelete={deleteProjektAction.bind(null, projekt.id)}
            title={`${projekt.azonosito} törlése`}
            description="A projekt véglegesen törlődik. Költséggel rendelkező projekt nem törölhető."
            redirectTo="/projekt"
          />
        </DangerZone>
      )}
    </div>
  );
}
