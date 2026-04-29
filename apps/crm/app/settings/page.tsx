"use client";

import { Card, PageHeader, Button } from "@crm/ui";
import { Plus, ArrowUpDown, Pencil, Trash2, Mail, ChevronRight } from "lucide-react";
import Link from "next/link";

type Operation = "add" | "rename" | "delete" | "reorder";

const configurableLists: Array<{
  key: string;
  label_hu: string;
  description: string;
  examples: string[];
  operations: Operation[];
}> = [
  {
    key: "ticket_categories",
    label_hu: "Ticket kategóriák",
    description: "Szabad szöveges kategóriák a Ticketekhez (operátor által).",
    examples: ["Hibaelhárítás", "Karbantartás", "Telepítés", "Csere", "Egyéb"],
    operations: ["add", "rename", "delete", "reorder"],
  },
  {
    key: "worklog_categories",
    label_hu: "Munkalap munkakategóriák",
    description: "Szabad szöveges munkakategóriák a Worklogokhoz.",
    examples: ["IT support", "Hálózat", "Biztonságtechnika", "Karbantartás", "Egyéb"],
    operations: ["add", "rename", "delete", "reorder"],
  },
  {
    key: "project_categories",
    label_hu: "Projekt kategóriák",
    description: "Projekt szabad szöveges kategóriák (operátor által).",
    examples: [
      "Hálózatépítés",
      "Webfejlesztés",
      "NIS2 megfelelőség",
      "Biztonságtechnika",
    ],
    operations: ["add", "rename", "delete", "reorder"],
  },
  {
    key: "price_list_categories",
    label_hu: "Árlista kategóriák",
    description: "Árlista tételek kategóriái a Price List modulhoz.",
    examples: ["Munkadíjak", "Kiszállás", "Hardver", "Szoftver", "Csomagok"],
    operations: ["add", "rename", "delete", "reorder"],
  },
  {
    key: "worklog_units",
    label_hu: "Mértékegységek",
    description: "Megengedett egységek a Worklog tételekhez (pl. óra, db, hónap).",
    examples: ["óra", "db", "hónap", "alkalom", "km"],
    operations: ["add", "rename", "delete"],
  },
  {
    key: "contact_tags",
    label_hu: "Kontakt címkék",
    description: "Szabad tagek a Contactokhoz (pl. VIP, NIS2, Web ügyfél).",
    examples: ["VIP", "Szerződéses", "Eseti", "Magánszemély", "NIS2"],
    operations: ["add", "rename", "delete"],
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Beállítások"
        subtitle="Konfigurálható listák a rugalmas, operátor-vezérelt működéshez"
      />

      {/* Email notifications link */}
      <Link href="/settings/email-notifications" className="block">
        <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  backgroundColor: "var(--color-accent-muted, #fef2f2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Mail size={20} style={{ color: "var(--color-accent, #e53935)" }} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                  E-mail értesítések
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                  Automatikus e-mail értesítések kezelése modulonként
                </p>
              </div>
            </div>
            <ChevronRight size={20} className="text-[var(--color-text-muted)]" />
          </div>
        </Card>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {configurableLists.map((list) => (
          <Card key={list.key} className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                  {list.label_hu}
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  {list.description}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="h-9">
                  <Plus size={16} className="mr-2" />
                  Új
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs uppercase font-bold tracking-wider text-[var(--color-text-muted)]">
                Példák
              </div>
              <div className="flex gap-2 flex-wrap">
                {list.examples.map((ex) => (
                  <span
                    key={ex}
                    className="px-3 py-1 rounded-md border border-[var(--color-border-subtle)] text-sm"
                  >
                    {ex}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--color-border-subtle)]">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase font-bold tracking-wider text-[var(--color-text-muted)]">
                  Műveletek
                </div>
                <div className="flex items-center gap-2">
                  {list.operations.includes("add") && <Plus size={16} />}
                  {list.operations.includes("rename") && <Pencil size={16} />}
                  {list.operations.includes("delete") && <Trash2 size={16} />}
                  {list.operations.includes("reorder") && <ArrowUpDown size={16} />}
                </div>
              </div>
              <div className="text-sm text-[var(--color-text-muted)] mt-2">
                (UI demo) A tényleges szerkesztés itt majd API/DB-val kerül be.
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
