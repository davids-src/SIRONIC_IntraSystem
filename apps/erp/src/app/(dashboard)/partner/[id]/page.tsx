import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { hasPermission, requirePermission } from "@erp/auth";
import { Badge, Button, Container } from "@erp/ui";
import { partnerApi } from "@erp/partner";
import {
  ALVALLALKOZOI_JELENLET_LABELS,
  ALVALLALKOZOI_MUNKATERULET_LABELS,
  ALVALLALKOZOI_SZAMLAZASI_CIKLUS_LABELS,
  ARAZASI_SZERZODES_TIPUS_LABELS,
  PARTNER_PERMISSIONS,
  PARTNER_SZEREP_LABELS,
  PARTNER_TIPUS_LABELS,
  UGYFEL_KATEGORIA_LABELS,
} from "@erp/partner/client";
import { archivePartnerAction, restorePartnerAction } from "../actions";
import { ArchiveControls } from "../_components/archive-controls";
import { Facts, PageHeader, Section, formatCim } from "../_components/form-ui";

const datum = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("hu-HU") : undefined;

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission(PARTNER_PERMISSIONS.partnerRead);
  const p = await partnerApi.getPartner(id);
  if (!p) notFound();
  const [canWrite, canDelete] = await Promise.all([
    hasPermission(PARTNER_PERMISSIONS.partnerWrite),
    hasPermission(PARTNER_PERMISSIONS.partnerDelete),
  ]);

  return (
    <Container className="flex max-w-5xl flex-col gap-4 md:gap-5">
      <PageHeader
        title={p.nev}
        subtitle={`${p.azonosito} · ${PARTNER_TIPUS_LABELS[p.tipus]}`}
        chips={
          <>
            {p.partnerSzerep && (
              <Badge variant="secondary">{PARTNER_SZEREP_LABELS[p.partnerSzerep]}</Badge>
            )}
            {p.archivalt && <Badge variant="outline">Archivált</Badge>}
            {p.cimkek.map((c) => (
              <Badge key={c} variant="outline">
                {c}
              </Badge>
            ))}
          </>
        }
        actions={
          canWrite && !p.archivalt ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/partner/${p.id}/edit`}>
                <PencilIcon className="mr-1 size-4" />
                Szerkesztés
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Alapadatok">
          <Facts
            items={[
              { label: "Adószám", value: p.adoszam },
              { label: "Cégjegyzékszám", value: p.cegjegyzekszam },
              { label: "Bankszámlaszám", value: p.bankszamlaszam },
              { label: "Telefon", value: p.telefon },
              { label: "E-mail", value: p.email },
              { label: "Székhely", value: formatCim(p.szekhely) },
              { label: "Számlázási cím", value: formatCim(p.szamlazasiCim) },
            ]}
          />
          {p.megjegyzes && <p className="text-sm whitespace-pre-line">{p.megjegyzes}</p>}
        </Section>

        <Section title="Kapcsolattartók">
          {p.kapcsolattartok.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nincs rögzített kapcsolattartó.
            </p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {p.kapcsolattartok.map((k) => (
                <li key={k.id} className="border-b pb-2 last:border-b-0 last:pb-0">
                  <div className="font-medium">
                    {k.nev}
                    {k.beosztas && (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        · {k.beosztas}
                      </span>
                    )}
                    {k.elsodleges && (
                      <Badge variant="secondary" className="ml-2">
                        Elsődleges
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground flex flex-wrap gap-x-4">
                    {k.telefon && <a href={`tel:${k.telefon}`}>{k.telefon}</a>}
                    {k.email && <a href={`mailto:${k.email}`}>{k.email}</a>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Árazási profil"
          description="Az árlista modul ezt használja az árszorzó kiválasztásához."
        >
          <Facts
            items={[
              {
                label: "Partner szerepe",
                value: p.partnerSzerep && PARTNER_SZEREP_LABELS[p.partnerSzerep],
              },
              {
                label: "Ügyfélkategória",
                value: p.ugyfelKategoria && UGYFEL_KATEGORIA_LABELS[p.ugyfelKategoria],
              },
              {
                label: "Szerződéstípus",
                value:
                  p.arazasiSzerzodesTipus &&
                  ARAZASI_SZERZODES_TIPUS_LABELS[p.arazasiSzerzodesTipus],
              },
              { label: "Szerződés kezdete", value: datum(p.szerzodesKezdete) },
              { label: "Szerződés vége", value: datum(p.szerzodesVege) },
              {
                label: "Megújítási emlékeztető",
                value: `${p.megujitasEmlekeztetoNap} nappal előtte`,
              },
            ]}
          />
        </Section>

        {(p.alvallalkozoMunkateruletek.length > 0 ||
          p.alvallalkozoJelenletTipus ||
          p.alvallalkozoSzamlazasiCiklus) && (
          <Section title="Alvállalkozói adatok">
            <Facts
              items={[
                {
                  label: "Munkaterületek",
                  value: p.alvallalkozoMunkateruletek
                    .map((m) => ALVALLALKOZOI_MUNKATERULET_LABELS[m])
                    .join(", "),
                },
                {
                  label: "Jelenlét",
                  value:
                    p.alvallalkozoJelenletTipus &&
                    ALVALLALKOZOI_JELENLET_LABELS[p.alvallalkozoJelenletTipus],
                },
                {
                  label: "Számlázási ciklus",
                  value:
                    p.alvallalkozoSzamlazasiCiklus &&
                    ALVALLALKOZOI_SZAMLAZASI_CIKLUS_LABELS[
                      p.alvallalkozoSzamlazasiCiklus
                    ],
                },
              ]}
            />
          </Section>
        )}
      </div>

      {canDelete && (
        <Section
          title="Archiválás"
          description="A partner nem törölhető, csak archiválható; az archivált partner visszaállítható."
        >
          <ArchiveControls
            subject="partner"
            archived={p.archivalt}
            archiveReason={p.archivalasOka}
            archiveAction={archivePartnerAction.bind(null, p.id)}
            restoreAction={restorePartnerAction.bind(null, p.id)}
          />
        </Section>
      )}
    </Container>
  );
}
