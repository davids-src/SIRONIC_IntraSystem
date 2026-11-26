"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { SendIcon, UsersIcon } from "lucide-react";
import { Badge, Button, Checkbox, Input, Label, Textarea, cn } from "@erp/ui";
import { JELZES_CIM_MAX, JELZES_SZOVEG_MAX } from "@erp/jelzes/constants";
import { cimzettDbAction, koruzenetAction } from "../../actions";

type Opcio = { value: string; label: string; sub?: string };

/** A searchable checkbox list — users (~300), roles, permission keys. */
function ValasztoLista({
  cim,
  opciok,
  kivalasztott,
  onChange,
  disabled,
}: {
  cim: string;
  opciok: Opcio[];
  kivalasztott: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const [kereses, setKereses] = useState("");
  const lathato = useMemo(() => {
    const q = kereses.trim().toLowerCase();
    if (!q) return opciok;
    return opciok.filter(
      (o) => o.label.toLowerCase().includes(q) || o.sub?.toLowerCase().includes(q),
    );
  }, [opciok, kereses]);
  const kij = new Set(kivalasztott);
  const valt = (v: string, be: boolean) =>
    onChange(be ? [...kivalasztott, v] : kivalasztott.filter((x) => x !== v));

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border p-3",
        disabled && "opacity-50",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{cim}</span>
        {kivalasztott.length > 0 && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-xs underline"
            onClick={() => onChange([])}
            disabled={disabled}
          >
            {kivalasztott.length} kiválasztva · törlés
          </button>
        )}
      </div>
      <Input
        value={kereses}
        onChange={(e) => setKereses(e.target.value)}
        placeholder="Keresés…"
        disabled={disabled}
        className="h-8"
      />
      <div className="max-h-56 space-y-1 overflow-y-auto">
        {lathato.length === 0 ? (
          <p className="text-muted-foreground py-2 text-xs">Nincs találat.</p>
        ) : (
          lathato.map((o) => (
            <label
              key={o.value}
              className="hover:bg-accent flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-sm"
            >
              <Checkbox
                checked={kij.has(o.value)}
                onCheckedChange={(c) => valt(o.value, c === true)}
                disabled={disabled}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="block truncate">{o.label}</span>
                {o.sub && (
                  <span className="text-muted-foreground block truncate text-xs">
                    {o.sub}
                  </span>
                )}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

export function KoruzenetForm({
  felhasznalok,
  szerepkorok,
  jogosultsagok,
}: {
  felhasznalok: { id: string; nev: string; email: string }[];
  szerepkorok: { id: string; nev: string }[];
  jogosultsagok: { key: string; nev: string; csoport: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tipus, setTipus] = useState<"koruzenet" | "frissites">("koruzenet");
  const [cim, setCim] = useState("");
  const [szoveg, setSzoveg] = useState("");
  const [url, setUrl] = useState("");
  const [push, setPush] = useState(true);
  const [mindenki, setMindenki] = useState(false);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [cimzettDb, setCimzettDb] = useState<number | null>(0);

  const cimzettek = useMemo(
    () => ({ mindenki, userIds, roleIds, permissionKeys }),
    [mindenki, userIds, roleIds, permissionKeys],
  );
  const vanCimzett =
    mindenki || userIds.length > 0 || roleIds.length > 0 || permissionKeys.length > 0;

  // Preview: how many active users this reaches (debounced).
  useEffect(() => {
    if (!vanCimzett) {
      setCimzettDb(0);
      return;
    }
    setCimzettDb(null);
    let elavult = false;
    const t = window.setTimeout(() => {
      void cimzettDbAction(cimzettek)
        .then((n) => !elavult && setCimzettDb(n))
        .catch(() => !elavult && setCimzettDb(0));
    }, 300);
    return () => {
      elavult = true;
      window.clearTimeout(t);
    };
  }, [cimzettek, vanCimzett]);

  const kuld = () =>
    startTransition(async () => {
      if (
        !window.confirm(
          `Biztosan elküldöd${cimzettDb ? ` ${cimzettDb} címzettnek` : ""}? Visszavonni nem lehet.`,
        )
      )
        return;
      const r = await koruzenetAction({ tipus, cim, szoveg, url, push, cimzettek });
      if (!r.success) {
        toast.error(r.message ?? "Nem sikerült elküldeni.");
        return;
      }
      toast.success(r.message);
      setCim("");
      setSzoveg("");
      setUrl("");
      router.refresh();
    });

  return (
    <form
      className="bg-card flex flex-col gap-4 rounded-md border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        kuld();
      }}
    >
      <div className="flex flex-col gap-2">
        <Label>Típus</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={tipus === "koruzenet" ? "default" : "outline"}
            onClick={() => setTipus("koruzenet")}
          >
            Körüzenet
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tipus === "frissites" ? "default" : "outline"}
            onClick={() => setTipus("frissites")}
          >
            Frissítési jegyzet
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          {tipus === "frissites"
            ? "A címzetteknél „Újdonság” jelöléssel jelenik meg — a SIRONIC új funkcióinak bejelentésére."
            : "Általános tájékoztatás, „Körüzenet” jelöléssel."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="jelzes-cim">Cím</Label>
        <Input
          id="jelzes-cim"
          value={cim}
          maxLength={JELZES_CIM_MAX}
          onChange={(e) => setCim(e.target.value)}
          placeholder={
            tipus === "frissites"
              ? "Új: Jelzések és körüzenetek"
              : "Pénteken üzemi leállás"
          }
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="jelzes-szoveg">Szöveg</Label>
        <Textarea
          id="jelzes-szoveg"
          value={szoveg}
          maxLength={JELZES_SZOVEG_MAX}
          onChange={(e) => setSzoveg(e.target.value)}
          rows={5}
          placeholder="Rövid, egyszerű szöveg. A sortörések megmaradnak."
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="jelzes-url">Link (nem kötelező)</Label>
        <Input
          id="jelzes-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="/help/jelzesek vagy https://…"
        />
        <p className="text-muted-foreground text-xs">
          A jelzésre kattintva ez nyílik meg. SIRONIC-oldal „/”-rel kezdődik.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Címzettek</Label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={mindenki} onCheckedChange={(c) => setMindenki(c === true)} />
          <span>
            <strong>Mindenki</strong> — minden aktív felhasználó
          </span>
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          <ValasztoLista
            cim="Felhasználók"
            disabled={mindenki}
            opciok={felhasznalok.map((f) => ({
              value: f.id,
              label: f.nev,
              sub: f.email,
            }))}
            kivalasztott={userIds}
            onChange={setUserIds}
          />
          <ValasztoLista
            cim="Szerepkörök (minden tagja)"
            disabled={mindenki}
            opciok={szerepkorok.map((s) => ({ value: s.id, label: s.nev }))}
            kivalasztott={roleIds}
            onChange={setRoleIds}
          />
          <ValasztoLista
            cim="Jogosultság birtokosai"
            disabled={mindenki}
            opciok={jogosultsagok.map((j) => ({
              value: j.key,
              label: j.nev,
              sub: `${j.csoport} · ${j.key}`,
            }))}
            kivalasztott={permissionKeys}
            onChange={setPermissionKeys}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={push} onCheckedChange={(c) => setPush(c === true)} />
        Asztali értesítés (push) is — azoknak, akik bekapcsolták
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <span className="text-muted-foreground inline-flex items-center gap-2 text-sm">
          <UsersIcon className="h-4 w-4" />
          {cimzettDb === null ? (
            "Címzettek számolása…"
          ) : (
            <>
              <Badge variant={cimzettDb > 0 ? "secondary" : "outline"}>{cimzettDb}</Badge>
              aktív felhasználó kapja meg
            </>
          )}
        </span>
        <Button type="submit" disabled={pending || !cim.trim() || !cimzettDb}>
          <SendIcon className="h-4 w-4" /> Küldés
        </Button>
      </div>
    </form>
  );
}
