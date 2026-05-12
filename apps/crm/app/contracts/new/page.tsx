"use client";

import { Card, Button, Badge, PageHeader } from "@crm/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileText, Upload, ArrowLeft, ArrowRight, Check } from "lucide-react";

// ─── Mock data ────────────────────────────────────────────────────────────────
const mockTemplates = [
  {
    _id: "tmpl1",
    name: "Karbantartási szerződés alap",
    category: "Karbantartási szerződés",
  },
  { _id: "tmpl2", name: "Megbízási szerződés standard", category: "Megbízási szerződés" },
  {
    _id: "tmpl3",
    name: "NDA sablon (magyar)",
    category: "Titoktartási nyilatkozat (NDA)",
  },
];

const mockContacts = [
  { _id: "org1", name: "Acme Kft." },
  { _id: "org2", name: "GlobalTech Zrt." },
  { _id: "org3", name: "MegaCorp Kft." },
];

const CONTRACT_CATEGORIES = [
  "Megbízási szerződés",
  "Vagyonvédelmi szerződés",
  "Karbantartási szerződés",
  "Vállalkozási szerződés",
  "Titoktartási nyilatkozat (NDA)",
  "Adatfeldolgozási szerződés (GDPR)",
  "Keretszerződés",
  "Egyéb",
];

const fieldStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "6px",
  border: "1px solid var(--border-subtle, #2a2a2a)",
  background: "var(--bg-secondary, #141414)",
  color: "var(--text-primary, #fff)",
  fontSize: "0.875rem",
  boxSizing: "border-box" as const,
};

const labelStyle = {
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "var(--text-muted, #888)",
  marginBottom: "6px",
  display: "block",
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewContractPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [contractType, setContractType] = useState<"generated" | "uploaded" | null>(null);

  // Step 2a – from template
  const [templateId, setTemplateId] = useState("");
  const [contractName, setContractName] = useState("");
  const [contactId, setContactId] = useState("");
  const [category, setCategory] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [indefinite, setIndefinite] = useState(false);
  const [signingType, setSigningType] = useState<"digital" | "paper" | "none">("digital");
  const [portalVisible, setPortalVisible] = useState(true);

  // Step 2b – upload
  const [uploadName, setUploadName] = useState("");
  const [uploadContactId, setUploadContactId] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadSigningType, setUploadSigningType] = useState<
    "paper" | "digital" | "none"
  >("paper");

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const tmpl = mockTemplates.find((t) => t._id === id);
    if (tmpl) {
      if (!contractName) setContractName(tmpl.name);
      if (!category) setCategory(tmpl.category);
    }
  };

  const handleStep1Select = (type: "generated" | "uploaded") => {
    setContractType(type);
    setStep(2);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="Új szerződés"
        subtitle={
          step === 1
            ? "Válassz szerződés típust"
            : contractType === "generated"
              ? "Sablon alapú szerződés"
              : "Külső fájl feltöltése"
        }
        actions={
          <Button
            variant="secondary"
            onClick={() => (step === 2 ? setStep(1) : router.back())}
          >
            <ArrowLeft size={16} style={{ marginRight: "8px" }} />
            Vissza
          </Button>
        }
      />

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {[1, 2].map((s) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                background:
                  step === s
                    ? "var(--accent-primary, #e53935)"
                    : step > s
                      ? "var(--status-success, #22c55e)"
                      : "var(--bg-secondary, #222)",
                color: "#fff",
              }}
            >
              {step > s ? <Check size={14} /> : s}
            </div>
            <span
              style={{
                fontSize: "0.875rem",
                color:
                  step === s ? "var(--text-primary, #fff)" : "var(--text-muted, #888)",
                fontWeight: step === s ? 600 : 400,
              }}
            >
              {s === 1 ? "Típus kiválasztása" : "Adatok megadása"}
            </span>
            {s < 2 && (
              <div
                style={{
                  width: "40px",
                  height: "2px",
                  background: "var(--border-subtle, #2a2a2a)",
                  margin: "0 4px",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Type selection */}
      {step === 1 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
          }}
        >
          <Card
            className="p-8"
            style={{
              cursor: "pointer",
              transition: "all 0.2s",
              border: "2px solid transparent",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--accent-primary, #e53935)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
            onClick={() => handleStep1Select("generated")}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "var(--accent-badge-bg, #3b0a0a)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-primary, #e53935)",
                }}
              >
                <FileText size={24} />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    color: "var(--text-primary, #fff)",
                    margin: "0 0 8px 0",
                  }}
                >
                  Generálás sablonból
                </h2>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-muted, #888)",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  Tölts ki egy sablont a CRM-ben. A változók automatikusan kitölthetők a
                  kontakt adataiból, majd PDF generálódik.
                </p>
              </div>
              <Button variant="primary" style={{ marginTop: "8px" }}>
                Sablon kiválasztása <ArrowRight size={16} style={{ marginLeft: "8px" }} />
              </Button>
            </div>
          </Card>

          <Card
            className="p-8"
            style={{
              cursor: "pointer",
              transition: "all 0.2s",
              border: "2px solid transparent",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-default, #444)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
            onClick={() => handleStep1Select("uploaded")}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "var(--bg-secondary, #1a1a1a)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-secondary, #aaa)",
                }}
              >
                <Upload size={24} />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    color: "var(--text-primary, #fff)",
                    margin: "0 0 8px 0",
                  }}
                >
                  Külső fájl feltöltése
                </h2>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-muted, #888)",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  Külsőleg elkészített szerződés PDF feltöltése és rögzítése a CRM-ben.
                </p>
              </div>
              <Button variant="secondary" style={{ marginTop: "8px" }}>
                PDF feltöltése <ArrowRight size={16} style={{ marginLeft: "8px" }} />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Step 2a: From template */}
      {step === 2 && contractType === "generated" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Header fields */}
          <Card className="p-6">
            <h3
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                color: "var(--text-muted, #888)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "0 0 20px 0",
              }}
            >
              Alapadatok
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "20px",
              }}
            >
              <div>
                <label style={labelStyle}>Sablon *</label>
                <select
                  value={templateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  style={fieldStyle}
                >
                  <option value="">-- Sablon kiválasztása --</option>
                  {mockTemplates.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Megnevezés *</label>
                <input
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                  style={fieldStyle}
                  placeholder="Szerződés neve"
                />
              </div>
              <div>
                <label style={labelStyle}>Kontakt *</label>
                <select
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  style={fieldStyle}
                >
                  <option value="">-- Kontakt kiválasztása --</option>
                  {mockContacts.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Kategória</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={fieldStyle}
                >
                  <option value="">-- Kategória --</option>
                  {CONTRACT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Érvényesség kezdete</label>
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Érvényesség vége</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    style={fieldStyle}
                    disabled={indefinite}
                  />
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "0.875rem",
                      color: "var(--text-muted, #888)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={indefinite}
                      onChange={(e) => setIndefinite(e.target.checked)}
                    />
                    Határozatlan idejű
                  </label>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Aláírás módja</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[
                    { value: "digital", label: "Digitális (portálon)" },
                    { value: "paper", label: "Papír alapú" },
                    { value: "none", label: "Csak tárolás" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "0.875rem",
                        color: "var(--text-secondary, #ccc)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="signing_type"
                        value={opt.value}
                        checked={signingType === opt.value}
                        onChange={() => setSigningType(opt.value as any)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Portálon látható</label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "0.875rem",
                    color: "var(--text-secondary, #ccc)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={portalVisible}
                    onChange={(e) => setPortalVisible(e.target.checked)}
                  />
                  Partner láthatja a portálon
                </label>
              </div>
            </div>
          </Card>

          {/* Variable filling placeholder */}
          <Card className="p-6">
            <h3
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                color: "var(--text-muted, #888)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "0 0 16px 0",
              }}
            >
              Változók kitöltése
            </h3>
            {!templateId ? (
              <p style={{ color: "var(--text-muted, #888)", fontSize: "0.875rem" }}>
                Válassz sablont a változók megjelenítéséhez.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: "16px",
                }}
              >
                {["site_address", "work_description", "technician_name"].map(
                  (varName) => (
                    <div key={varName}>
                      <label
                        style={{ ...labelStyle, color: "var(--status-warning, #f59e0b)" }}
                      >
                        {`{{${varName}}}`} *
                      </label>
                      <input style={fieldStyle} placeholder={`${varName} értéke…`} />
                    </div>
                  ),
                )}
                <div>
                  <label
                    style={{ ...labelStyle, color: "var(--status-success, #22c55e)" }}
                  >
                    {`{{contact_name}}`} ✓
                  </label>
                  <input
                    style={{ ...fieldStyle, opacity: 0.6 }}
                    value={mockContacts.find((c) => c._id === contactId)?.name ?? ""}
                    readOnly
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setStep(1)}>
              Vissza
            </Button>
            <Button variant="secondary">Mentés vázlatként</Button>
            {signingType !== "none" && (
              <Button variant="primary">Generálás és küldés partnernek</Button>
            )}
          </div>
        </div>
      )}

      {/* Step 2b: Upload */}
      {step === 2 && contractType === "uploaded" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <Card className="p-6">
            <h3
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                color: "var(--text-muted, #888)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "0 0 20px 0",
              }}
            >
              Feltöltési adatok
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "20px",
              }}
            >
              <div>
                <label style={labelStyle}>Megnevezés *</label>
                <input
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  style={fieldStyle}
                  placeholder="Szerződés neve"
                />
              </div>
              <div>
                <label style={labelStyle}>Kontakt *</label>
                <select
                  value={uploadContactId}
                  onChange={(e) => setUploadContactId(e.target.value)}
                  style={fieldStyle}
                >
                  <option value="">-- Kontakt kiválasztása --</option>
                  {mockContacts.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Kategória</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  style={fieldStyle}
                >
                  <option value="">-- Kategória --</option>
                  {CONTRACT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Aláírás módja</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[
                    { value: "paper", label: "Már aláírva (papír)" },
                    { value: "digital", label: "Digitálisan aláíratandó" },
                    { value: "none", label: "Csak tárolás" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "0.875rem",
                        color: "var(--text-secondary, #ccc)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="upload_signing"
                        value={opt.value}
                        checked={uploadSigningType === opt.value}
                        onChange={() => setUploadSigningType(opt.value as any)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                color: "var(--text-muted, #888)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "0 0 16px 0",
              }}
            >
              Szerződés PDF *
            </h3>
            <div
              style={{
                border: "2px dashed var(--border-subtle, #2a2a2a)",
                borderRadius: "12px",
                padding: "48px 24px",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "var(--accent-primary, #e53935)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "var(--border-subtle, #2a2a2a)")
              }
            >
              <Upload
                size={40}
                style={{ color: "var(--text-muted, #888)", marginBottom: "12px" }}
              />
              <p
                style={{
                  color: "var(--text-primary, #fff)",
                  fontWeight: 600,
                  margin: "0 0 4px 0",
                }}
              >
                Húzd ide a PDF fájlt, vagy kattints a feltöltéshez
              </p>
              <p
                style={{
                  color: "var(--text-muted, #888)",
                  fontSize: "0.875rem",
                  margin: 0,
                }}
              >
                Maximum 20 MB, PDF formátum
              </p>
            </div>
          </Card>

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setStep(1)}>
              Vissza
            </Button>
            <Button variant="primary">Feltöltés és mentés</Button>
          </div>
        </div>
      )}
    </div>
  );
}
