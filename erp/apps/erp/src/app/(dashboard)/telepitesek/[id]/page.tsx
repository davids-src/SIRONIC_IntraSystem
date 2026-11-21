import Link from "next/link";
import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { Badge, Button } from "@erp/ui";
import {
  LEJARAT_TIPUS_LABELS,
  SZAMLAZASI_CIKLUS_LABELS,
  TELEPITES_ALLAPOT_LABELS,
  TELEPITES_ALLAPOT_TONES,
  TELEPITES_EVENT_LABELS,
  deploymentsApi,
} from "@erp/deployments";
import {
  DetailHeader,
  EmptyNote,
  Facts,
  Section,
} from "../../eszkoz/_components/detail/detail-layout";
import { LepesIdovonal } from "../_components/lepes-idovonal";
import {
  ArchivalGombok,
  LejaratTorles,
  LejaratUrlap,
  SzamlazasUrlap,
} from "../_components/telepites-muveletek";

const datum = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" }) : undefined;
const nap = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("hu-HU") : undefined);

export default async function TelepitesAdatlapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission("deployments:telepites:read");
  const t = await deploymentsApi.getTelepites(id);
  if (!t) notFound();

  const [canWrite, canFuttat, canDelete, canFizetes, esemenyek, csomagok] = await Promise.all([
    hasPermission("deployments:telepites:write"),
    hasPermission("deployments:telepites:futtat"),
    hasPermission("deployments:telepites:delete"),
    hasPermission("deployments:fizetes:write"),
    deploymentsApi.listEsemenyek(id, 50),
    deploymentsApi.listCsomagValaszto(),
  ]);
  const nyilvantartas = t.forras === "nyilvantartas";
  const archivalt = t.allapot === "archivalt";
  const torolheto = t.lepesek.every((l) => l.allapot === "fuggo" || l.allapot === "kihagyva");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:gap-5 md:p-6">
      <DetailHeader
        title={`${t.azonosito} — ${t.nev}`}
        subtitle={t.domain}
        backHref="/telepitesek"
        backLabel="Vissza a telepítésekhez"
        chips={
          <>
            <Badge variant={TELEPITES_ALLAPOT_TONES[t.allapot]}>
              {TELEPITES_ALLAPOT_LABELS[t.allapot]}
            </Badge>
            {!nyilvantartas && (
              <span className="text-muted-foreground text-xs">
                {t.haladas.kesz}/{t.haladas.osszes} lépés · {t.haladas.szazalek}%
              </span>
            )}
          </>
        }
        actions={
          canWrite && !archivalt && !nyilvantartas ? (
            <Button asChild variant="outline">
              <Link href={`/telepitesek/${t.id}/edit`}>Szerkesztés</Link>
            </Button>
          ) : undefined
        }
      />

      {!nyilvantartas && (
        <Section
          title="Kiépítési lépések"
          description="Futtatás, adoptálás, ellenőrzés és kihagyás lépésenként. A hibás lépés újrafuttatható, a kész lépések megmaradnak."
          mode="log"
          tone={t.allapot === "serult" ? "danger" : undefined}
        >
          <LepesIdovonal
            telepitesId={t.id}
            lepesek={t.lepesek}
            futtathat={canFuttat}
            szerkesztheto={canWrite}
            lezart={archivalt || t.allapot === "felfuggesztve"}
          />
        </Section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Section title="Alapadatok" mode="readonly">
            <Facts
              columns={2}
              items={[
                { label: "Domain", value: t.domain },
                { label: "Partner", value: t.partnerId },
                { label: "DNS", value: t.dns.cel ? `${t.dns.rekordTipus} → ${t.dns.cel}` : undefined },
                {
                  label: "Proxy",
                  value: t.proxy.celHost ? `${t.proxy.celSema}://${t.proxy.celHost}:${t.proxy.celPort}` : undefined,
                },
                { label: "Image", value: t.image.repo ? `${t.image.repo}:${t.image.tag ?? "latest"}` : undefined },
                { label: "Stack", value: t.stack.nev },
                { label: "Megjegyzés", value: t.megjegyzes },
                { label: "Archiválás oka", value: t.archivalasOka },
              ]}
            />
            {t.stack.env.length > 0 && (
              <p className="text-muted-foreground text-xs">
                Környezeti változók: {t.stack.env.map((e) => (e.titkos ? `${e.nev} (titkos)` : e.nev)).join(", ")}
              </p>
            )}
          </Section>

          <Section
            title="Lejáratok"
            description="Domain-, hosting- és SSL-lejáratok nyilvántartása."
            mode={canWrite ? "editable" : "readonly"}
          >
            {t.lejaratok.length === 0 ? (
              <EmptyNote>Nincs rögzített lejárat.</EmptyNote>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {t.lejaratok.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 border-b pb-2">
                    <span>
                      <Badge variant="neutral">{LEJARAT_TIPUS_LABELS[l.tipus]}</Badge> {l.cimke}
                      {l.szolgaltato ? ` · ${l.szolgaltato}` : ""}
                    </span>
                    <span className="flex items-center gap-2">
                      {nap(l.lejarat) ?? "—"}
                      {canWrite && <LejaratTorles id={t.id} lejaratId={l.id} />}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {canWrite && <LejaratUrlap id={t.id} />}
          </Section>

          {!nyilvantartas && (
            <Section title="Számlázás" mode={canFizetes ? "editable" : "readonly"}>
              <Facts
                columns={2}
                items={[
                  { label: "Csomag", value: t.csomagNev },
                  {
                    label: "Díj",
                    value: t.hatekonyArHuf !== undefined ? `${t.hatekonyArHuf.toLocaleString("hu-HU")} Ft` : undefined,
                  },
                  { label: "Ciklus", value: t.hatekonyCiklus ? SZAMLAZASI_CIKLUS_LABELS[t.hatekonyCiklus] : undefined },
                  { label: "Következő számlázás", value: nap(t.kovetkezoSzamlazas) },
                  { label: "Utolsó fizetés", value: nap(t.utolsoFizetes) },
                ]}
              />
              {canFizetes && (
                <SzamlazasUrlap
                  id={t.id}
                  csomagok={csomagok.map((c) => ({ id: c.id, nev: c.nev }))}
                  csomagId={t.csomagId}
                  ciklus={t.szamlazasiCiklus}
                  ar={t.arFelulirasHuf}
                />
              )}
            </Section>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <Section title="Eseménynapló" mode="log">
            {esemenyek.length === 0 ? (
              <EmptyNote>Még nincs esemény.</EmptyNote>
            ) : (
              <ol className="flex flex-col gap-3 text-sm">
                {esemenyek.map((e) => (
                  <li key={e.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={e.tipus === "lepes_hiba" ? "danger" : "neutral"}>
                        {TELEPITES_EVENT_LABELS[e.tipus]}
                      </Badge>
                      <span className="text-muted-foreground text-xs">{datum(e.createdAt)}</span>
                    </div>
                    <p className="mt-1 break-words text-xs">{e.uzenet}</p>
                  </li>
                ))}
              </ol>
            )}
          </Section>
          {canWrite && (
            <Section title="Életciklus" mode="editable">
              <ArchivalGombok
                id={t.id}
                archivalt={archivalt}
                felfuggesztve={t.allapot === "felfuggesztve"}
                torolheto={torolheto}
                szerkesztheto={canWrite}
                torolhet={canDelete}
              />
            </Section>
          )}
        </aside>
      </div>
    </div>
  );
}
