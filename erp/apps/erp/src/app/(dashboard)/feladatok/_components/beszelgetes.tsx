"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CornerUpLeftIcon,
  PencilIcon,
  SendHorizontalIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Button, Textarea, cn } from "@erp/ui";
import {
  FELADAT_SZOVEG_MAX,
  aktivEmlites,
  beszurEmlites,
  idezet,
  monogram,
  uzenetSzegmensek,
  type FeladatSzal,
  type SzalResztvevo,
  type UzenetSor,
} from "@erp/feladat/client";
import {
  uzenetKuldesAction,
  uzenetModositasAction,
  uzenetTorlesAction,
} from "../uzenet-actions";
import { CsatolmanyFeltolto, CsatolmanyLista, type Csatolmany } from "./csatolmany";

const TZ = "Europe/Budapest";
/** Consecutive messages of one author within this window share one avatar and name. */
const CSOPORT_MS = 5 * 60_000;
/** How often an open chat looks for new messages (only while the tab is visible). */
const FRISSITES_MS = 15_000;

const ora = (iso: string) =>
  new Date(iso).toLocaleTimeString("hu-HU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
const napKulcs = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });

function napCimke(iso: string): string {
  const nap = napKulcs(iso);
  const ma = napKulcs(new Date().toISOString());
  const tegnap = napKulcs(new Date(Date.now() - 86_400_000).toISOString());
  if (nap === ma) return "Ma";
  if (nap === tegnap) return "Tegnap";
  return new Date(iso).toLocaleDateString("hu-HU", {
    year: nap.slice(0, 4) === ma.slice(0, 4) ? undefined : "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: TZ,
  });
}

const SZEREP_CIMKE: Record<SzalResztvevo["szerep"], string> = {
  kiado: "kiadó",
  felelos: "felelős",
  kozremukodo: "közreműködő",
};

export function ChatAvatar({
  nev,
  kep,
  className,
}: {
  nev: string;
  kep?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-muted text-foreground ring-card flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold ring-2",
        className,
      )}
      title={nev}
      aria-hidden
    >
      {kep ? <img src={kep} alt="" className="size-full object-cover" /> : monogram(nev)}
    </span>
  );
}

/** Overlapping avatars with a "+N" tail. */
function AvatarSor({
  emberek,
  max = 6,
  meret = "size-7",
}: {
  emberek: Array<{ id: string; nev: string; kep?: string }>;
  max?: number;
  meret?: string;
}) {
  const latszik = emberek.slice(0, max);
  const tobb = emberek.length - latszik.length;
  return (
    <span className="flex items-center -space-x-2">
      {latszik.map((e) => (
        <ChatAvatar
          key={e.id}
          nev={e.nev}
          kep={e.kep}
          className={cn(meret, "text-[10px]")}
        />
      ))}
      {tobb > 0 && (
        <span
          className={cn(
            "bg-muted text-muted-foreground ring-card flex items-center justify-center rounded-full text-[10px] font-semibold ring-2",
            meret,
          )}
        >
          +{tobb}
        </span>
      )}
    </span>
  );
}

/** Message text with the @mentions highlighted — the viewer's own name stronger. */
function Szoveg({
  szoveg,
  resztvevok,
  sajatId,
  sajatBuborek,
}: {
  szoveg: string;
  resztvevok: SzalResztvevo[];
  sajatId: string;
  sajatBuborek: boolean;
}) {
  const szegmensek = useMemo(
    () => uzenetSzegmensek(szoveg, resztvevok),
    [szoveg, resztvevok],
  );
  return (
    <>
      {szegmensek.map((s, i) =>
        s.tipus === "szoveg" ? (
          <Fragment key={i}>{s.szoveg}</Fragment>
        ) : (
          <span
            key={i}
            className={cn(
              "rounded px-0.5 font-semibold",
              sajatBuborek
                ? "underline decoration-2 underline-offset-2"
                : s.userId === sajatId
                  ? "bg-primary text-primary-foreground"
                  : "text-primary",
            )}
          >
            {s.szoveg}
          </span>
        ),
      )}
    </>
  );
}

type Valasz = { id: string; szerzoNev: string; szoveg: string };

/**
 * The task's shared conversation (#68) — one thread for everyone on the task, like a group chat:
 * own messages on the right, the others on the left with avatar and name, day separators,
 * replies with a quote, @mentions with a picker, editing and deleting one's own messages, and
 * a "Látta" line under the last message. Looks for new messages every 15 s while visible.
 */
export function Beszelgetes({
  feladatId,
  szal,
  media,
  sajatId,
}: {
  /** The copy the viewer is on — the message is written there (attachments, links). */
  feladatId: string;
  szal: FeladatSzal;
  media: Record<string, Csatolmany>;
  sajatId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [szoveg, setSzoveg] = useState("");
  const [csatolmanyok, setCsatolmanyok] = useState<Csatolmany[]>([]);
  const [valasz, setValasz] = useState<Valasz | null>(null);
  const [szerkesztett, setSzerkesztett] = useState<{ id: string; szoveg: string } | null>(
    null,
  );
  const [kiemelt, setKiemelt] = useState<string | null>(null);
  const [emlites, setEmlites] = useState<{ kezdet: number; keres: string } | null>(null);
  const [emlitesIndex, setEmlitesIndex] = useState(0);
  const listaRef = useRef<HTMLOListElement>(null);
  const mezoRef = useRef<HTMLTextAreaElement>(null);
  const utolsoId = szal.uzenetek.at(-1)?.id;

  // Keep the thread fresh without websockets: on an interval while visible, and on return.
  useEffect(() => {
    const frissit = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const t = window.setInterval(frissit, FRISSITES_MS);
    window.addEventListener("focus", frissit);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", frissit);
    };
  }, [router]);

  // Newest at the bottom: scroll there on open and when a new message arrives.
  useLayoutEffect(() => {
    const el = listaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [utolsoId]);

  const aktivak = useMemo(
    () => szal.resztvevok.filter((r) => r.aktiv),
    [szal.resztvevok],
  );
  const tagById = useMemo(
    () => new Map(szal.resztvevok.map((r) => [r.id, r])),
    [szal.resztvevok],
  );
  const jeloltek = useMemo(() => {
    if (!emlites) return [];
    const q = emlites.keres.toLocaleLowerCase("hu");
    return aktivak
      .filter((r) => r.id !== sajatId && r.nev.toLocaleLowerCase("hu").includes(q))
      .slice(0, 6);
  }, [emlites, aktivak, sajatId]);

  const ugras = useCallback((id: string) => {
    const el = document.getElementById(`uzenet-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setKiemelt(id);
    window.setTimeout(() => setKiemelt((k) => (k === id ? null : k)), 1600);
  }, []);

  const kuld = () => {
    if (!szoveg.trim() || pending) return;
    startTransition(async () => {
      const r = await uzenetKuldesAction(feladatId, {
        szoveg,
        valaszId: valasz?.id,
        mediaIds: csatolmanyok.map((c) => c.id),
      });
      if (!r.success) {
        toast.error(r.message ?? "Nem sikerült elküldeni.");
        return;
      }
      setSzoveg("");
      setCsatolmanyok([]);
      setValasz(null);
      setEmlites(null);
      router.refresh();
    });
  };

  const valasztEmlites = (r: SzalResztvevo) => {
    const el = mezoRef.current;
    if (!el || !emlites) return;
    const kurzor = el.selectionStart ?? szoveg.length;
    const uj = beszurEmlites(szoveg, kurzor, emlites.kezdet, r.nev);
    setSzoveg(uj.szoveg);
    setEmlites(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(uj.kurzor, uj.kurzor);
    });
  };

  const mezoBillentyu = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (emlites && jeloltek.length > 0) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const d = e.key === "ArrowDown" ? 1 : -1;
        setEmlitesIndex((i) => (i + d + jeloltek.length) % jeloltek.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        valasztEmlites(jeloltek[Math.min(emlitesIndex, jeloltek.length - 1)]!);
        return;
      }
    }
    if (e.key === "Escape") {
      if (emlites) setEmlites(null);
      else if (valasz) setValasz(null);
      return;
    }
    // Messenger-style: Enter sends, Shift+Enter breaks the line.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      kuld();
    }
  };

  const mentSzerkesztes = () => {
    if (!szerkesztett) return;
    const { id, szoveg: uj } = szerkesztett;
    startTransition(async () => {
      const r = await uzenetModositasAction(id, uj);
      if (!r.success) {
        toast.error(r.message ?? "Nem sikerült menteni.");
        return;
      }
      setSzerkesztett(null);
      router.refresh();
    });
  };

  const torol = (u: UzenetSor) => {
    if (!window.confirm("Törlöd az üzenetet? A helyén „Törölt üzenet” marad.")) return;
    startTransition(async () => {
      const r = await uzenetTorlesAction(u.id);
      if (!r.success) toast.error(r.message ?? "Nem sikerült törölni.");
      else router.refresh();
    });
  };

  return (
    <section
      className="bg-card flex flex-col overflow-hidden rounded-lg border"
      aria-label="Beszélgetés"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Beszélgetés</h2>
          <p className="text-muted-foreground text-xs">
            Mindenki látja, aki a feladaton dolgozik — {aktivak.length} fő. Írj @-ot
            valaki megjelöléséhez.
          </p>
        </div>
        <span
          className="flex items-center gap-2"
          title={aktivak.map((r) => `${r.nev} (${SZEREP_CIMKE[r.szerep]})`).join(", ")}
        >
          <span className="text-muted-foreground hidden text-xs sm:inline">
            Mindenki látja:
          </span>
          <AvatarSor emberek={aktivak} />
        </span>
      </header>

      <ol
        ref={listaRef}
        className="flex max-h-[32rem] min-h-40 flex-col gap-0.5 overflow-y-auto px-3 py-3 sm:px-4"
        aria-live="polite"
      >
        {szal.uzenetek.length === 0 && (
          <li className="text-muted-foreground m-auto py-8 text-center text-sm">
            Még nincs üzenet. Kérdezz, jelezz akadályt, vagy írd meg, hol tartasz.
          </li>
        )}
        {szal.uzenetek.map((u, i) => {
          const elozo = szal.uzenetek[i - 1];
          const ujNap = !elozo || napKulcs(elozo.mikor) !== napKulcs(u.mikor);
          const folytatas =
            !ujNap &&
            elozo &&
            elozo.szerzoId === u.szerzoId &&
            Date.parse(u.mikor) - Date.parse(elozo.mikor) < CSOPORT_MS &&
            !u.cimke &&
            !elozo.cimke;
          const tag = u.szerzoId ? tagById.get(u.szerzoId) : undefined;
          const sajat = u.szerzoId === sajatId;
          const szerkeszti = szerkesztett?.id === u.id;
          return (
            <Fragment key={u.id}>
              {ujNap && (
                <li
                  className="text-muted-foreground my-2 flex items-center gap-3 text-xs"
                  role="separator"
                >
                  <span className="bg-border h-px flex-1" />
                  {napCimke(u.mikor)}
                  <span className="bg-border h-px flex-1" />
                </li>
              )}
              <li
                id={`uzenet-${u.id}`}
                className={cn(
                  "group flex items-end gap-2",
                  sajat ? "flex-row-reverse" : "flex-row",
                  folytatas ? "mt-0.5" : "mt-2",
                )}
              >
                {!sajat &&
                  (folytatas ? (
                    <span className="size-8 shrink-0" aria-hidden />
                  ) : (
                    <ChatAvatar nev={u.szerzoNev} kep={tag?.kep} />
                  ))}
                <div
                  className={cn(
                    "flex min-w-0 max-w-[85%] flex-col sm:max-w-[75%]",
                    sajat ? "items-end" : "items-start",
                  )}
                >
                  {!folytatas && (
                    <span className="text-muted-foreground mb-0.5 flex flex-wrap items-baseline gap-x-1.5 px-1 text-xs">
                      {!sajat && (
                        <span className="text-foreground font-semibold">
                          {u.szerzoNev}
                        </span>
                      )}
                      {!sajat && tag && tag.szerep !== "kozremukodo" && (
                        <span>{SZEREP_CIMKE[tag.szerep]}</span>
                      )}
                      <span className="tabular-nums">{ora(u.mikor)}</span>
                      {u.cimke && <span>· {u.cimke}</span>}
                    </span>
                  )}
                  <div
                    className={cn(
                      "relative rounded-2xl px-3 py-2 text-sm leading-relaxed transition-shadow",
                      sajat
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                      sajat ? "rounded-br-md" : "rounded-bl-md",
                      u.torolt && "text-muted-foreground border bg-transparent italic",
                      kiemelt === u.id && "ring-ring ring-2 ring-offset-2",
                    )}
                  >
                    {u.valasz && (
                      <button
                        type="button"
                        onClick={() => ugras(u.valasz!.id)}
                        className={cn(
                          "mb-1.5 block w-full rounded-md border-l-2 px-2 py-1 text-left text-xs",
                          sajat
                            ? "border-primary-foreground/60 bg-primary-foreground/10"
                            : "border-primary bg-background/60",
                        )}
                      >
                        <span className="font-semibold">{u.valasz.szerzoNev}</span>
                        <span className="line-clamp-2 opacity-80">
                          {u.valasz.torolt ? "Törölt üzenet" : u.valasz.szoveg}
                        </span>
                      </button>
                    )}
                    {u.torolt ? (
                      "Törölt üzenet"
                    ) : szerkeszti ? (
                      <div className="flex w-[min(28rem,70vw)] flex-col gap-2">
                        <Textarea
                          value={szerkesztett.szoveg}
                          onChange={(e) =>
                            setSzerkesztett({ id: u.id, szoveg: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setSzerkesztett(null);
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              mentSzerkesztes();
                            }
                          }}
                          rows={3}
                          maxLength={FELADAT_SZOVEG_MAX}
                          aria-label="Üzenet szerkesztése"
                          className="bg-background text-foreground"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setSzerkesztett(null)}
                          >
                            Mégse
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={pending || !szerkesztett.szoveg.trim()}
                            onClick={mentSzerkesztes}
                          >
                            Mentés
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">
                        <Szoveg
                          szoveg={u.szoveg}
                          resztvevok={szal.resztvevok}
                          sajatId={sajatId}
                          sajatBuborek={sajat}
                        />
                      </p>
                    )}
                    {u.mediaIds.length > 0 && (
                      <CsatolmanyLista
                        className="mt-2"
                        csatolmanyok={u.mediaIds.flatMap((id) =>
                          media[id] ? [media[id]] : [],
                        )}
                      />
                    )}
                    {u.szerkesztve && !szerkeszti && (
                      <span className="mt-0.5 block text-right text-[10px] opacity-70">
                        szerkesztve
                      </span>
                    )}
                  </div>
                </div>
                {!u.torolt && !u.regi && !szerkeszti && (
                  <span
                    className={cn(
                      "flex shrink-0 gap-0.5 self-center opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100",
                    )}
                  >
                    {szal.irhat && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        aria-label={`Válasz ${u.szerzoNev} üzenetére`}
                        title="Válasz"
                        onClick={() => {
                          setValasz({
                            id: u.id,
                            szerzoNev: u.szerzoNev,
                            szoveg: idezet(u.szoveg),
                          });
                          mezoRef.current?.focus();
                        }}
                      >
                        <CornerUpLeftIcon className="size-3.5" aria-hidden />
                      </Button>
                    )}
                    {u.sajat && (
                      <>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          aria-label="Üzenet szerkesztése"
                          title="Szerkesztés"
                          onClick={() => setSzerkesztett({ id: u.id, szoveg: u.szoveg })}
                        >
                          <PencilIcon className="size-3.5" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          aria-label="Üzenet törlése"
                          title="Törlés"
                          disabled={pending}
                          onClick={() => torol(u)}
                        >
                          <Trash2Icon className="size-3.5" aria-hidden />
                        </Button>
                      </>
                    )}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
        {szal.latta.length > 0 && (
          <li className="text-muted-foreground mt-1 flex items-center justify-end gap-1.5 text-[11px]">
            Látta:
            <AvatarSor emberek={szal.latta} max={8} meret="size-4" />
          </li>
        )}
      </ol>

      {szal.irhat ? (
        <div className="flex flex-col gap-2 border-t p-3" data-export="skip">
          {valasz && (
            <div className="bg-muted border-primary flex items-start gap-2 rounded-md border-l-2 px-3 py-2 text-xs">
              <CornerUpLeftIcon
                className="text-muted-foreground mt-0.5 size-3.5 shrink-0"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <span className="font-semibold">Válasz {valasz.szerzoNev} üzenetére</span>
                <span className="text-muted-foreground line-clamp-1">
                  {valasz.szoveg}
                </span>
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Válasz elvetése"
                onClick={() => setValasz(null)}
              >
                <XIcon className="size-4" aria-hidden />
              </button>
            </div>
          )}
          <div className="relative">
            {emlites && jeloltek.length > 0 && (
              <ul
                className="bg-popover text-popover-foreground absolute bottom-full left-0 z-20 mb-1 w-64 overflow-hidden rounded-md border py-1 shadow-md"
                role="listbox"
                aria-label="Kit jelölsz meg?"
              >
                {jeloltek.map((r, i) => (
                  <li key={r.id} role="option" aria-selected={i === emlitesIndex}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm",
                        i === emlitesIndex
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent",
                      )}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        valasztEmlites(r);
                      }}
                    >
                      <ChatAvatar
                        nev={r.nev}
                        kep={r.kep}
                        className="size-6 text-[10px]"
                      />
                      <span className="min-w-0 flex-1 truncate">{r.nev}</span>
                      <span className="text-muted-foreground text-xs">
                        {SZEREP_CIMKE[r.szerep]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-end gap-2">
              <Textarea
                ref={mezoRef}
                value={szoveg}
                onChange={(e) => {
                  setSzoveg(e.target.value);
                  setEmlites(aktivEmlites(e.target.value, e.target.selectionStart ?? 0));
                  setEmlitesIndex(0);
                }}
                onKeyDown={mezoBillentyu}
                onBlur={() => setEmlites(null)}
                placeholder="Üzenet mindenkinek… (@ = megjelölés)"
                rows={2}
                maxLength={FELADAT_SZOVEG_MAX}
                aria-label="Üzenet"
                className="max-h-48 min-h-11 flex-1 resize-y"
              />
              <Button
                type="button"
                size="icon"
                disabled={pending || !szoveg.trim()}
                onClick={kuld}
                aria-label="Küldés"
                title="Küldés (Enter)"
              >
                <SendHorizontalIcon className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CsatolmanyFeltolto
              value={csatolmanyok}
              onChange={setCsatolmanyok}
              entityId={feladatId}
              disabled={pending}
            />
            <span className="text-muted-foreground hidden text-xs sm:inline">
              Enter: küldés · Shift + Enter: új sor
            </span>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground border-t px-4 py-3 text-xs">
          {szal.resztvevok.some((r) => r.id === sajatId)
            ? "A feladat lezárult — a beszélgetés olvasható, de már nem lehet írni."
            : "A beszélgetést olvasod; írni a feladat résztvevői tudnak."}
        </p>
      )}
    </section>
  );
}
