"use client";

import { Card, Button, Badge, PageHeader } from "@crm/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Copy, Info } from "lucide-react";

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

const AVAILABLE_VARIABLES = [
  { name: "{{contact_name}}", desc: "Kontakt cég / személy neve" },
  { name: "{{contact_address}}", desc: "Teljes cím" },
  { name: "{{contact_tax_number}}", desc: "Adószám" },
  { name: "{{contact_person_name}}", desc: "Elsődleges kapcsolattartó neve" },
  { name: "{{contact_email}}", desc: "E-mail cím" },
  { name: "{{contact_phone}}", desc: "Telefonszám" },
  { name: "{{project_name}}", desc: "Kapcsolódó projekt neve" },
  { name: "{{project_start_date}}", desc: "Projekt kezdete" },
  { name: "{{project_deadline}}", desc: "Projekt határideje" },
  { name: "{{site_address}}", desc: "Munkavégzés helyszíne (manuális)" },
  { name: "{{work_description}}", desc: "Munkavégzés leírása (manuális)" },
  { name: "{{contract_date}}", desc: "Mai dátum (auto)" },
  { name: "{{valid_from}}", desc: "Érvényesség kezdete" },
  { name: "{{valid_until}}", desc: "Érvényesség vége" },
  { name: "{{technician_name}}", desc: "Felelős technikus neve" },
  { name: "{{company_name}}", desc: "SIRONIC Kft." },
  { name: "{{company_address}}", desc: "SIRONIC cím" },
  { name: "{{company_tax_number}}", desc: "SIRONIC adószám" },
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

export default function NewContractTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [requiresSignature, setRequiresSignature] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [showVarRef, setShowVarRef] = useState(false);

  // Detect variables used in body
  const detectedVars = Array.from(body.matchAll(/\{\{(\w+)\}\}/g)).map((m) => m[1]);
  const uniqueVars = [...new Set(detectedVars)];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="Új szerződéssablon"
        subtitle="Változókat a {{variable_name}} szintaxissal adhatsz hozzá"
        actions={
          <Button variant="secondary" onClick={() => router.push("/contracts/templates")}>
            <ArrowLeft size={16} style={{ marginRight: "8px" }} />
            Vissza
          </Button>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Left column: editor */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <Card className="p-6">
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={labelStyle}>Sablon neve *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={fieldStyle}
                  placeholder="Pl. Karbantartási szerz. alap"
                />
              </div>
              <div>
                <label style={labelStyle}>Kategória</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={fieldStyle}
                >
                  <option value="">-- Kategória --</option>
                  {CONTRACT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Leírás</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  style={{ ...fieldStyle, resize: "vertical" }}
                  placeholder="Rövid leírás a sablon céljáról…"
                />
              </div>
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <label style={{ ...labelStyle, margin: 0 }}>Sablon tartalma *</label>
                  <button
                    onClick={() => setShowVarRef(!showVarRef)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--accent-primary, #e53935)",
                      fontSize: "0.8rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Info size={14} />
                    {showVarRef ? "Változók elrejtése" : "Elérhető változók"}
                  </button>
                </div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={18}
                  style={{
                    ...fieldStyle,
                    fontFamily: "monospace",
                    resize: "vertical",
                    lineHeight: 1.7,
                  }}
                  placeholder={`Írd be a szerződés szövegét.\nHasználj {{variable_name}} szintaxist a változókhoz.\n\nPl.:\nEzen szerz\u0151d\u00e9s l\u00e9trej\u00f6tt a {{company_name}} \u00e9s {{contact_name}} k\u00f6z\u00f6tt.\nKelt: {{contract_date}}`}
                />
                {showVarRef && (
                  <div
                    style={{
                      marginTop: "12px",
                      border: "1px solid var(--border-subtle, #2a2a2a)",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "var(--bg-secondary, #1a1a1a)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "var(--text-muted, #888)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Elérhető változók
                    </div>
                    <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                      {AVAILABLE_VARIABLES.map((v) => (
                        <div
                          key={v.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 14px",
                            borderBottom: "1px solid var(--border-subtle, #1a1a1a)",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            const newBody = body + v.name;
                            setBody(newBody);
                          }}
                          title="Kattintásra beillesztés"
                        >
                          <code
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--accent-primary, #e53935)",
                            }}
                          >
                            {v.name}
                          </code>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted, #888)",
                            }}
                          >
                            {v.desc}
                          </span>
                          <Copy
                            size={12}
                            style={{ color: "var(--text-muted, #666)", flexShrink: 0 }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <Button
              variant="secondary"
              onClick={() => router.push("/contracts/templates")}
            >
              Mégse
            </Button>
            <Button variant="primary">Sablon mentése</Button>
          </div>
        </div>

        {/* Right column: settings + detected variables */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Card className="p-5">
            <h3
              style={{
                fontSize: "0.875rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text-muted, #888)",
                margin: "0 0 16px 0",
              }}
            >
              Beállítások
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  color: "var(--text-secondary, #ccc)",
                }}
              >
                <input
                  type="checkbox"
                  checked={requiresSignature}
                  onChange={(e) => setRequiresSignature(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>Digitális aláírás szükséges</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted, #888)" }}>
                    Partner portálon aláírható
                  </div>
                </div>
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  color: "var(--text-secondary, #ccc)",
                }}
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>Aktív sablon</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted, #888)" }}>
                    Megjelenik az új szerz. létrehozásánál
                  </div>
                </div>
              </label>
            </div>
          </Card>

          <Card className="p-5">
            <h3
              style={{
                fontSize: "0.875rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text-muted, #888)",
                margin: "0 0 12px 0",
              }}
            >
              Felismert változók
            </h3>
            {uniqueVars.length === 0 ? (
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted, #888)" }}>
                Még nincs változó a tartalomban.
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {uniqueVars.map((v) => (
                  <code
                    key={v}
                    style={{
                      fontSize: "0.75rem",
                      background: "var(--accent-badge-bg, #3b0a0a)",
                      color: "var(--accent-primary, #e53935)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    {`{{${v}}}`}
                  </code>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
