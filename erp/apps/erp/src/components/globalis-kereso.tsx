"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { cn } from "@erp/lib";
import { szuresMenu, type MenuBejegyzes } from "@/lib/navigation/menu-kereses";

type Hit = {
  entityLabel: string;
  entityId: string;
  title: string;
  subtitle?: string;
  url: string;
};
type Csoport = { modul: string; cimke: string; talalatok: Hit[] };
type Elem = { key: string; href: string; cim: string; al?: string; tipus: string };

const MIN = 2;

/**
 * Header search box: menu / module entries filter instantly in the browser, record hits come
 * from `/api/kereses` (debounced, cancellable) — no page reload; Enter without a highlighted
 * row opens the full `/kereses` page. Without JavaScript the surrounding form still works.
 */
export function GlobalisKereso({ menu }: { menu: MenuBejegyzes[] }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLFormElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [csoportok, setCsoportok] = useState<Csoport[]>([]);
  const [toltes, setToltes] = useState(false);
  const [aktiv, setAktiv] = useState(-1);

  const menuTalalat = useMemo(() => szuresMenu(menu, q), [menu, q]);

  // Debounced, cancellable record search.
  useEffect(() => {
    const term = q.trim();
    if (term.length < MIN) {
      setCsoportok([]);
      setToltes(false);
      return;
    }
    setToltes(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/kereses?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
        });
        const json = (await res.json()) as { csoportok?: Csoport[] };
        setCsoportok(json.csoportok ?? []);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setCsoportok([]);
      } finally {
        if (!ctrl.signal.aborted) setToltes(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  // Ctrl/Cmd+K or "/" focuses the box; a click outside closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, []);

  const elemek: Elem[] = useMemo(
    () => [
      ...menuTalalat.map((m) => ({
        key: `m:${m.href}`,
        href: m.href,
        cim: m.label,
        al: m.csoport,
        tipus: "Menü",
      })),
      ...csoportok.flatMap((c) =>
        c.talalatok.map((t) => ({
          key: `h:${c.modul}:${t.entityId}`,
          href: t.url,
          cim: t.title,
          al: t.subtitle,
          tipus: `${c.cimke} · ${t.entityLabel}`,
        })),
      ),
    ],
    [menuTalalat, csoportok],
  );

  useEffect(() => setAktiv(-1), [q, csoportok]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  const teljes = () => go(`/kereses?q=${encodeURIComponent(q.trim())}`);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setAktiv((a) => Math.min(a + 1, elemek.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAktiv((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      const el = elemek[aktiv];
      if (el) {
        e.preventDefault();
        go(el.href);
      } else if (q.trim().length >= MIN) {
        e.preventDefault();
        teljes();
      }
    }
  };

  const mutat = open && q.trim().length > 0;

  return (
    <form
      ref={boxRef}
      action="/kereses"
      method="get"
      role="search"
      className="relative hidden sm:block"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim().length >= MIN) teljes();
      }}
    >
      <label htmlFor="globalis-kereses" className="sr-only">
        Keresés
      </label>
      <SearchIcon className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-4" />
      <input
        ref={inputRef}
        id="globalis-kereses"
        name="q"
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Keresés… (Ctrl+K)"
        autoComplete="off"
        role="combobox"
        aria-expanded={mutat}
        aria-controls={listId}
        aria-autocomplete="list"
        className="border-input bg-background h-9 w-44 rounded-md border pr-3 pl-8 text-sm lg:w-64"
      />
      {mutat && (
        <div
          id={listId}
          role="listbox"
          className="bg-popover text-popover-foreground absolute right-0 z-50 mt-1 max-h-96 w-[min(28rem,90vw)] overflow-y-auto rounded-md border p-1 shadow-md"
        >
          {elemek.length === 0 && !toltes && (
            <p className="text-muted-foreground px-3 py-2 text-sm">
              {q.trim().length < MIN
                ? `Írj be legalább ${MIN} karaktert az adatok kereséséhez.`
                : "Nincs találat."}
            </p>
          )}
          {elemek.map((el, i) => (
            <button
              key={el.key}
              type="button"
              role="option"
              aria-selected={i === aktiv}
              onMouseEnter={() => setAktiv(i)}
              onClick={() => go(el.href)}
              className={cn(
                "flex w-full flex-col items-start rounded-sm px-3 py-1.5 text-left text-sm",
                i === aktiv && "bg-accent text-accent-foreground",
              )}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="truncate font-medium">{el.cim}</span>
                <span className="text-muted-foreground shrink-0 text-xs">{el.tipus}</span>
              </span>
              {el.al && (
                <span className="text-muted-foreground truncate text-xs">{el.al}</span>
              )}
            </button>
          ))}
          {toltes && (
            <p className="text-muted-foreground px-3 py-2 text-xs">
              Keresés az adatokban…
            </p>
          )}
          {q.trim().length >= MIN && (
            <button
              type="button"
              onClick={teljes}
              className="text-primary hover:bg-accent mt-1 w-full rounded-sm border-t px-3 py-2 text-left text-sm"
            >
              Összes találat megnyitása: „{q.trim()}”
            </button>
          )}
        </div>
      )}
    </form>
  );
}
