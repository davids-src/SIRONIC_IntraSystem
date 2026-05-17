"use client";

import { Card, PageHeader, Button, Badge } from "@crm/ui";
import {
  Plus,
  ArrowUpDown,
  Pencil,
  Trash2,
  Mail,
  ChevronRight,
  FileSignature,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Settings, CompanyDetails } from "@crm/types";
import { apiJsonBody } from "@/lib/api-client";

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
    key: "contract_categories",
    label_hu: "Szerződés kategóriák",
    description: "Szerződéstípusok a Contract modulhoz.",
    examples: [
      "Megbízási szerződés",
      "Vagyonvédelmi szerződés",
      "Karbantartási szerződés",
      "Titoktartási nyilatkozat (NDA)",
      "Keretszerződés",
    ],
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
  const [settings, setSettings] = useState<Partial<Settings>>({});

  useEffect(() => {
    void fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d === "object") {
          setSettings(d as Settings);
          setCompanyData(
            (d as Settings).company_details || {
              name: null,
              headquarters: null,
              tax_number: null,
              registration_number: null,
              email: null,
              phone: null,
              bank_account: null,
              iban: null,
              website: null,
            },
          );
        }
      });
  }, []);

  const [companyData, setCompanyData] = useState<CompanyDetails>({
    name: null,
    headquarters: null,
    tax_number: null,
    registration_number: null,
    email: null,
    phone: null,
    bank_account: null,
    iban: null,
    website: null,
  });
  const [editingCompany, setEditingCompany] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);

  const saveCompanyDetails = async () => {
    setSavingCompany(true);
    try {
      await apiJsonBody("/api/settings", "PATCH", { company_details: companyData });
      setEditingCompany(false);
    } catch (e) {
      console.error(e);
      alert("Hiba történt a mentés során.");
    } finally {
      setSavingCompany(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="Beállítások"
        subtitle="Konfigurálható listák a rugalmas, operátor-vezérelt működéshez és cégadatok"
      />

      {/* Szolgáltatói adatok */}
      <Card className="p-6">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
            Saját Cégadatok (Szolgáltató)
          </h2>
          {!editingCompany ? (
            <Button variant="secondary" onClick={() => setEditingCompany(true)}>
              Szerkesztés
            </Button>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                variant="secondary"
                onClick={() => setEditingCompany(false)}
                disabled={savingCompany}
              >
                Mégse
              </Button>
              <Button
                variant="primary"
                onClick={() => void saveCompanyDetails()}
                disabled={savingCompany}
              >
                {savingCompany ? "Mentés..." : "Mentés"}
              </Button>
            </div>
          )}
        </div>

        {editingCompany ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>Cégnév</label>
              <input
                className="input-base"
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-input)",
                }}
                value={companyData.name || ""}
                onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                placeholder="Pl. SIROTECH Kft."
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>Székhely</label>
              <input
                className="input-base"
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-input)",
                }}
                value={companyData.headquarters || ""}
                onChange={(e) =>
                  setCompanyData({ ...companyData, headquarters: e.target.value })
                }
                placeholder="Pl. 1011 Budapest, Fő utca 1."
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>Adószám</label>
              <input
                className="input-base"
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-input)",
                }}
                value={companyData.tax_number || ""}
                onChange={(e) =>
                  setCompanyData({ ...companyData, tax_number: e.target.value })
                }
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                Cégjegyzékszám
              </label>
              <input
                className="input-base"
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-input)",
                }}
                value={companyData.registration_number || ""}
                onChange={(e) =>
                  setCompanyData({ ...companyData, registration_number: e.target.value })
                }
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>E-mail cím</label>
              <input
                className="input-base"
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-input)",
                }}
                value={companyData.email || ""}
                onChange={(e) =>
                  setCompanyData({ ...companyData, email: e.target.value })
                }
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>Telefonszám</label>
              <input
                className="input-base"
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-input)",
                }}
                value={companyData.phone || ""}
                onChange={(e) =>
                  setCompanyData({ ...companyData, phone: e.target.value })
                }
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                Bankszámlaszám
              </label>
              <input
                className="input-base"
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-input)",
                }}
                value={companyData.bank_account || ""}
                onChange={(e) =>
                  setCompanyData({ ...companyData, bank_account: e.target.value })
                }
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>Weboldal</label>
              <input
                className="input-base"
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-input)",
                }}
                value={companyData.website || ""}
                onChange={(e) =>
                  setCompanyData({ ...companyData, website: e.target.value })
                }
              />
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              fontSize: "0.875rem",
            }}
          >
            <div>
              <span style={{ color: "var(--text-muted)", marginRight: "8px" }}>
                Cégnév:
              </span>{" "}
              {companyData.name || "Nincs megadva"}
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", marginRight: "8px" }}>
                Székhely:
              </span>{" "}
              {companyData.headquarters || "Nincs megadva"}
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", marginRight: "8px" }}>
                Adószám:
              </span>{" "}
              {companyData.tax_number || "Nincs megadva"}
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", marginRight: "8px" }}>
                Cégj. szám:
              </span>{" "}
              {companyData.registration_number || "Nincs megadva"}
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", marginRight: "8px" }}>
                E-mail:
              </span>{" "}
              {companyData.email || "Nincs megadva"}
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", marginRight: "8px" }}>
                Telefon:
              </span>{" "}
              {companyData.phone || "Nincs megadva"}
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", marginRight: "8px" }}>
                Bankszámlaszám:
              </span>{" "}
              {companyData.bank_account || "Nincs megadva"}
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", marginRight: "8px" }}>
                Weboldal:
              </span>{" "}
              {companyData.website || "Nincs megadva"}
            </div>
          </div>
        )}
      </Card>

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

      {/* Contract Templates link */}
      <Link
        href="/contracts/templates"
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
                <FileSignature
                  size={20}
                  style={{ color: "var(--accent-primary, #e53935)" }}
                />
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
                  Szerződés sablonok
                </h2>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                    margin: "2px 0 0 0",
                  }}
                >
                  Szerződéssablonok kezelése változókkal
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
                {((settings[list.key as keyof Settings] as string[] | undefined)?.length
                  ? (settings[list.key as keyof Settings] as string[])
                  : list.examples
                ).map((ex) => (
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

      {/* Árlista Kategóriák szerkesztő */}
      <Card className="p-6">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "16px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
              Árlista Kategóriák (és Cikkszám előtagok)
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--color-text-muted)",
                margin: "4px 0 0 0",
              }}
            >
              Az árlista tételek rendszerezése. A beállított előtag (prefix) és a sorszám
              adja ki a generált cikkszámot (pl. HW000001).
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              const name = prompt("Új kategória neve:");
              if (!name) return;
              const prefix = prompt("Előtag (pl. HW, SW, IT):");
              if (!prefix) return;
              const newCat = {
                id: crypto.randomUUID(),
                name,
                prefix: prefix.toUpperCase(),
              };
              const newCategories = [...(settings.item_categories || []), newCat];
              setSettings({ ...settings, item_categories: newCategories });
              apiJsonBody("/api/settings", "PATCH", {
                item_categories: newCategories,
              }).catch((e) => console.error(e));
            }}
          >
            <Plus size={16} style={{ marginRight: "6px" }} />
            Új Kategória
          </Button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {(settings.item_categories || []).length === 0 ? (
            <div
              style={{
                fontSize: "0.875rem",
                color: "var(--color-text-muted)",
                fontStyle: "italic",
              }}
            >
              Nincsenek kategóriák rögzítve.
            </div>
          ) : (
            (settings.item_categories || []).map((cat) => (
              <div
                key={cat.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: "6px",
                }}
              >
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>{cat.name}</span>
                  <Badge
                    variant="default"
                    style={{ fontFamily: "monospace", letterSpacing: "1px" }}
                  >
                    {cat.prefix}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (!confirm("Biztosan törlöd ezt a kategóriát?")) return;
                    const newCategories = (settings.item_categories || []).filter(
                      (c) => c.id !== cat.id,
                    );
                    setSettings({ ...settings, item_categories: newCategories });
                    apiJsonBody("/api/settings", "PATCH", {
                      item_categories: newCategories,
                    }).catch((e) => console.error(e));
                  }}
                >
                  <Trash2 size={16} color="var(--color-danger)" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
