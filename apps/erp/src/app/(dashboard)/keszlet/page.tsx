import Link from "next/link";
import { AlertTriangleIcon, MapPinIcon, RotateCcwIcon, WalletIcon } from "lucide-react";
import { hasPermission, requirePermission } from "@erp/auth";
import { Badge, Button, Container } from "@erp/ui";
import {
  KESZLET_PERMISSIONS as P,
  MOZGAS_TIPUS_LABELS,
  MOZGAS_TIPUS_TONES,
  NINCS_HELY_LABEL,
  keszletApi,
} from "@erp/keszlet";
import { KpiTile } from "@/components/kpi-tile";
import { Section, EmptyNote } from "../eszkoz/_components/detail/detail-layout";

export const dynamic = "force-dynamic";

const FT = new Intl.NumberFormat("hu-HU");
const datum = (iso: string) =>
  new Date(iso).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" });

export default async function KeszletDashboardPage() {
  const user = await requirePermission(P.keszletRead);
  const [d, canBevetel, canLeltar] = await Promise.all([
    keszletApi.getDashboard({ userId: user.id, permissions: user.permissions }),
    hasPermission(P.bevetelWrite),
    hasPermission(P.leltarWrite),
  ]);
  const maxErtek = Math.max(1, ...d.eloszlas.map((e) => e.ertek ?? e.darab));

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Készlet — műszerfal</h1>
          <p className="text-muted-foreground text-sm">
            Raktárkészlet, kritikus és elfekvő tételek, legutóbbi mozgások.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canBevetel && (
            <Button asChild>
              <Link href="/keszlet/bevetel">Bevételezés</Link>
            </Button>
          )}
          {canLeltar && (
            <Button asChild variant="outline">
              <Link href="/keszlet/leltar">Leltár</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/keszlet/lista">Készletlista</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {d.osszErtek !== null && (
          <KpiTile
            label="Teljes készletérték"
            value={`${FT.format(Math.round(d.osszErtek))} Ft`}
            hint="utolsó beszerzési áron"
            icon={<WalletIcon className="size-5" />}
          />
        )}
        <KpiTile
          label="Alacsony készletű tételek"
          value={d.alacsonyDb}
          tone={d.alacsonyDb > 0 ? "danger" : "success"}
          icon={<AlertTriangleIcon className="size-5" />}
        />
        <KpiTile
          label="Aktív RMA ügyek"
          value={d.aktivRma}
          tone={d.aktivRma > 0 ? "warning" : "success"}
          href="/keszlet/rma"
          icon={<RotateCcwIcon className="size-5" />}
        />
        <KpiTile
          label="Raktárhelyek"
          value={d.raktarhelyDb}
          href="/keszlet/raktarhelyek"
          icon={<MapPinIcon className="size-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section
          title="Készlet raktárhelyenként"
          description={d.osszErtek !== null ? "Érték szerint" : "Darabszám szerint"}
        >
          {d.eloszlas.length === 0 ? (
            <EmptyNote>Még nincs raktárhely vagy készlet.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-3">
              {d.eloszlas.map((e) => {
                const v = e.ertek ?? e.darab;
                return (
                  <li key={e.kod || "none"} className="text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">
                        {e.kod ? `${e.kod} — ${e.nev}` : NINCS_HELY_LABEL}
                      </span>
                      <span className="text-muted-foreground">
                        {FT.format(e.darab)} db
                        {e.ertek !== null && ` · ${FT.format(Math.round(e.ertek))} Ft`}
                      </span>
                    </div>
                    <div className="bg-muted mt-1 h-2 rounded-full">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${Math.round((v / maxErtek) * 100)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section
          title="Kritikus szintű tételek"
          description="A beállított minimum alatt vagy azon"
        >
          {d.kritikus.length === 0 ? (
            <EmptyNote>Nincs kritikus készletű tétel.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {d.kritikus.map((t) => (
                <li key={t._id} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/keszlet/lista/${t._id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {t.nev}{" "}
                    <span className="text-muted-foreground">
                      ({t.raktarhelyKod || "—"})
                    </span>
                  </Link>
                  <Badge variant="danger">
                    {t.keszlet} / min. {t.minimum} {t.egyseg}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Elfekvő készlet" description="90 napja nem mozgott">
          {d.elfekvo.length === 0 ? (
            <EmptyNote>Nincs elfekvő tétel.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {d.elfekvo.map((t) => (
                <li key={t._id} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/keszlet/lista/${t._id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {t.nev}
                  </Link>
                  <span className="text-muted-foreground">
                    {t.keszlet} {t.egyseg}
                    {t.ertek !== undefined && ` · ${FT.format(Math.round(t.ertek))} Ft`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Legutóbbi mozgások" mode="log">
          {d.utolsoMozgasok.length === 0 ? (
            <EmptyNote>Még nem volt mozgás.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {d.utolsoMozgasok.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-2">
                  <Badge variant={MOZGAS_TIPUS_TONES[m.tipus]}>
                    {MOZGAS_TIPUS_LABELS[m.tipus]}
                  </Badge>
                  <span>{m.nev}</span>
                  <span className="text-muted-foreground">
                    {m.valtozas !== 0
                      ? `${m.valtozas > 0 ? "+" : ""}${m.valtozas}`
                      : `${m.foglaltValtozas > 0 ? "+" : ""}${m.foglaltValtozas} foglalt`}{" "}
                    · {datum(m.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </Container>
  );
}
