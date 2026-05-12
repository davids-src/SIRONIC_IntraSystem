"use client";

import { PageHeader, Card, Button, Badge } from "@crm/ui";
import { useRouter } from "next/navigation";
import { useState, use } from "react";
import { FileSignature, Download, CheckCircle2, Eye } from "lucide-react";

export default function PartnerCompletionCertificateDetailPage({
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Teljesítési igazolás: CC-000001`}
        subtitle="Szerződések és projektek lezárása, elvégzett munkák igazolása"
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push("/completion-certificates")}
            >
              Vissza
            </Button>
            <Button variant="primary">
              <Download size={16} className="mr-2" />
              PDF Letöltése
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3 p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-lg">
        <span className="text-sm font-medium text-[var(--color-text-muted)]">
          Állapot:
        </span>
        <Badge variant={signed ? "success" : "warning"}>
          {signed ? "Aláírva (Elfogadva)" : "Aláírásra vár"}
        </Badge>
        <div className="flex-1"></div>
        {!signed && (
          <Button type="button" variant="primary" onClick={() => setSigned(true)}>
            <FileSignature size={16} className="mr-2" />
            Aláírás és Elfogadás
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Header Section */}
        <Card className="p-8 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
            Alapadatok
          </h3>

          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div className="col-span-2">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">
                Projekt megnevezése / Tárgy
              </div>
              <div className="font-medium">
                Új irodaház hálózatépítés és szerver telepítés
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--color-text-muted)] mb-1">
                Teljesítés dátuma
              </div>
              <div className="font-medium">{new Date().toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--color-text-muted)] mb-1">
                Szállító / Kivitelező
              </div>
              <div className="font-medium">SIRONIC</div>
            </div>
          </div>
        </Card>

        {/* Details Section */}
        <Card className="p-8 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
            Összegzés
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-bg-secondary)]/50 p-6 border border-[var(--color-border-subtle)] backdrop-blur-sm shadow-sm rounded-lg rounded-md min-h-[120px]">
            A megrendelt hálózatépítési és szerver telepítési munkálatok a szerződésben
            foglaltak szerint, határidőre és a műszaki előírásoknak megfelelően
            elkészültek. A hálózat tesztelése sikeresen megtörtént, a szerverek
            üzemkészek.
          </p>
        </Card>
      </div>

      {/* Linked Worklogs Section */}
      <Card className="p-8 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-4">
        <div className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Csatolt Munkalapok
          </h3>
        </div>

        <div className="text-sm text-[var(--color-text-secondary)] mb-4">
          Az alábbi munkalapok részletesen tartalmazzák az elvégzett munkákat és a
          felhasznált anyagokat.
        </div>

        <div className="overflow-x-auto border border-[var(--color-border-subtle)] rounded-lg">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-subtle)]">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Munkalap ID
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Dátum
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Technikus
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Állapot
                </th>
                <th className="px-4 py-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)] text-sm">
              <tr className="bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-hover)] transition-colors">
                <td className="px-4 py-3 font-mono text-xs">WL-000001</td>
                <td className="px-4 py-3">2026.04.24. 08:00</td>
                <td className="px-4 py-3">Kovács János</td>
                <td className="px-4 py-3">
                  <Badge variant="success">Aláírt</Badge>
                </td>
                <td className="px-4 py-3 text-center align-middle">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => router.push(`/worklogs/WL-000001`)}
                  >
                    <Eye size={14} />
                  </Button>
                </td>
              </tr>
              <tr className="bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-hover)] transition-colors">
                <td className="px-4 py-3 font-mono text-xs">WL-000002</td>
                <td className="px-4 py-3">2026.04.25. 14:00</td>
                <td className="px-4 py-3">Kovács János</td>
                <td className="px-4 py-3">
                  <Badge variant="success">Aláírt</Badge>
                </td>
                <td className="px-4 py-3 text-center align-middle">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => router.push(`/worklogs/WL-000002`)}
                  >
                    <Eye size={14} />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Signatures */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-8 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[var(--color-status-success)]" />{" "}
            Szállító (SIRONIC) Aláírása
          </h3>
          <div className="text-sm font-medium mb-2">Kovács János</div>
          <div className="h-24 bg-[var(--color-bg-secondary)] rounded-md flex items-center justify-center relative">
            <span className="font-serif italic text-3xl opacity-80 text-[var(--color-text-primary)]">
              Kovács János
            </span>
          </div>
        </Card>

        <Card className="p-8 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2 flex items-center gap-2">
            {signed ? (
              <>
                <CheckCircle2 size={16} className="text-[var(--color-status-success)]" />{" "}
                Megrendelő Aláírása
              </>
            ) : (
              <>
                <FileSignature size={16} className="text-[var(--color-status-warning)]" />{" "}
                Megrendelő Aláírása (Hiányzik)
              </>
            )}
          </h3>
          {signed ? (
            <>
              <div className="text-sm font-medium mb-2">Saját Felhasználó</div>
              <div className="h-24 bg-[var(--color-bg-secondary)] rounded-md flex items-center justify-center">
                <span className="font-serif italic text-3xl opacity-80 text-[var(--color-text-primary)]">
                  Saját Felhasználó
                </span>
              </div>
            </>
          ) : (
            <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center text-[var(--color-text-muted)] space-y-2">
              <FileSignature size={32} className="opacity-50" />
              <p className="text-sm">
                Az igazolás elfogadásához kérjük, kattints az "Aláírás és Elfogadás"
                gombra.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
