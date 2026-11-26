import Link from "next/link";
import { hasPermission, requireAuth } from "@erp/auth";
import {
  jelzesApi,
  JELZES_PERMISSIONS,
  JELZES_TIPUSOK,
  type JelzesTipus,
} from "@erp/jelzes";
import { JELZES_TIPUS_CIMKE } from "@erp/jelzes/constants";
import { Button, Container, cn } from "@erp/ui";
import { JelzesElem } from "@/components/jelzes/jelzes-elem";
import { SettingsIcon } from "lucide-react";
import { MindOlvasottGomb } from "./_components/mind-olvasott-gomb";

const OLDAL_MERET = 25;

type Params = Record<string, string | string[] | undefined>;
const egy = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function href(alap: { tipus?: string; olvasott?: string; oldal?: number }) {
  const p = new URLSearchParams();
  if (alap.tipus) p.set("tipus", alap.tipus);
  if (alap.olvasott) p.set("olvasott", alap.olvasott);
  if (alap.oldal && alap.oldal > 1) p.set("oldal", String(alap.oldal));
  const s = p.toString();
  return s ? `/jelzesek?${s}` : "/jelzesek";
}

function Szuro({
  aktiv,
  href: h,
  children,
}: {
  aktiv: boolean;
  href: string;
  children: string;
}) {
  return (
    <Button size="sm" variant={aktiv ? "default" : "outline"} asChild>
      <Link href={h}>{children}</Link>
    </Button>
  );
}

/**
 * Értesítési központ (8l #60, 8v #71): every user's own notification history, first thing on the
 * page; the delivery settings live on `/jelzesek/beallitasok`. No permission key.
 */
export default async function JelzesekPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const user = await requireAuth();
  const sp = await searchParams;
  const tipusParam = egy(sp.tipus);
  const tipus = JELZES_TIPUSOK.includes(tipusParam as JelzesTipus)
    ? (tipusParam as JelzesTipus)
    : undefined;
  const olvasottParam = egy(sp.olvasott);
  const olvasott =
    olvasottParam === "igen" ? true : olvasottParam === "nem" ? false : undefined;
  const oldal = Math.max(Number.parseInt(egy(sp.oldal) ?? "1", 10) || 1, 1);

  const [{ sorok, osszes }, olvasatlan, kuldhet] = await Promise.all([
    jelzesApi.lista(user.id, { tipus, olvasott, oldal, oldalMeret: OLDAL_MERET }),
    jelzesApi.olvasatlanDb(user.id),
    hasPermission(JELZES_PERMISSIONS.kuld),
  ]);
  const oldalak = Math.max(Math.ceil(osszes / OLDAL_MERET), 1);
  const alap = { tipus, olvasott: olvasottParam };

  return (
    <Container className="flex max-w-3xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Értesítési központ</h1>
          <p className="text-muted-foreground text-sm">
            A neked szóló jelzések — kérelmek, körüzenetek, újdonságok. Hogy hol értesülj
            róluk (asztali értesítés, e-mail), a Beállításokban adhatod meg.
            {olvasatlan > 0 && ` ${olvasatlan} olvasatlan.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MindOlvasottGomb disabled={olvasatlan === 0} />
          <Button variant="outline" asChild>
            <Link href="/jelzesek/beallitasok">
              <SettingsIcon />
              Beállítások
            </Link>
          </Button>
          {kuldhet && (
            <Button asChild>
              <Link href="/jelzesek/kuldes">Körüzenet küldése</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Szuro aktiv={!tipus} href={href({ ...alap, tipus: undefined })}>
          Mind
        </Szuro>
        {JELZES_TIPUSOK.map((t) => (
          <Szuro key={t} aktiv={tipus === t} href={href({ ...alap, tipus: t })}>
            {JELZES_TIPUS_CIMKE[t]}
          </Szuro>
        ))}
        <span className="bg-border mx-1 h-5 w-px" aria-hidden />
        <Szuro aktiv={!olvasottParam} href={href({ tipus })}>
          Olvasott és olvasatlan
        </Szuro>
        <Szuro aktiv={olvasottParam === "nem"} href={href({ tipus, olvasott: "nem" })}>
          Olvasatlan
        </Szuro>
        <Szuro aktiv={olvasottParam === "igen"} href={href({ tipus, olvasott: "igen" })}>
          Olvasott
        </Szuro>
      </div>

      {sorok.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          {tipus || olvasottParam
            ? "Nincs a szűrésnek megfelelő jelzés."
            : "Még nem kaptál jelzést."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {sorok.map((s) => (
            <JelzesElem key={s.id} sor={s} />
          ))}
        </div>
      )}

      {oldalak > 1 && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <Button size="sm" variant="outline" asChild>
            <Link
              href={href({ ...alap, oldal: oldal - 1 })}
              aria-disabled={oldal <= 1}
              className={cn(oldal <= 1 && "pointer-events-none opacity-50")}
            >
              Előző
            </Link>
          </Button>
          <span className="text-muted-foreground">
            {oldal}. oldal / {oldalak} · {osszes} jelzés
          </span>
          <Button size="sm" variant="outline" asChild>
            <Link
              href={href({ ...alap, oldal: oldal + 1 })}
              aria-disabled={oldal >= oldalak}
              className={cn(oldal >= oldalak && "pointer-events-none opacity-50")}
            >
              Következő
            </Link>
          </Button>
        </div>
      )}
    </Container>
  );
}
