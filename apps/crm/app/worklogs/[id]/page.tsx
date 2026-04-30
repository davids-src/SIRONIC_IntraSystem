"use client";

import { PageHeader, Card, Button, Input, Badge } from "@crm/ui";
import { useRouter } from "next/navigation";
import { useState, use } from "react";
import {
  Save,
  FileSignature,
  FileText,
  CheckCircle2,
  Plus,
  Trash2,
  Download,
} from "lucide-react";

export default function WorklogFormPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const isNew = id === "new";

  // Form state mock
  const [status, setStatus] = useState("draft");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/worklogs");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={isNew ? "Új munkalap rögzítése" : `Munkalap szerkesztése: WL-000001`}
        subtitle="Részletes adminisztráció és anyagfelhasználás"
        actions={
          <Button variant="secondary" onClick={() => router.push("/worklogs")}>
            Vissza
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Status bar */}
        {!isNew && (
          <div className="flex items-center gap-3 p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-lg">
            <span className="text-sm font-medium text-[var(--color-text-muted)]">
              Állapot:
            </span>
            <Badge variant={status === "draft" ? "default" : "success"}>
              {status === "draft" ? "Piszkozat" : "Véglegesített"}
            </Badge>
            <div className="flex-1"></div>
            {status === "draft" && (
              <Button
                type="button"
                variant="primary"
                onClick={() => setStatus("finalized")}
              >
                <CheckCircle2 size={16} className="mr-2" />
                Véglegesítés (Lezárás)
              </Button>
            )}
            {status === "finalized" && (
              <Button
                variant="secondary"
                onClick={() => window.open(`/worklogs/${id}/print`, "_blank")}
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
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Munkavégzés típusa *
                </label>
                <select
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                  required
                  disabled={status !== "draft"}
                >
                  <option value="it_support">IT Támogatás</option>
                  <option value="network">Hálózatépítés</option>
                  <option value="security">Biztonságtechnika</option>
                  <option value="maintenance">Karbantartás</option>
                </select>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Input
                  type="date"
                  label="Dátum *"
                  required
                  disabled={status !== "draft"}
                  defaultValue={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="col-span-2 sm:col-span-1 grid grid-cols-2 gap-2">
                <Input
                  type="time"
                  label="Kezdés *"
                  required
                  disabled={status !== "draft"}
                  defaultValue="08:00"
                />
                <Input
                  type="time"
                  label="Befejezés *"
                  required
                  disabled={status !== "draft"}
                  defaultValue="16:00"
                />
              </div>

              <div className="col-span-2">
                <Input
                  label="Helyszín / Cím"
                  placeholder="Opcionális cím"
                  disabled={status !== "draft"}
                />
              </div>
            </div>
          </Card>

          {/* Details Section */}
          <Card className="p-8 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
              Részletek
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Elvégzett munka részletes leírása *
                </label>
                <textarea
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)] transition-colors min-h-[120px] resize-y"
                  required
                  disabled={status !== "draft"}
                  defaultValue={!isNew ? "Szerver hiba elhárítása..." : ""}
                />
              </div>

              <Input
                type="number"
                label="Kiszállás / Útiköltség (km)"
                placeholder="Pl. 15"
                disabled={status !== "draft"}
              />

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Belső megjegyzés (Ügyfél nem látja)
                </label>
                <textarea
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)] transition-colors min-h-[60px]"
                  disabled={status !== "draft"}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Dynamic Lists Section */}
        <Card className="p-8 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-8">
          {/* Devices Serviced */}
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Szervizelt Eszközök
              </h3>
              {status === "draft" && (
                <Button type="button" variant="ghost" className="text-sm h-8 px-2">
                  <Plus size={14} className="mr-1" /> Új eszköz
                </Button>
              )}
            </div>

            <div className="overflow-x-auto border border-[var(--color-border-subtle)] rounded-lg">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-subtle)]">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Eszköz Neve
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-[150px]">
                      Típus
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-[200px]">
                      Sorozatszám
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Elvégzett feladat
                    </th>
                    <th className="px-4 py-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  <tr className="bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-hover)] transition-colors">
                    <td className="p-2 align-top">
                      <Input
                        placeholder="Pl. SRV-01"
                        disabled={status !== "draft"}
                        defaultValue={!isNew ? "SRV-01" : ""}
                        style={{ height: "36px", background: "transparent" }}
                      />
                    </td>
                    <td className="p-2 align-top">
                      <Input
                        placeholder="Szerver"
                        disabled={status !== "draft"}
                        defaultValue={!isNew ? "Szerver" : ""}
                        style={{ height: "36px", background: "transparent" }}
                      />
                    </td>
                    <td className="p-2 align-top">
                      <Input
                        placeholder="SN..."
                        disabled={status !== "draft"}
                        defaultValue={!isNew ? "SN-123" : ""}
                        style={{ height: "36px", background: "transparent" }}
                      />
                    </td>
                    <td className="p-2 align-top">
                      <Input
                        placeholder="Javítás..."
                        disabled={status !== "draft"}
                        defaultValue={!isNew ? "Újraindítás" : ""}
                        style={{ height: "36px", background: "transparent" }}
                      />
                    </td>
                    <td className="p-2 text-center align-middle">
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
          </div>

          {/* Materials Used */}
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Felhasznált Anyagok
              </h3>
              {status === "draft" && (
                <Button type="button" variant="ghost" className="text-sm h-8 px-2">
                  <Plus size={14} className="mr-1" /> Új anyag
                </Button>
              )}
            </div>

            <div className="overflow-x-auto border border-[var(--color-border-subtle)] rounded-lg">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-subtle)]">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Megnevezés
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-[180px]">
                      Cikkszám
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-[120px]">
                      Mennyiség
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-[120px]">
                      Egység
                    </th>
                    <th className="px-4 py-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  <tr className="bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-hover)] transition-colors">
                    <td className="p-2 align-top">
                      <Input
                        placeholder="Anyag neve"
                        disabled={status !== "draft"}
                        defaultValue={!isNew ? "CAT6 Patch kábel 2m" : ""}
                        style={{ height: "36px", background: "transparent" }}
                      />
                    </td>
                    <td className="p-2 align-top">
                      <Input
                        placeholder="Opcionális"
                        disabled={status !== "draft"}
                        defaultValue={!isNew ? "CAB-001" : ""}
                        style={{ height: "36px", background: "transparent" }}
                      />
                    </td>
                    <td className="p-2 align-top">
                      <Input
                        type="number"
                        placeholder="0"
                        disabled={status !== "draft"}
                        defaultValue={!isNew ? "1" : ""}
                        style={{ height: "36px", background: "transparent" }}
                      />
                    </td>
                    <td className="p-2 align-top">
                      <Input
                        placeholder="db, m..."
                        disabled={status !== "draft"}
                        defaultValue={!isNew ? "db" : ""}
                        style={{ height: "36px", background: "transparent" }}
                      />
                    </td>
                    <td className="p-2 text-center align-middle">
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
          </div>
        </Card>

        {/* Signatures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="p-8 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2 flex items-center gap-2">
              <FileSignature size={16} /> Technikus Aláírása
            </h3>
            <Input
              label="Technikus neve *"
              required
              disabled={status !== "draft"}
              defaultValue="Kovács János"
            />
            <div className="h-32 bg-[var(--color-bg-primary)] border border-dashed border-[var(--color-border-default)] rounded-md flex items-center justify-center text-[var(--color-text-muted)]">
              Aláírás pad helye
            </div>
          </Card>

          <Card className="p-8 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2 flex items-center gap-2">
              <FileSignature size={16} /> Ügyfél Aláírása
            </h3>
            <Input
              label="Ügyfél neve (opcionális)"
              disabled={status !== "draft"}
              defaultValue={!isNew ? "Nagy Péter" : ""}
            />
            <div className="h-32 bg-[var(--color-bg-primary)] border border-dashed border-[var(--color-border-default)] rounded-md flex items-center justify-center text-[var(--color-text-muted)]">
              Aláírás pad helye
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
