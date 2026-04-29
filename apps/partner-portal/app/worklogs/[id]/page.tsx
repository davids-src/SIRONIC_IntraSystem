"use client";

import { PageHeader, Card, Button, Input, Badge } from "@crm/ui";
import { useRouter } from "next/navigation";
import { useState, use } from "react";
import { FileSignature, Download, CheckCircle2 } from "lucide-react";

export default function PartnerWorklogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  // Mock State
  const [signed, setSigned] = useState(false);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={`Munkalap: WL-000001`}
        subtitle="Részletes munkavégzés és anyagfelhasználás megtekintése"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push("/worklogs")}>
              Vissza
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.open(`/worklogs/${id}/print`, "_blank")}
            >
              <Download size={16} style={{ marginRight: "8px" }} />
              Megtekintés / PDF
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3 p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-lg">
        <span className="text-sm font-medium text-[var(--color-text-muted)]">
          Állapot:
        </span>
        <Badge variant={signed ? "info" : "success"}>
          {signed ? "Aláírva" : "Jóváhagyásra vár (Véglegesített)"}
        </Badge>
        <div className="flex-1"></div>
        {!signed && (
          <Button type="button" variant="primary" onClick={() => setSigned(true)}>
            <FileSignature size={16} className="mr-2" />
            Aláírás és Elfogadás
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
            Alapadatok
          </h3>

          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div className="col-span-2">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">
                Munkavégzés típusa
              </div>
              <div className="font-medium">IT Támogatás</div>
            </div>
            <div>
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Dátum</div>
              <div className="font-medium">{new Date().toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Időtartam</div>
              <div className="font-medium">08:00 - 12:30 (4.5 óra)</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">
                Helyszín / Cím
              </div>
              <div className="font-medium">Központi iroda, 1054 Budapest</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
            Elvégzett munka leírása
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-bg-secondary)] p-4 rounded-md min-h-[120px]">
            Szerver hiba elhárítása, hálózati switch újraindítása és konfigurálása. A
            portok ellenőrzése során kiderült, hogy az 1-es port kontakthibás. A kábelt
            kicseréltük és áthelyeztük a 2-es portra. A rendszer tesztelése sikeres volt.
          </p>
          <div className="text-sm">
            <span className="text-[var(--color-text-muted)]">
              Kiszállás / Útiköltség:
            </span>{" "}
            <span className="font-medium">15 km</span>
          </div>
        </Card>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
            Szervizelt Eszközök
          </h3>
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase px-2 mb-2">
            <div className="col-span-3">Eszköz Neve</div>
            <div className="col-span-2">Típus</div>
            <div className="col-span-3">Sorozatszám</div>
            <div className="col-span-4">Elvégzett feladat</div>
          </div>
          <div className="grid grid-cols-12 gap-2 items-center px-2 py-2 bg-[var(--color-bg-secondary)] rounded-md text-sm">
            <div className="col-span-3 font-medium">SRV-01</div>
            <div className="col-span-2 text-[var(--color-text-muted)]">Szerver</div>
            <div className="col-span-3 font-mono text-xs">SN-12345678</div>
            <div className="col-span-4">Újraindítás, patch kábel csere</div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-[var(--color-border-subtle)]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
            Felhasznált Anyagok
          </h3>
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase px-2 mb-2">
            <div className="col-span-6">Megnevezés</div>
            <div className="col-span-3">Cikkszám</div>
            <div className="col-span-3">Mennyiség</div>
          </div>
          <div className="grid grid-cols-12 gap-2 items-center px-2 py-2 bg-[var(--color-bg-secondary)] rounded-md text-sm">
            <div className="col-span-6 font-medium">CAT6 Patch kábel 2m</div>
            <div className="col-span-3 text-[var(--color-text-muted)]">CAB-001</div>
            <div className="col-span-3">1 db</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[var(--color-status-success)]" />{" "}
            Technikus Aláírása
          </h3>
          <div className="text-sm font-medium mb-2">Kovács János (SIRONIC)</div>
          <div className="h-24 bg-[var(--color-bg-secondary)] rounded-md flex items-center justify-center">
            {/* Signature image mock */}
            <span className="font-serif italic text-2xl opacity-50">Kovács János</span>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2 flex items-center gap-2">
            {signed ? (
              <>
                <CheckCircle2 size={16} className="text-[var(--color-status-success)]" />{" "}
                Ügyfél Aláírása
              </>
            ) : (
              <>
                <FileSignature size={16} className="text-[var(--color-status-warning)]" />{" "}
                Ügyfél Aláírása (Hiányzik)
              </>
            )}
          </h3>
          {signed ? (
            <>
              <div className="text-sm font-medium mb-2">Nagy Péter</div>
              <div className="h-24 bg-[var(--color-bg-secondary)] rounded-md flex items-center justify-center">
                <span className="font-serif italic text-2xl opacity-50">Nagy Péter</span>
              </div>
            </>
          ) : (
            <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center text-[var(--color-text-muted)] space-y-2">
              <FileSignature size={32} className="opacity-50" />
              <p className="text-sm">
                A munkalap elfogadásához kérjük, kattints az "Aláírás és Elfogadás"
                gombra.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
