"use client";

import {
  Card,
  Button,
  Badge,
  PageHeader,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  CheckboxField,
  InputControl,
} from "@crm/ui";
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
          <Card className="flex flex-col gap-5 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Alapadatok
            </h3>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-contract-template">Sablon *</Label>
                <Select
                  value={templateId || "__empty__"}
                  onValueChange={(v) => handleTemplateChange(v === "__empty__" ? "" : v)}
                >
                  <SelectTrigger id="new-contract-template" className="w-full">
                    <SelectValue placeholder="-- Sablon kiválasztása --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">-- Sablon kiválasztása --</SelectItem>
                    {mockTemplates.map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                label="Megnevezés *"
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                placeholder="Szerződés neve"
              />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-contract-contact">Kontakt *</Label>
                <Select
                  value={contactId || "__empty__"}
                  onValueChange={(v) => setContactId(v === "__empty__" ? "" : v)}
                >
                  <SelectTrigger id="new-contract-contact" className="w-full">
                    <SelectValue placeholder="-- Kontakt kiválasztása --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">-- Kontakt kiválasztása --</SelectItem>
                    {mockContacts.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-contract-category">Kategória</Label>
                <Select
                  value={category || "__empty__"}
                  onValueChange={(v) => setCategory(v === "__empty__" ? "" : v)}
                >
                  <SelectTrigger id="new-contract-category" className="w-full">
                    <SelectValue placeholder="-- Kategória --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">-- Kategória --</SelectItem>
                    {CONTRACT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="date"
                label="Érvényesség kezdete"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-contract-valid-until">Érvényesség vége</Label>
                <Input
                  id="new-contract-valid-until"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  disabled={indefinite}
                />
                <div className="flex flex-row items-center gap-2">
                  <Checkbox
                    id="new-contract-indefinite"
                    checked={indefinite}
                    onCheckedChange={(v) => setIndefinite(v === true)}
                  />
                  <Label
                    htmlFor="new-contract-indefinite"
                    className="cursor-pointer font-normal text-muted-foreground"
                  >
                    Határozatlan idejű
                  </Label>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2 xl:col-span-3">
                <Label htmlFor="new-contract-signing">Aláírás módja</Label>
                <Select
                  value={signingType}
                  onValueChange={(v) => setSigningType(v as "digital" | "paper" | "none")}
                >
                  <SelectTrigger id="new-contract-signing" className="w-full max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="digital">Digitális (portálon)</SelectItem>
                    <SelectItem value="paper">Papír alapú</SelectItem>
                    <SelectItem value="none">Csak tárolás</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <CheckboxField
                  id="new-contract-portal-visible"
                  label="Partner láthatja a portálon"
                  checked={portalVisible}
                  onCheckedChange={(v) => setPortalVisible(v === true)}
                />
              </div>
            </div>
          </Card>

          {/* Variable filling placeholder */}
          <Card className="flex flex-col gap-4 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Változók kitöltése
            </h3>
            {!templateId ? (
              <p className="text-sm text-muted-foreground">
                Válassz sablont a változók megjelenítéséhez.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {["site_address", "work_description", "technician_name"].map(
                  (varName) => (
                    <div key={varName} className="flex flex-col gap-1.5">
                      <Label
                        htmlFor={`var-${varName}`}
                        className="text-xs font-semibold uppercase tracking-wide text-[var(--status-warning)]"
                      >
                        {`{{${varName}}}`} *
                      </Label>
                      <InputControl
                        id={`var-${varName}`}
                        placeholder={`${varName} értéke…`}
                      />
                    </div>
                  ),
                )}
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="var-contact-name"
                    className="text-xs font-semibold uppercase tracking-wide text-[var(--status-success)]"
                  >
                    {`{{contact_name}}`} ✓
                  </Label>
                  <InputControl
                    id="var-contact-name"
                    value={mockContacts.find((c) => c._id === contactId)?.name ?? ""}
                    readOnly
                    className="opacity-60"
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
          <Card className="flex flex-col gap-5 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Feltöltési adatok
            </h3>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <Input
                label="Megnevezés *"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Szerződés neve"
              />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="upload-contact">Kontakt *</Label>
                <Select
                  value={uploadContactId || "__empty__"}
                  onValueChange={(v) => setUploadContactId(v === "__empty__" ? "" : v)}
                >
                  <SelectTrigger id="upload-contact" className="w-full">
                    <SelectValue placeholder="-- Kontakt kiválasztása --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">-- Kontakt kiválasztása --</SelectItem>
                    {mockContacts.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="upload-category">Kategória</Label>
                <Select
                  value={uploadCategory || "__empty__"}
                  onValueChange={(v) => setUploadCategory(v === "__empty__" ? "" : v)}
                >
                  <SelectTrigger id="upload-category" className="w-full">
                    <SelectValue placeholder="-- Kategória --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">-- Kategória --</SelectItem>
                    {CONTRACT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2 xl:col-span-3">
                <Label htmlFor="upload-signing">Aláírás módja</Label>
                <Select
                  value={uploadSigningType}
                  onValueChange={(v) =>
                    setUploadSigningType(v as "paper" | "digital" | "none")
                  }
                >
                  <SelectTrigger id="upload-signing" className="w-full max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paper">Már aláírva (papír)</SelectItem>
                    <SelectItem value="digital">Digitálisan aláíratandó</SelectItem>
                    <SelectItem value="none">Csak tárolás</SelectItem>
                  </SelectContent>
                </Select>
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
