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
  Plug,
  Container,
  Package,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState, useRef } from "react";
import type { Settings, CompanyDetails } from "@crm/types";
import { apiJsonBody } from "@/lib/api-client";
import { Upload, Image as ImageIcon } from "lucide-react";

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

function SettingsLinkCard({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link href={href} style={{ display: "block", textDecoration: "none" }}>
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
                color: "var(--accent-primary, #e53935)",
              }}
            >
              {icon}
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
                {title}
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-muted)",
                  margin: "2px 0 0 0",
                }}
              >
                {subtitle}
              </p>
            </div>
          </div>
          <ChevronRight size={20} style={{ color: "var(--text-muted)" }} />
        </div>
      </Card>
    </Link>
  );
}

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
              logo_url: null,
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
    logo_url: null,
  });
  const [editingCompany, setEditingCompany] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Csak képfájlt lehet feltölteni (PNG, JPG, SVG, WebP)!");
      return;
    }

    setLogoUploading(true);

    if (file.type === "image/svg+xml") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCompanyData((prev) => ({ ...prev, logo_url: result }));
        setLogoUploading(false);
      };
      reader.onerror = () => setLogoUploading(false);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const format = file.type === "image/png" ? "image/png" : "image/jpeg";
          const resizedDataUrl = canvas.toDataURL(format, 0.9);
          setCompanyData((prev) => ({ ...prev, logo_url: resizedDataUrl }));
        }
        setLogoUploading(false);
      };
      img.onerror = () => setLogoUploading(false);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => setLogoUploading(false);
    reader.readAsDataURL(file);
  };

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

        {/* Céglogó szekció */}
        <div
          style={{
            padding: "16px",
            borderRadius: "8px",
            backgroundColor: "var(--bg-subtle, rgba(0, 0, 0, 0.02))",
            border: "1px solid var(--border-subtle, #e2e8f0)",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "160px",
                height: "64px",
                borderRadius: "8px",
                border: "1px dashed var(--border-subtle, #cbd5e1)",
                backgroundColor: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                padding: "6px",
                flexShrink: 0,
              }}
            >
              {companyData.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={companyData.logo_url}
                  alt="Céglogó"
                  style={{
                    maxHeight: "52px",
                    maxWidth: "148px",
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    color: "var(--text-muted, #94a3b8)",
                  }}
                >
                  <ImageIcon size={20} />
                  <span style={{ fontSize: "11px", fontWeight: 500 }}>Nincs logó</span>
                </div>
              )}
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                Hivatalos céglogó
                {companyData.logo_url && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#16a34a",
                      backgroundColor: "#dcfce7",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontWeight: 600,
                    }}
                  >
                    Aktív a PDF bizonylatokon
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-muted)",
                  marginTop: "3px",
                  maxWidth: "520px",
                  lineHeight: 1.4,
                }}
              >
                A feltöltött logó automatikusan beillesztésre és méretre igazításra kerül
                az árajánlatok, munkalapok és bizonylatok fejlécében.
              </div>
            </div>
          </div>

          {editingCompany ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoFileChange}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={logoUploading || savingCompany}
              >
                <Upload size={14} style={{ marginRight: "6px" }} />
                {companyData.logo_url ? "Logó cseréje" : "Logó feltöltése"}
              </Button>
              {companyData.logo_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  style={{ color: "#ef4444" }}
                  onClick={() => setCompanyData({ ...companyData, logo_url: null })}
                  disabled={logoUploading || savingCompany}
                >
                  <Trash2 size={14} style={{ marginRight: "6px" }} />
                  Törlés
                </Button>
              )}
            </div>
          ) : null}
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

      {/* Pricing Settings link */}
      <Link href="/settings/pricing" style={{ display: "block", textDecoration: "none" }}>
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
                {/* Using a simple custom SVG path or a generic icon from lucide-react if imported */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent-primary, #e53935)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                  <line x1="8" y1="10" x2="16" y2="10"></line>
                  <line x1="8" y1="14" x2="16" y2="14"></line>
                  <line x1="8" y1="18" x2="16" y2="18"></line>
                </svg>
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
                  Árképzési Beállítások
                </h2>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                    margin: "2px 0 0 0",
                  }}
                >
                  Szorzók, óradíjak és overhead kezelése
                </p>
              </div>
            </div>
            <ChevronRight size={20} style={{ color: "var(--text-muted)" }} />
          </div>
        </Card>
      </Link>

      <SettingsLinkCard
        href="/settings/integrations"
        icon={<Plug size={20} />}
        title="Integrációk"
        subtitle="Cloudflare, Nginx Proxy Manager, Portainer, GitHub kapcsolatok"
      />
      <SettingsLinkCard
        href="/settings/stack-templates"
        icon={<Container size={20} />}
        title="Stack sablonok"
        subtitle="Docker Compose sablonok a deployment stackekhez"
      />
      <SettingsLinkCard
        href="/settings/deployment-packages"
        icon={<Package size={20} />}
        title="Deployment csomagok"
        subtitle="Billable csomagok (erőforrás, ár, ciklus) a deploymentekhez"
      />

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
                <Button
                  variant="secondary"
                  style={{ height: "36px" }}
                  onClick={() => {
                    const newItem = prompt(`Új érték a(z) ${list.label_hu} listába:`);
                    if (!newItem?.trim()) return;
                    const val = newItem.trim();
                    const arr = (settings[list.key as keyof Settings] as string[]) || [];
                    if (arr.includes(val)) {
                      alert("Ez az érték már szerepel a listában.");
                      return;
                    }
                    const updated = [...arr, val];
                    setSettings({ ...settings, [list.key]: updated });
                    apiJsonBody("/api/settings", "PATCH", {
                      [list.key]: updated,
                    }).catch((e) => console.error(e));
                  }}
                >
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
                Jelenlegi értékek
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {((settings[list.key as keyof Settings] as string[] | undefined)?.length
                  ? (settings[list.key as keyof Settings] as string[])
                  : []
                ).map((ex) => (
                  <div
                    key={ex}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 8px 4px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-secondary)",
                      fontSize: "0.875rem",
                    }}
                  >
                    <span>{ex}</span>
                    {list.operations.includes("rename") && (
                      <button
                        onClick={() => {
                          const val = prompt("Új név:", ex);
                          if (!val?.trim() || val.trim() === ex) return;
                          const arr =
                            (settings[list.key as keyof Settings] as string[]) || [];
                          const updated = arr.map((item) =>
                            item === ex ? val.trim() : item,
                          );
                          setSettings({ ...settings, [list.key]: updated });
                          apiJsonBody("/api/settings", "PATCH", {
                            [list.key]: updated,
                          }).catch((e) => console.error(e));
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          padding: "4px",
                        }}
                        title="Szerkesztés"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    {list.operations.includes("delete") && (
                      <button
                        onClick={() => {
                          if (!confirm(`Biztosan törlöd: ${ex}?`)) return;
                          const arr =
                            (settings[list.key as keyof Settings] as string[]) || [];
                          const updated = arr.filter((item) => item !== ex);
                          setSettings({ ...settings, [list.key]: updated });
                          apiJsonBody("/api/settings", "PATCH", {
                            [list.key]: updated,
                          }).catch((e) => console.error(e));
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--color-danger, #e53935)",
                          cursor: "pointer",
                          padding: "4px",
                        }}
                        title="Törlés"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {(!settings[list.key as keyof Settings] ||
                  (settings[list.key as keyof Settings] as string[]).length === 0) && (
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontStyle: "italic",
                      fontSize: "0.875rem",
                    }}
                  >
                    Üres lista (Példák: {list.examples.join(", ")})
                  </span>
                )}
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

      {/* Jótállási jegy – jogi tájékoztató tájékoztató */}
      <Card className="p-6">
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
            Jótállási jegy – Jogi tájékoztató szövege
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
              margin: "4px 0 0 0",
            }}
          >
            A jogi szöveg automatikusan kerül kiválasztásra a partner típusa alapján.
            Kódmódosítás nélkül nem szerkeszthető.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid var(--color-border-subtle)",
              background: "var(--color-bg-secondary)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "6px",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "#3b82f6",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "13px",
                }}
              >
                A
              </span>
              <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                Magánszemélynek (fogyasztónak) történő értékesítés
              </span>
            </div>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--color-text-muted)",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Kötelező jótállás – a 151/2003. (IX. 22.) Korm. rendelet és a Ptk. alapján.
              Akkor kerül alkalmazásra, ha a partner típusa <strong>Magánszemély</strong>.
            </p>
          </div>
          <div
            style={{
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid var(--color-border-subtle)",
              background: "var(--color-bg-secondary)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "6px",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "#10b981",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "13px",
                }}
              >
                B
              </span>
              <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                Vállalkozásnak (cégnek) történő értékesítés
              </span>
            </div>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--color-text-muted)",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Önkéntes garancia – a Ptk. diszpozitív szabályai alapján, szerződéses
              megállapodással. Akkor kerül alkalmazásra, ha a partner típusa{" "}
              <strong>Cég</strong> vagy <strong>Egyszeri</strong>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
