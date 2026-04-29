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
        className="space-y-6"
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Header Section */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
              Alapadatok
            </h3>

            <div className="grid grid-cols-2 gap-4">
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
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
              Összegzés
            </h3>

            <div className="space-y-4">
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
        <Card className="p-6 space-y-4">
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
            <div className="border border-[var(--color-border-subtle)] rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase bg-[var(--color-bg-secondary)] p-3 border-b border-[var(--color-border-subtle)]">
                <div className="col-span-2">Munkalap ID</div>
                <div className="col-span-3">Dátum</div>
                <div className="col-span-4">Technikus</div>
                <div className="col-span-2">Állapot</div>
                <div className="col-span-1"></div>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center p-3 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-secondary)] transition-colors">
                <div className="col-span-2 font-mono text-xs">WL-000001</div>
                <div className="col-span-3 text-sm">2026.04.24. 08:00</div>
                <div className="col-span-4 text-sm">Kovács János</div>
                <div className="col-span-2">
                  <Badge variant="success">Aláírt</Badge>
                </div>
                <div className="col-span-1 flex justify-end">
                  {status === "draft" && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 w-8 text-[var(--color-status-error)] p-0"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2 items-center p-3 hover:bg-[var(--color-bg-secondary)] transition-colors">
                <div className="col-span-2 font-mono text-xs">WL-000002</div>
                <div className="col-span-3 text-sm">2026.04.25. 14:00</div>
                <div className="col-span-4 text-sm">Kovács János</div>
                <div className="col-span-2">
                  <Badge variant="success">Aláírt</Badge>
                </div>
                <div className="col-span-1 flex justify-end">
                  {status === "draft" && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 w-8 text-[var(--color-status-error)] p-0"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Signatures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
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

          <Card className="p-6 space-y-4">
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
