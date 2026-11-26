"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { BellIcon, CheckCheckIcon, SettingsIcon } from "lucide-react";
import type { JelzesSor } from "@erp/jelzes";
import {
  Button,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
} from "@erp/ui";
import {
  legutobbiJelzesekAction,
  olvasatlanDbAction,
  olvasottAction,
} from "@/app/(dashboard)/jelzesek/actions";
import { ErtesitesKapcsolo } from "@/app/(dashboard)/_components/ertesites-kapcsolo";
import { JelzesElem } from "./jelzes-elem";

const FRISSITES_MS = 60_000;

/**
 * The bell in the header: unread count (from the layout, then refreshed every minute and when the
 * window regains focus), and a side panel with the latest Jelzések, "Mind olvasott", a link to the
 * full list and the desktop-notification switch for this device.
 */
export function JelzesCsengo({ olvasatlan: kezdo }: { olvasatlan: number }) {
  const router = useRouter();
  const [olvasatlan, setOlvasatlan] = useState(kezdo);
  const [nyitva, setNyitva] = useState(false);
  const [sorok, setSorok] = useState<JelzesSor[] | null>(null);
  const [pending, startTransition] = useTransition();

  // A server render (navigation, router.refresh) brings a fresh number.
  useEffect(() => setOlvasatlan(kezdo), [kezdo]);

  useEffect(() => {
    const frissit = () => {
      if (document.visibilityState !== "visible") return;
      void olvasatlanDbAction()
        .then(setOlvasatlan)
        .catch(() => undefined);
    };
    const id = window.setInterval(frissit, FRISSITES_MS);
    window.addEventListener("focus", frissit);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", frissit);
    };
  }, []);

  const betolt = useCallback(() => {
    void legutobbiJelzesekAction()
      .then((r) => {
        setSorok(r.sorok);
        setOlvasatlan(r.olvasatlan);
      })
      .catch(() => setSorok([]));
  }, []);

  const nyit = (o: boolean) => {
    setNyitva(o);
    if (o) betolt();
  };

  const mindOlvasott = () =>
    startTransition(async () => {
      await olvasottAction("mind");
      setSorok((s) => s?.map((x) => ({ ...x, olvasva: true })) ?? s);
      setOlvasatlan(0);
      router.refresh();
    });

  const cimke = olvasatlan > 99 ? "99+" : String(olvasatlan);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => nyit(true)}
        aria-label={olvasatlan > 0 ? `Jelzések — ${olvasatlan} olvasatlan` : "Jelzések"}
        title={olvasatlan > 0 ? `${olvasatlan} olvasatlan jelzés` : "Jelzések"}
        data-tour="jelzesek"
      >
        <BellIcon className="h-5 w-5" />
        {olvasatlan > 0 && (
          <span className="bg-danger text-danger-foreground absolute -right-0.5 -top-0.5 min-w-4 rounded-full px-1 text-center text-[10px] font-semibold tabular-nums leading-4">
            {cimke}
          </span>
        )}
      </Button>

      <Sheet open={nyitva} onOpenChange={nyit}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b p-4">
            <SheetTitle>Jelzések</SheetTitle>
            <SheetDescription>
              {olvasatlan > 0 ? `${olvasatlan} olvasatlan` : "Nincs olvasatlan jelzésed."}
            </SheetDescription>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                disabled={pending || olvasatlan === 0}
                onClick={mindOlvasott}
              >
                <CheckCheckIcon className="h-4 w-4" /> Mind olvasott
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/jelzesek" onClick={() => setNyitva(false)}>
                  Összes értesítés
                </Link>
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/jelzesek/beallitasok" onClick={() => setNyitva(false)}>
                  <SettingsIcon className="h-4 w-4" /> Beállítások
                </Link>
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {sorok === null ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : sorok.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Még nem kaptál jelzést.
              </p>
            ) : (
              sorok.map((s) => (
                <JelzesElem
                  key={s.id}
                  sor={s}
                  tomor
                  onMegnyitva={() => setNyitva(false)}
                />
              ))
            )}
          </div>

          <Separator />
          <div className="space-y-2 p-4">
            <p className="text-sm font-medium">Asztali értesítések ezen az eszközön</p>
            <ErtesitesKapcsolo reszletes />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
