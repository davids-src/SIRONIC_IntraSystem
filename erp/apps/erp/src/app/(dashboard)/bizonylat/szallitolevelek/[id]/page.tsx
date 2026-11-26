import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { hasPermission, requirePermission } from "@erp/auth";
import { Badge, Button, Container } from "@erp/ui";
import { bizonylatApi } from "@erp/bizonylat";
import {
  BIZONYLAT_PERMISSIONS as P,
  KESZLET_KIADAS_LABELS,
  SZALLITOLEVEL_ALLAPOT_LABELS,
} from "@erp/bizonylat/client";
import {
  Facts,
  PageHeader,
  Section,
} from "@/app/(dashboard)/partner/_components/form-ui";
import { ArchiveControls } from "@/app/(dashboard)/partner/_components/archive-controls";
import {
  archivSzallitolevelAction,
  kiadSzallitolevelAction,
  sztornoSzallitolevelAction,
  ujraKiadSzallitolevelAction,
  visszaallitSzallitolevelAction,
} from "../../actions";
import { AkcioForm } from "../../_components/akcio-form";
import { PreflightDialog } from "../../_components/preflight-dialog";

const FT = new Intl.NumberFormat("hu-HU");
const datum = (iso?: string) => (iso ? new Date(iso).toLocaleString("hu-HU") : undefined);

export default async function SzallitolevelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission(P.szallitolevelRead);
  const d = await bizonylatApi.getSzallitolevel(id);
  if (!d) notFound();
  const [canWrite, canKiad, canDelete] = await Promise.all([
    hasPermission(P.szallitolevelWrite),
    hasPermission(P.szallitolevelKiad),
    hasPermission(P.szallitolevelDelete),
  ]);
  const piszkozat = d.allapot === "piszkozat" && !d.archivalt;

  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-5">
      <PageHeader
        title={d.azonosito}
        subtitle={d.partnerNev}
        chips={
          <>
            <Badge variant="secondary">{SZALLITOLEVEL_ALLAPOT_LABELS[d.allapot]}</Badge>
            {d.archivalt && <Badge variant="outline">Archivált</Badge>}
            {d.keszletKiadas && (
              <Badge
                variant={d.keszletKiadas.allapot === "hiba" ? "destructive" : "outline"}
              >
                {KESZLET_KIADAS_LABELS[d.keszletKiadas.allapot]}
              </Badge>
            )}
          </>
        }
        actions={
          canWrite && piszkozat ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/bizonylat/szallitolevelek/${d.id}/edit`}>
                <PencilIcon className="mr-1 size-4" />
                Szerkesztés
              </Link>
            </Button>
          ) : undefined
        }
      />
      <Section title="Adatok">
        <Facts
          items={[
            { label: "Kiadás napja", value: d.kiadasNap },
            { label: "Projekt", value: d.projektId },
            { label: "Készletlevonás eredménye", value: d.keszletKiadas?.uzenet },
            { label: "Készletlevonás ideje", value: datum(d.keszletKiadas?.idopont) },
          ]}
        />
        {d.megjegyzes && <p className="text-sm whitespace-pre-line">{d.megjegyzes}</p>}
      </Section>
      <Section title="Tételek">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead className="text-muted-foreground text-left text-xs">
              <tr>
                <th className="p-1">Megnevezés</th>
                <th className="p-1 text-right">Mennyiség</th>
                <th className="p-1">Raktárhely</th>
              </tr>
            </thead>
            <tbody>
              {d.sorok.map((s, i) => (
                <tr key={i} className="border-t">
                  <td className="p-1">{s.nev}</td>
                  <td className="p-1 text-right">
                    {FT.format(s.mennyiseg)} {s.egyseg}
                  </td>
                  <td className="p-1">{s.raktarhelyKod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      {!d.archivalt && (
        <Section title="Műveletek">
          <div className="flex flex-col gap-3">
            {piszkozat && (
              <div className="flex flex-wrap items-center gap-2">
                <PreflightDialog id={d.id} />
                {canKiad && (
                  <AkcioForm
                    action={kiadSzallitolevelAction.bind(null, d.id)}
                    label="Kiadás a készletből"
                    kiemelt
                    megerosites="Biztosan kiadod? A készlet azonnal csökken."
                  />
                )}
              </div>
            )}
            {d.allapot === "kiadva" && d.keszletKiadas?.allapot !== "kesz" && canKiad && (
              <AkcioForm
                action={ujraKiadSzallitolevelAction.bind(null, d.id)}
                label="Készletlevonás újrapróbálása"
                kiemelt
              />
            )}
            {canDelete && d.allapot !== "sztorno" && (
              <AkcioForm
                action={sztornoSzallitolevelAction.bind(null, d.id)}
                label="Sztornó"
                veszelyes
                mezo={{ name: "megjegyzes", placeholder: "Megjegyzés (opcionális)" }}
                megerosites="Sztornózod a szállítólevelet? A már kiadott készlet nem kerül automatikusan vissza."
              />
            )}
          </div>
        </Section>
      )}
      {canDelete && (
        <Section
          title="Archiválás"
          description={
            d.allapot === "kiadva"
              ? "Kiadott szállítólevél nem archiválható — előbb sztornózd."
              : undefined
          }
        >
          <ArchiveControls
            subject="szállítólevél"
            archived={d.archivalt}
            archiveReason={d.archivalasOka}
            archiveAction={
              d.allapot === "kiadva"
                ? undefined
                : archivSzallitolevelAction.bind(null, d.id)
            }
            restoreAction={visszaallitSzallitolevelAction.bind(null, d.id)}
          />
        </Section>
      )}
    </Container>
  );
}
