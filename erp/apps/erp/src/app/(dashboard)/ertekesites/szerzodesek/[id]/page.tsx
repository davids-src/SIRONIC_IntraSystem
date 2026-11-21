import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { hasPermission, requirePermission } from "@erp/auth";
import { Badge, Button, Container } from "@erp/ui";
import { ertekesitesApi } from "@erp/ertekesites";
import {
  ALAIRAS_TIPUS_LABELS,
  ERTEKESITES_PERMISSIONS as P,
  SZERZODES_ALLAPOT_LABELS,
  SZERZODES_ATMENETEK,
  SZERZODES_TIPUS_LABELS,
} from "@erp/ertekesites/client";
import {
  Facts,
  PageHeader,
  Section,
} from "@/app/(dashboard)/partner/_components/form-ui";
import { szerzodesAllapotAction } from "../../actions";
import { AllapotPanel, type AllapotLehetoseg } from "../../_components/allapot-panel";

const datum = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("hu-HU") : undefined;

export default async function SzerzodesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission(P.szerzodesRead);
  const s = await ertekesitesApi.getSzerzodes(id);
  if (!s) notFound();
  const [canWrite, canDelete] = await Promise.all([
    hasPermission(P.szerzodesWrite),
    hasPermission(P.szerzodesDelete),
  ]);
  const lehetosegek: AllapotLehetoseg[] = SZERZODES_ATMENETEK[s.allapot]
    .filter((n) => (n === "torolt" ? canDelete : canWrite))
    .map((n) => ({
      allapot: n,
      label: `${SZERZODES_ALLAPOT_LABELS[n]} állapotba`,
      mezo: n === "digitalisan_alairt" ? ("alairo" as const) : undefined,
      kiemelt: n === "elkuldve",
    }));

  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-5">
      <PageHeader
        title={s.nev}
        subtitle={`${s.azonosito} · ${s.partnerNev}`}
        chips={
          <>
            <Badge variant="secondary">{SZERZODES_ALLAPOT_LABELS[s.allapot]}</Badge>
            <Badge variant="outline">{SZERZODES_TIPUS_LABELS[s.tipus]}</Badge>
          </>
        }
        actions={
          canWrite && s.allapot === "piszkozat" ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/ertekesites/szerzodesek/${s.id}/edit`}>
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
            { label: "Kategória", value: s.kategoria },
            { label: "Aláírás módja", value: ALAIRAS_TIPUS_LABELS[s.alairasTipus] },
            { label: "Aláíró", value: s.ugyfelNev },
            { label: "Aláírva", value: datum(s.alairtAt) },
            { label: "Érvényesség kezdete", value: datum(s.ervenyessegKezdete) },
            { label: "Érvényesség vége", value: datum(s.ervenyessegVege) },
            { label: "Projekt", value: s.projektId },
            { label: "Partnerportálon látható", value: s.portalLathato ? "Igen" : "Nem" },
          ]}
        />
        {s.megjegyzes && <p className="text-sm whitespace-pre-line">{s.megjegyzes}</p>}
      </Section>
      {s.tipus === "generalt" ? (
        <Section title="Szerződés szövege">
          <div
            className="bg-background max-h-[32rem] overflow-auto rounded-md border p-4 text-sm"
            // Rendered and sanitized by the domain (`szerzodesRender`): values escaped, scripts removed.
            dangerouslySetInnerHTML={{ __html: s.szoveg ?? "" }}
          />
        </Section>
      ) : (
        <Section title="Feltöltött fájl">
          {s.fajlHivatkozas ? (
            <a className="text-sm underline" href={s.fajlHivatkozas}>
              {s.fajlNev ?? s.fajlHivatkozas}
            </a>
          ) : (
            <p className="text-muted-foreground text-sm">Nincs fájl.</p>
          )}
        </Section>
      )}
      {lehetosegek.length > 0 && (
        <Section title="Állapot módosítása">
          <AllapotPanel
            action={szerzodesAllapotAction.bind(null, s.id)}
            lehetosegek={lehetosegek}
          />
        </Section>
      )}
      <Section title="Állapot-előzmények">
        <ul className="flex flex-col gap-1 text-sm">
          {s.elozmenyek.map((e, i) => (
            <li key={i}>
              <span className="text-muted-foreground">
                {new Date(e.idopont).toLocaleString("hu-HU")}
              </span>{" "}
              · {SZERZODES_ALLAPOT_LABELS[e.allapot]}
              {e.megjegyzes ? ` — ${e.megjegyzes}` : ""}
            </li>
          ))}
        </ul>
      </Section>
    </Container>
  );
}
