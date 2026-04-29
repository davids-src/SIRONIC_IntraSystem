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
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="Beállítások"
        subtitle="Konfigurálható listák a rugalmas, operátor-vezérelt működéshez"
      />

      {/* Email notifications link */}
      <Link
        href="/settings/email-notifications"
        style={{ display: "block", textDecoration: "none" }}
      >
        <Card
          className="p-5"
          style={{ cursor: "pointer", transition: "box-shadow 0.2s" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  backgroundColor: "var(--accent-badge-bg, #3b0a0a)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Mail size={20} style={{ color: "var(--accent-primary, #e53935)" }} />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  E-mail értesítések
                </h2>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                    margin: "2px 0 0 0",
                  }}
                >
                  Automatikus e-mail értesítések kezelése modulonként
                </p>
              </div>
            </div>
            <ChevronRight size={20} style={{ color: "var(--text-muted)" }} />
          </div>
        </Card>
      </Link>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
        }}
      >
        {configurableLists.map((list) => (
          <Card
            key={list.key}
            className="p-6"
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {list.label_hu}
                </h2>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                    margin: "4px 0 0 0",
                  }}
                >
                  {list.description}
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button variant="secondary" style={{ height: "36px" }}>
                  <Plus size={16} style={{ marginRight: "8px" }} />
                  Új
                </Button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  color: "var(--text-muted)",
                }}
              >
                Példák
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {list.examples.map((ex) => (
                  <span
                    key={ex}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "0.875rem",
                    }}
                  >
                    {ex}
                  </span>
                ))}
              </div>
            </div>

            <div
              style={{ paddingTop: "8px", borderTop: "1px solid var(--border-subtle)" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    color: "var(--text-muted)",
                  }}
                >
                  Műveletek
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {list.operations.includes("add") && <Plus size={16} />}
                  {list.operations.includes("rename") && <Pencil size={16} />}
                  {list.operations.includes("delete") && <Trash2 size={16} />}
                  {list.operations.includes("reorder") && <ArrowUpDown size={16} />}
                </div>
              </div>
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-muted)",
                  marginTop: "8px",
                }}
              >
                (UI demo) A tényleges szerkesztés itt majd API/DB-val kerül be.
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
