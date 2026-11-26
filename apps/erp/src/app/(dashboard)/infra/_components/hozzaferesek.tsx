"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input } from "@erp/ui";
import {
  HOZZAFERES_PORTOK,
  HOZZAFERES_TIPUSOK,
  HOZZAFERES_TIPUS_LABELS,
  type HozzaferesTipus,
} from "@erp/infra/client";
import type { HozzaferesSor } from "@erp/infra";
import { Field, SELECT_CLASS } from "../../eszkoz/_components/form/form-layout";
import {
  hozzaferesJelszoAction,
  mentHozzaferesAction,
  probaHozzaferesAction,
  torolHozzaferesAction,
} from "../actions";

async function masol(szoveg: string, ok: string) {
  try {
    await navigator.clipboard.writeText(szoveg);
    toast.success(ok);
  } catch {
    toast.error("A vágólapra másolás nem sikerült.");
  }
}

function HozzaferesUrlap({
  webhelyId,
  kezdo,
  vege,
}: {
  webhelyId: string;
  kezdo?: HozzaferesSor;
  vege: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tipus, setTipus] = useState<HozzaferesTipus>(kezdo?.tipus ?? "ftp");
  return (
    <form
      className="grid gap-3 rounded-md border p-3 sm:grid-cols-2"
      action={(fd) =>
        start(async () => {
          const port = String(fd.get("port") ?? "").trim();
          const r = await mentHozzaferesAction(webhelyId, kezdo?.id ?? null, {
            tipus,
            cimke: String(fd.get("cimke") ?? ""),
            host: String(fd.get("host") ?? ""),
            port: port ? Number(port) : undefined,
            felhasznalo: String(fd.get("felhasznalo") ?? ""),
            jelszo: String(fd.get("jelszo") ?? ""),
            konyvtar: String(fd.get("konyvtar") ?? ""),
            url: String(fd.get("url") ?? ""),
            megjegyzes: String(fd.get("megjegyzes") ?? ""),
          });
          if (r.success) {
            toast.success(r.message);
            router.refresh();
            vege();
          } else toast.error(r.message ?? "A mentés nem sikerült.");
        })
      }
    >
      <Field label="Típus" htmlFor="h-tipus">
        <select
          id="h-tipus"
          className={SELECT_CLASS}
          value={tipus}
          onChange={(e) => setTipus(e.target.value as HozzaferesTipus)}
        >
          {HOZZAFERES_TIPUSOK.map((t) => (
            <option key={t} value={t}>
              {HOZZAFERES_TIPUS_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Címke" htmlFor="h-cimke" required hint="Pl. „Éles SFTP”, „WP admin”.">
        <Input id="h-cimke" name="cimke" defaultValue={kezdo?.cimke} required />
      </Field>
      <Field label="Host" htmlFor="h-host" required>
        <Input id="h-host" name="host" defaultValue={kezdo?.host} required />
      </Field>
      <Field
        label="Port"
        htmlFor="h-port"
        hint={
          HOZZAFERES_PORTOK[tipus]
            ? `Alapértelmezett: ${HOZZAFERES_PORTOK[tipus]}`
            : undefined
        }
      >
        <Input
          id="h-port"
          name="port"
          type="number"
          min={1}
          max={65535}
          defaultValue={kezdo?.port}
        />
      </Field>
      <Field label="Felhasználó" htmlFor="h-user">
        <Input
          id="h-user"
          name="felhasznalo"
          defaultValue={kezdo?.felhasznalo}
          autoComplete="off"
        />
      </Field>
      <Field
        label="Jelszó"
        htmlFor="h-pw"
        hint={
          kezdo?.vanJelszo
            ? "Üresen hagyva a mentett jelszó marad."
            : "Titkosítva tárolódik."
        }
      >
        <Input id="h-pw" name="jelszo" type="password" autoComplete="new-password" />
      </Field>
      <Field label="Könyvtár" htmlFor="h-dir">
        <Input
          id="h-dir"
          name="konyvtar"
          defaultValue={kezdo?.konyvtar}
          placeholder="/public_html"
        />
      </Field>
      <Field label="URL" htmlFor="h-url" hint="Pl. a WordPress admin címe.">
        <Input id="h-url" name="url" defaultValue={kezdo?.url} />
      </Field>
      <Field label="Megjegyzés" htmlFor="h-note" className="sm:col-span-2">
        <Input id="h-note" name="megjegyzes" defaultValue={kezdo?.megjegyzes} />
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={pending}>
          {kezdo ? "Mentés" : "Hozzáférés felvétele"}
        </Button>
        <Button type="button" variant="ghost" onClick={vege}>
          Mégse
        </Button>
      </div>
    </form>
  );
}

function Kartya({
  webhelyId,
  h,
  irhat,
  titkosLathat,
}: {
  webhelyId: string;
  h: HozzaferesSor;
  irhat: boolean;
  titkosLathat: boolean;
}) {
  const router = useRouter();
  const [szerkeszt, setSzerkeszt] = useState(false);
  const [pending, start] = useTransition();
  if (szerkeszt)
    return (
      <HozzaferesUrlap webhelyId={webhelyId} kezdo={h} vege={() => setSzerkeszt(false)} />
    );
  const cel = `${h.host}${h.port ? `:${h.port}` : ""}`;
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-medium">{h.cimke}</span>{" "}
          <span className="text-muted-foreground text-xs">
            {HOZZAFERES_TIPUS_LABELS[h.tipus]}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={() => masol(cel, "Host másolva.")}>
            Host másolása
          </Button>
          {h.felhasznalo && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => masol(h.felhasznalo!, "Felhasználó másolva.")}
            >
              Felhasználó másolása
            </Button>
          )}
          {h.vanJelszo && titkosLathat && (
            <Button
              size="sm"
              variant="outline"
              loading={pending}
              title="Kimásolja a jelszót a vágólapra. A megtekintés naplózódik, a jelszó nem jelenik meg a képernyőn."
              onClick={() =>
                start(async () => {
                  const r = await hozzaferesJelszoAction(h.id);
                  if (r.success && r.jelszo)
                    await masol(r.jelszo, "Jelszó a vágólapra másolva.");
                  else toast.error(r.message ?? "A jelszó nem olvasható.");
                })
              }
            >
              Jelszó másolása
            </Button>
          )}
          {h.tipus !== "wordpress" && h.tipus !== "cpanel" && (
            <Button
              size="sm"
              variant="outline"
              loading={pending}
              title="Megnézi, hogy a host portja elérhető-e. Nem lép be."
              onClick={() =>
                start(async () => {
                  const r = await probaHozzaferesAction(h.id);
                  (r.success ? toast.success : toast.error)(r.message ?? "");
                })
              }
            >
              Kapcsolat próba
            </Button>
          )}
          {irhat && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setSzerkeszt(true)}>
                Szerkesztés
              </Button>
              <Button
                size="sm"
                variant="ghost"
                loading={pending}
                onClick={() => {
                  if (!window.confirm(`Törlöd a(z) „${h.cimke}” hozzáférést?`)) return;
                  start(async () => {
                    const r = await torolHozzaferesAction(webhelyId, h.id);
                    if (r.success) {
                      toast.success(r.message);
                      router.refresh();
                    } else toast.error(r.message ?? "A törlés nem sikerült.");
                  });
                }}
              >
                Törlés
              </Button>
            </>
          )}
        </div>
      </div>
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Host:</dt>
          <dd className="font-mono text-xs break-all">{cel}</dd>
        </div>
        {h.felhasznalo && (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Felhasználó:</dt>
            <dd className="font-mono text-xs break-all">{h.felhasznalo}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Jelszó:</dt>
          <dd>{h.vanJelszo ? "mentve (titkosítva)" : "nincs mentve"}</dd>
        </div>
        {h.konyvtar && (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Könyvtár:</dt>
            <dd className="font-mono text-xs break-all">{h.konyvtar}</dd>
          </div>
        )}
        {h.url && (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">URL:</dt>
            <dd className="text-xs break-all">{h.url}</dd>
          </div>
        )}
        {h.megjegyzes && (
          <p className="text-muted-foreground text-xs sm:col-span-2">{h.megjegyzes}</p>
        )}
      </dl>
    </div>
  );
}

export function HozzaferesLista({
  webhelyId,
  hozzaferesek,
  irhat,
  titkosLathat,
}: {
  webhelyId: string;
  hozzaferesek: HozzaferesSor[];
  irhat: boolean;
  titkosLathat: boolean;
}) {
  const [uj, setUj] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      {hozzaferesek.length === 0 && !uj && (
        <p className="text-muted-foreground text-sm">
          Még nincs eltárolt belépés ehhez a webhelyhez.
        </p>
      )}
      {hozzaferesek.map((h) => (
        <Kartya
          key={h.id}
          webhelyId={webhelyId}
          h={h}
          irhat={irhat}
          titkosLathat={titkosLathat}
        />
      ))}
      {irhat &&
        (uj ? (
          <HozzaferesUrlap webhelyId={webhelyId} vege={() => setUj(false)} />
        ) : (
          <div>
            <Button variant="outline" onClick={() => setUj(true)}>
              Új hozzáférés
            </Button>
          </div>
        ))}
    </div>
  );
}
