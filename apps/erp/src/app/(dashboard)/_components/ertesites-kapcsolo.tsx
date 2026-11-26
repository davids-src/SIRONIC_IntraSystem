"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { BellIcon, BellOffIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@erp/ui";
import type { PushEszkozEredmeny } from "@/lib/push";
import { pushLeiratkozasAction, pushTesztAction } from "./push-actions";
import { feliratkozik, pushTamogatott, szinkronizal } from "./push-kliens";

type Allapot = "betolt" | "nem-tamogatott" | "tiltva" | "ki" | "be";

/** Where the operating system can still silence a notification the browser has received. */
export function OsTiltasSugo() {
  return (
    <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-xs">
      <li>
        <strong>macOS:</strong> Rendszerbeállítások → Értesítések → a böngésző (Chrome,
        Edge, Safari) — engedélyezve, „Figyelmeztetés” vagy „Szalaghirdetés” stílussal; a
        Fókusz / Ne zavarjanak legyen kikapcsolva.
      </li>
      <li>
        <strong>Windows:</strong> Gépház → Rendszer → Értesítések — a böngésző értesítései
        bekapcsolva; a „Ne zavarjanak” / Fókuszsegéd kikapcsolva.
      </li>
      <li>
        <strong>Android:</strong> Beállítások → Alkalmazások → a böngésző vagy a
        telepített SIRONIC → Értesítések bekapcsolva.
      </li>
      <li>
        <strong>iPhone / iPad:</strong> csak a kezdőképernyőre telepített SIRONIC kaphat
        értesítést (iOS 16.4 vagy újabb) — Safariban megnyitva nem.
      </li>
    </ul>
  );
}

function eszkozNev(e: PushEszkozEredmeny): string {
  const ua = e.userAgent ?? "";
  const bongeszo = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Böngésző";
  const rendszer = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return [bongeszo, rendszer].filter(Boolean).join(" · ");
}

/**
 * "Asztali értesítések" on/off for this browser: asks permission, subscribes through the service
 * worker with the server's current key and stores the subscription — then a new Jelzés pops up as
 * a system notification even when the app is not open. `reszletes` adds an explanation line (the
 * Jelzések panel and page); the compact form sits in page headers.
 */
export function ErtesitesKapcsolo({ reszletes = false }: { reszletes?: boolean }) {
  const [allapot, setAllapot] = useState<Allapot>("betolt");
  const [pending, startTransition] = useTransition();
  const [teszt, setTeszt] = useState<{
    message?: string;
    eszkozok: PushEszkozEredmeny[];
  } | null>(null);

  useEffect(() => {
    if (!pushTamogatott()) {
      setAllapot("nem-tamogatott");
      return;
    }
    if (Notification.permission === "denied") {
      setAllapot("tiltva");
      return;
    }
    // Re-checks the key and re-sends the subscription, so "be" really means the server has it.
    void szinkronizal()
      .then((be) => setAllapot(be ? "be" : "ki"))
      .catch(() => setAllapot("ki"));
  }, []);

  const bekapcsol = () =>
    startTransition(async () => {
      try {
        const engedely = await Notification.requestPermission();
        if (engedely !== "granted") {
          setAllapot(engedely === "denied" ? "tiltva" : "ki");
          toast.error("Az értesítéseket a böngészőben engedélyezni kell.");
          return;
        }
        const r = await feliratkozik();
        if (r.success) {
          setAllapot("be");
          toast.success(r.message);
        } else toast.error(r.message ?? "Nem sikerült.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Nem sikerült bekapcsolni.");
      }
    });

  const kikapcsol = () =>
    startTransition(async () => {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await pushLeiratkozasAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setAllapot("ki");
      toast.success("Asztali értesítések kikapcsolva ezen az eszközön.");
    });

  const tesztel = () =>
    startTransition(async () => {
      const r = await pushTesztAction();
      setTeszt({ message: r.message, eszkozok: r.eszkozok });
      // A dropped (old-key) subscription: the switch must not keep saying "on".
      if (r.eszkozok.some((e) => e.torolve))
        void szinkronizal().then((be) => !be && setAllapot("ki"));
    });

  if (allapot === "betolt") return null;
  if (allapot === "nem-tamogatott") {
    return reszletes ? (
      <p className="text-muted-foreground text-xs">
        Ez a böngésző nem támogatja az asztali értesítéseket. iPhone-on és iPaden a
        kezdőképernyőre telepített SIRONIC kaphat értesítést (iOS 16.4 vagy újabb).
      </p>
    ) : null;
  }
  if (allapot === "tiltva") {
    return (
      <span
        className="text-muted-foreground inline-flex items-center gap-1 text-xs"
        title="A böngésző címsorában, a lakat ikonnál engedélyezhető újra."
      >
        <BellOffIcon className="h-4 w-4" /> Értesítések letiltva a böngészőben
        {reszletes && " — a címsor lakat ikonjánál engedélyezheted újra."}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {allapot === "be" ? (
        <div className="flex flex-wrap items-center gap-1">
          <Button size="sm" variant="outline" disabled={pending} onClick={tesztel}>
            <BellIcon className="text-success h-4 w-4" /> Értesítések bekapcsolva · Teszt
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={kikapcsol}>
            Kikapcsolás
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" disabled={pending} onClick={bekapcsol}>
          <BellIcon className="h-4 w-4" /> Asztali értesítések bekapcsolása
        </Button>
      )}
      {reszletes && (
        <p className="text-muted-foreground text-xs">
          {allapot === "be"
            ? "Ezen az eszközön a jelzések rendszerértesítésként is megjelennek."
            : "Bekapcsolva a jelzések akkor is felugranak, ha a SIRONIC nincs nyitva."}
        </p>
      )}

      <Dialog open={teszt !== null} onOpenChange={(o) => !o && setTeszt(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tesztértesítés</DialogTitle>
            <DialogDescription>{teszt?.message}</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {teszt?.eszkozok.map((e, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-md border p-2 text-sm"
              >
                {e.ok ? (
                  <CheckCircle2Icon className="text-success mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <XCircleIcon className="text-danger mt-0.5 h-4 w-4 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-medium">{eszkozNev(e)}</div>
                  <div className="text-muted-foreground text-xs">
                    {e.ok
                      ? `Elküldve (${e.szolgaltatas})`
                      : `Sikertelen${e.statusCode ? ` — ${e.statusCode}` : ""}: ${e.hiba ?? ""}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {teszt && teszt.eszkozok.some((e) => e.ok) && (
            <div className="bg-muted space-y-2 rounded-md p-3">
              <p className="text-sm">
                Ha az „Elküldve” ellenére nem jelent meg semmi, az operációs rendszer
                némítja a böngészőt:
              </p>
              <OsTiltasSugo />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
