"use client";

import { PageHeader, Card, Button, Input, Badge, Table } from "@crm/ui";
import { useRouter } from "next/navigation";
import { useState, use } from "react";
import {
  Save,
  FileSignature,
  FileText,
  CheckCircle2,
  Search,
  Link as LinkIcon,
  Trash2,
  Download,
} from "lucide-react";

export default function CompletionCertificateFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const isNew = id === "new";

  // Form state mock
  const [status, setStatus] = useState(isNew ? "draft" : "signed");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={isNew ? "Új teljesítési igazolás" : `Teljesítési igazolás: CC-000001`}
        subtitle="Szerződések és projektek lezárása, elvégzett munkák igazolása"
        actions={
          <Button
            variant="secondary"
            onClick={() => router.push("/completion-certificates")}
          >
            Vissza
          </Button>
        }
      />

      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          router.push("/completion-certificates");
        }}
      >
        {/* Status bar */}
        {!isNew && (
          <div className="flex items-center gap-3 p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-lg">
            <span className="text-sm font-medium text-[var(--color-text-muted)]">
              Állapot:
            </span>
            <Badge
              variant={
                status === "draft"
                  ? "default"
                  : status === "signed"
                    ? "success"
                    : "warning"
              }
            >
              {status === "draft"
                ? "Piszkozat"
                : status === "signed"
                  ? "Aláírva (Elfogadva)"
                  : "Véglegesített (Aláírásra vár)"}
            </Badge>
            <div className="flex-1"></div>
            {status === "draft" && (
              <Button
                type="button"
                variant="primary"
                onClick={() => setStatus("finalized")}
              >
                <CheckCircle2 size={16} className="mr-2" />
                Véglegesítés (Küldés ügyfélnek)
              </Button>
            )}
            {(status === "finalized" || status === "signed") && (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  window.open(`/completion-certificates/${id}/print`, "_blank")
                }
              >
                <Download size={16} style={{ marginRight: "8px" }} />
                Megtekintés / PDF
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Header Section */}
          <Card className="p-8 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
              Alapadatok
            </h3>

            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Szervezet *
                </label>
                <select
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                  required
                  disabled={status !== "draft"}
                >
                  <option value="org1">Acme Kft.</option>
                  <option value="org2">GlobalTech Zrt.</option>
                </select>
              </div>

              <div className="col-span-2">
                <Input
                  label="Projekt megnevezése / Tárgy *"
                  placeholder="Pl. Új irodaház hálózatépítés"
                  required
                  disabled={status !== "draft"}
                  defaultValue={
                    !isNew ? "Új irodaház hálózatépítés és szerver telepítés" : ""
                  }
                />
              </div>

              <div className="col-span-2">
                <Input
                  type="date"
                  label="Teljesítés dátuma *"
                  required
                  disabled={status !== "draft"}
                  defaultValue={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
          </Card>

          {/* Details Section */}
          <Card className="p-8 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
              Összegzés
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Elvégzett feladatok és eredmények összefoglalása *
                </label>
                <textarea
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)] transition-colors min-h-[165px] resize-y"
                  required
                  disabled={status !== "draft"}
                  defaultValue={
                    !isNew
                      ? "A megrendelt hálózatépítési és szerver telepítési munkálatok a szerződésben foglaltak szerint, határidőre és a műszaki előírásoknak megfelelően elkészültek."
                      : ""
                  }
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Linked Worklogs Section */}
        <Card className="p-8 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Csatolt Munkalapok
            </h3>
            {status === "draft" && (
              <Button type="button" variant="ghost" className="text-sm h-8 px-2">
                <LinkIcon size={14} className="mr-1" /> Munkalap csatolása
              </Button>
            )}
          </div>

          <div className="text-sm text-[var(--color-text-secondary)]">
            A teljesítési igazoláshoz csatolt munkalapok részletesen tartalmazzák az
            elvégzett munkákat és a felhasznált anyagokat.
          </div>

          {!isNew && (
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
                      {status === "draft" && (
                        <button
                          type="button"
                          className="text-[var(--color-text-muted)] hover:text-[var(--color-status-error)] transition-colors p-2 rounded-md hover:bg-red-500/10"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
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
                      {status === "draft" && (
                        <button
                          type="button"
                          className="text-[var(--color-text-muted)] hover:text-[var(--color-status-error)] transition-colors p-2 rounded-md hover:bg-red-500/10"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Signatures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="p-8 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2 flex items-center gap-2">
              <FileSignature size={16} /> Szállító (SIRONIC) Aláírása
            </h3>
            <Input
              label="Képviselő neve *"
              required
              disabled={status !== "draft"}
              defaultValue="Kovács János"
            />
            <div className="h-32 bg-[var(--color-bg-primary)] border border-dashed border-[var(--color-border-default)] rounded-md flex items-center justify-center text-[var(--color-text-muted)] relative">
              {!isNew && status === "signed" ? (
                <span className="font-serif italic text-3xl opacity-80 text-[var(--color-text-primary)]">
                  Kovács János
                </span>
              ) : (
                "Aláírás pad helye"
              )}
            </div>
          </Card>

          <Card className="p-8 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2 flex items-center gap-2">
              <FileSignature size={16} /> Megrendelő Aláírása
            </h3>
            <Input
              label="Képviselő neve *"
              required
              disabled={status !== "draft"}
              defaultValue={!isNew ? "Nagy Péter" : ""}
            />
            <div className="h-32 bg-[var(--color-bg-primary)] border border-dashed border-[var(--color-border-default)] rounded-md flex items-center justify-center text-[var(--color-text-muted)] relative">
              {!isNew && status === "signed" ? (
                <span className="font-serif italic text-3xl opacity-80 text-[var(--color-text-primary)]">
                  Nagy Péter
                </span>
              ) : (
                "Aláírás pad helye (Ügyfél portálon)"
              )}
            </div>
          </Card>
        </div>

        {/* Footer Actions */}
        {status === "draft" && (
          <div className="flex justify-end gap-3 sticky bottom-4 bg-[var(--color-bg-card)] p-4 rounded-xl border border-[var(--color-border-subtle)] shadow-xl">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Mégse
            </Button>
            <Button type="submit" variant="primary">
              <Save size={16} className="mr-2" />
              Mentés Piszkozatként
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
