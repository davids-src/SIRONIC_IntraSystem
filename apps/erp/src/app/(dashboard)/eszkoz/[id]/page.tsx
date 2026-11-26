import Link from "next/link";
import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { Badge, Button } from "@erp/ui";
import {
  ESZKOZ_ALLAPOT_LABELS,
  ESZKOZ_ALLAPOT_TONES,
  FIZIKAI_ALLAPOT_LABELS,
  FIZIKAI_ALLAPOT_TONES,
  MOZGAS_TIPUS_LABELS,
  MOZGAS_TIPUS_TONES,
  eszkozApi,
} from "@erp/eszkoz";
import { ConfirmDeleteButton } from "../_components/confirm-delete-button";
import { MuveletGombok } from "../_components/muvelet-gombok";
import {
  DangerZone,
  DetailHeader,
  EmptyNote,
  Facts,
  Section,
} from "../_components/detail/detail-layout";
import { deleteEszkozAction } from "../actions";

const datum = (iso: string) =>
  new Date(iso).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" });

export default async function EszkozAdatlapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission("eszkoz:eszkoz:read");
  const eszkoz = await eszkozApi.getEszkoz(id);
  if (!eszkoz) notFound();

  const [canWrite, canKiad, canDelete] = await Promise.all([
    hasPermission("eszkoz:eszkoz:write"),
    hasPermission("eszkoz:eszkoz:kiad"),
    hasPermission("eszkoz:eszkoz:delete"),
  ]);
  const torolheto = eszkoz.mozgasok.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:gap-5 md:p-6">
      <DetailHeader
        title={eszkoz.megnevezes}
        subtitle={
          [eszkoz.marka, eszkoz.tipusszam].filter(Boolean).join(" · ") || undefined
        }
        backHref="/eszkoz"
        backLabel="Vissza az eszközökhöz"
        chips={
          <>
            <Badge variant={ESZKOZ_ALLAPOT_TONES[eszkoz.allapot]}>
              {ESZKOZ_ALLAPOT_LABELS[eszkoz.allapot]}
            </Badge>
            <Badge variant={FIZIKAI_ALLAPOT_TONES[eszkoz.fizikaiAllapot]}>
              {FIZIKAI_ALLAPOT_LABELS[eszkoz.fizikaiAllapot]}
            </Badge>
          </>
        }
        actions={
          <>
            <MuveletGombok
              id={eszkoz.id}
              allapot={eszkoz.allapot}
              canKiad={canKiad}
              canWrite={canWrite}
            />
            {canWrite && eszkoz.allapot !== "kivonva" && (
              <Button asChild variant="outline">
                <Link href={`/eszkoz/${eszkoz.id}/edit`}>Szerkesztés</Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Section title="Alapadatok" mode="readonly">
            <Facts
              columns={2}
              items={[
                { label: "Megnevezés", value: eszkoz.megnevezes },
                { label: "Márka", value: eszkoz.marka },
                { label: "Típusszám", value: eszkoz.tipusszam },
                { label: "Gyári szám", value: eszkoz.gyariSzam },
                { label: "Nála van", value: eszkoz.birtokosNev },
                { label: "Jegyzet", value: eszkoz.jegyzet },
              ]}
            />
          </Section>
        </div>
        <aside className="flex flex-col gap-4">
          <Section title="Mozgásnapló" mode="log">
            {eszkoz.mozgasok.length === 0 ? (
              <EmptyNote>Még nem volt mozgás.</EmptyNote>
            ) : (
              <ol className="border-border relative flex flex-col gap-4 border-l pl-4">
                {eszkoz.mozgasok.map((m) => (
                  <li key={m.id} className="relative text-sm">
                    <span className="bg-foreground absolute top-1.5 -left-[21px] size-2 rounded-full" />
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={MOZGAS_TIPUS_TONES[m.tipus]}>
                        {MOZGAS_TIPUS_LABELS[m.tipus]}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {datum(m.createdAt)}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      {m.vegrehajtoNev}
                      {m.celNev && ` → ${m.celNev}`}
                      {m.elozoNev && ` (nála volt: ${m.elozoNev})`}
                      {m.fizikaiAllapot &&
                        ` · ${FIZIKAI_ALLAPOT_LABELS[m.fizikaiAllapot]}`}
                    </div>
                    {m.jegyzet && <p className="mt-1">{m.jegyzet}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </aside>
      </div>

      {canDelete && (
        <DangerZone
          description={
            torolheto
              ? "A törlés nem vonható vissza."
              : "Mozgásnaplóval rendelkező eszköz nem törölhető — vond ki (archiválás)."
          }
        >
          {torolheto && (
            <ConfirmDeleteButton
              onDelete={deleteEszkozAction.bind(null, eszkoz.id)}
              title={`${eszkoz.megnevezes} törlése`}
              description="Az eszköz véglegesen törlődik. Csak mozgás nélküli eszköz törölhető."
              redirectTo="/eszkoz"
            />
          )}
        </DangerZone>
      )}
    </div>
  );
}
