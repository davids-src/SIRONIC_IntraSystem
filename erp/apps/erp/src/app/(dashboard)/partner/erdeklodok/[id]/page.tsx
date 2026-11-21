import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { hasPermission, requirePermission } from "@erp/auth";
import { Badge, Button, Container } from "@erp/ui";
import { partnerApi } from "@erp/partner";
import {
  ERDEKLODO_ALLAPOT_LABELS,
  ERDEKLODO_TEVEKENYSEG_LABELS,
  PARTNER_PERMISSIONS,
} from "@erp/partner/client";
import { ArchiveControls } from "../../_components/archive-controls";
import { Facts, PageHeader, Section } from "../../_components/form-ui";
import { archiveErdeklodoAction, restoreErdeklodoAction } from "../actions";
import { ErdeklodoMuveletek } from "../_components/erdeklodo-muveletek";

const datum = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("hu-HU") : undefined;
const datumIdo = (iso: string) => new Date(iso).toLocaleString("hu-HU");

export default async function ErdeklodoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(PARTNER_PERMISSIONS.erdeklodoRead);
  const e = await partnerApi.getErdeklodo(id);
  if (!e) notFound();
  const [canWrite, canDelete, canCreatePartner] = await Promise.all([
    hasPermission(PARTNER_PERMISSIONS.erdeklodoWrite),
    hasPermission(PARTNER_PERMISSIONS.erdeklodoDelete),
    hasPermission(PARTNER_PERMISSIONS.partnerWrite),
  ]);

  return (
    <Container className="flex max-w-5xl flex-col gap-4 md:gap-5">
      <PageHeader
        title={e.cegNev}
        subtitle={e.azonosito}
        chips={
          <>
            <Badge variant="secondary">{ERDEKLODO_ALLAPOT_LABELS[e.allapot]}</Badge>
            {e.archivalt && <Badge variant="outline">Archivált</Badge>}
            {e.partnerId && (
              <Link href={`/partner/${e.partnerId}`} className="text-sm underline">
                Partner adatlap
              </Link>
            )}
          </>
        }
        actions={
          canWrite && !e.archivalt ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/partner/erdeklodok/${e.id}/edit`}>
                <PencilIcon className="mr-1 size-4" />
                Szerkesztés
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Adatok">
          <Facts
            items={[
              { label: "Kapcsolattartó", value: e.kapcsolattartoNev },
              { label: "E-mail", value: e.email },
              { label: "Telefon", value: e.telefon },
              { label: "Weboldal", value: e.weboldal },
              { label: "Forrás", value: e.forras },
              { label: "Kategória", value: e.kategoria },
              { label: "Iparág", value: e.iparag },
              { label: "Üzletág", value: e.uzletiEgyseg },
              {
                label: "Becsült érték",
                value:
                  e.becsultErtek !== undefined
                    ? `${e.becsultErtek.toLocaleString("hu-HU")} Ft`
                    : undefined,
              },
              { label: "Felelős", value: e.felelosNev },
            ]}
          />
          {e.megjegyzes && <p className="text-sm whitespace-pre-line">{e.megjegyzes}</p>}
        </Section>
        <Section title="Következő lépés">
          <Facts
            items={[
              { label: "Teendő", value: e.kovetkezoLepes },
              { label: "Határidő", value: datum(e.kovetkezoLepesIdopont) },
              { label: "Elvesztés oka", value: e.elvesztesOka },
            ]}
          />
        </Section>
      </div>

      {canWrite && !e.archivalt && (
        <ErdeklodoMuveletek
          id={e.id}
          allapot={e.allapot}
          felelosVagyok={e.felelosId === user.id}
          vanFelelos={Boolean(e.felelosId)}
          partnerId={e.partnerId}
          canConvert={canCreatePartner}
        />
      )}

      <Section title="Tevékenységnapló">
        {e.tevekenysegek.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Még nincs rögzített tevékenység.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {e.tevekenysegek.map((t) => (
              <li key={t.id} className="border-b pb-2 last:border-b-0 last:pb-0">
                <div className="text-muted-foreground text-xs">
                  {datumIdo(t.idopont)} · {t.felhasznaloNev} ·{" "}
                  {ERDEKLODO_TEVEKENYSEG_LABELS[t.tipus]}
                </div>
                <div className="whitespace-pre-line">{t.szoveg}</div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {canDelete && (
        <Section
          title="Archiválás"
          description="Az érdeklődő nem törölhető, csak archiválható."
        >
          <ArchiveControls
            subject="érdeklődő"
            archived={e.archivalt}
            archiveReason={e.archivalasOka}
            archiveAction={archiveErdeklodoAction.bind(null, e.id)}
            restoreAction={restoreErdeklodoAction.bind(null, e.id)}
          />
        </Section>
      )}
    </Container>
  );
}
