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
import { useEffect, useState, useRef } from "react";
import { FileText, Upload, ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { Contact, ContractTemplate } from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";

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

export default function NewContractPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [contractType, setContractType] = useState<"generated" | "uploaded" | null>(null);

  // Loaded DB data
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2a – from template
  const [templateId, setTemplateId] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [contractName, setContractName] = useState("");
  const [contactId, setContactId] = useState("");
  const [category, setCategory] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [indefinite, setIndefinite] = useState(false);
  const [signingType, setSigningType] = useState<"digital" | "paper" | "none">("digital");
  const [portalVisible, setPortalVisible] = useState(true);
  const [variablesFilled, setVariablesFilled] = useState<Record<string, string>>({});

  // Step 2b – upload
  const [uploadName, setUploadName] = useState("");
  const [uploadContractNumber, setUploadContractNumber] = useState("");
  const [uploadContactId, setUploadContactId] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadSigningType, setUploadSigningType] = useState<
    "paper" | "digital" | "none"
  >("paper");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0] || null);
    }
  };

  useEffect(() => {
    Promise.all([
      apiJson<ContractTemplate[]>("/api/contract-templates"),
      apiJson<Contact[]>("/api/contacts"),
    ])
      .then(([tmpls, conts]) => {
        setTemplates(tmpls.filter((t) => t.is_active));
        setContacts(conts);
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, []);

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const tmpl = templates.find((t) => t._id === id);
    if (tmpl) {
      if (!contractName) setContractName(tmpl.name);
      if (!category) setCategory(tmpl.category);
      // Initialize variables filled
      const initVars: Record<string, string> = {};
      (tmpl.variables ?? []).forEach((v) => {
        initVars[v] = "";
      });
      setVariablesFilled(initVars);
    }
  };

  const handleStep1Select = (type: "generated" | "uploaded") => {
    setContractType(type);
    setStep(2);
  };

  const handleSave = async (status: "draft" | "sent") => {
    setError(null);
    setSaving(true);
    try {
      let payload: Record<string, any> = {};
      if (contractType === "generated") {
        if (!contactId || !contractName || !templateId || !category) {
          setError("Kérlek tölts ki minden kötelező mezőt!");
          setSaving(false);
          return;
        }
        payload = {
          contact_id: contactId,
          type: "generated",
          category,
          name: contractName,
          contract_number: contractNumber || undefined,
          template_id: templateId,
          status,
          variables_filled: variablesFilled,
          signing_type: signingType,
          portal_visible: portalVisible,
          valid_from: validFrom ? new Date(validFrom).toISOString() : null,
          valid_until:
            indefinite || !validUntil ? null : new Date(validUntil).toISOString(),
          // Generate actual HTML body replacing variables
          body: generateHtmlBody(),
        };
      } else {
        if (!uploadContactId || !uploadName || !uploadCategory) {
          setError("Kérlek tölts ki minden kötelező mezőt!");
          setSaving(false);
          return;
        }
        payload = {
          contact_id: uploadContactId,
          type: "uploaded",
          category: uploadCategory,
          name: uploadName,
          contract_number: uploadContractNumber || undefined,
          status: "draft",
          pdf_url: "/uploads/dummy_contract.pdf",
          signing_type: uploadSigningType,
          portal_visible: true,
        };
      }

      const res = await apiJsonBody<{ _id: string }>("/api/contracts", "POST", payload);
      router.push(`/contracts/${res._id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Hiba a mentés során.");
    } finally {
      setSaving(false);
    }
  };

  const generateHtmlBody = () => {
    const tmpl = templates.find((t) => t._id === templateId);
    if (!tmpl) return "";
    let content = tmpl.body;

    // Replace variables
    Object.entries(variablesFilled).forEach(([key, val]) => {
      content = content.replaceAll(`{{${key}}}`, val);
    });

    // Replace system variables
    const contact = contacts.find((c) => c._id === contactId);
    content = content.replaceAll("{{contact_name}}", contact?.name ?? "");

    return content;
  };

  const selectedTemplate = templates.find((t) => t._id === templateId);
  const templateVariables = selectedTemplate?.variables ?? [];

  if (loadingData) {
    return <div className="p-6 text-[var(--color-text-muted)]">Betöltés…</div>;
  }

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
            disabled={saving}
          >
            <ArrowLeft size={16} style={{ marginRight: "8px" }} />
            Vissza
          </Button>
        }
      />

      {error && <div className="text-red-400 p-4 rounded-lg bg-red-950/30">{error}</div>}

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
                    {templates.map((t) => (
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
              <Input
                label="Szerződésszám"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                placeholder="Üresen hagyva automatikus: SZ-..."
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
                    {contacts.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-contract-category">Kategória *</Label>
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

          {/* Variable filling */}
          <Card className="flex flex-col gap-4 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Változók kitöltése
            </h3>
            {templateVariables.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {templateId
                  ? "Ehhez a sablonhoz nincsenek egyedi változók."
                  : "Válassz sablont a változók megjelenítéséhez."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {templateVariables.map((varName) => (
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
                      value={variablesFilled[varName] ?? ""}
                      onChange={(e) =>
                        setVariablesFilled((prev) => ({
                          ...prev,
                          [varName]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
            {templateId && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 pt-4 border-t border-dashed">
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="var-contact-name"
                    className="text-xs font-semibold uppercase tracking-wide text-[var(--status-success)]"
                  >
                    {`{{contact_name}}`} ✓
                  </Label>
                  <InputControl
                    id="var-contact-name"
                    value={contacts.find((c) => c._id === contactId)?.name ?? ""}
                    readOnly
                    className="opacity-60"
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setStep(1)} disabled={saving}>
              Vissza
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleSave("draft")}
              disabled={saving}
            >
              Mentés vázlatként
            </Button>
            {signingType !== "none" && (
              <Button
                variant="primary"
                onClick={() => handleSave("sent")}
                disabled={saving}
              >
                Generálás és küldés partnernek
              </Button>
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
              <Input
                label="Szerződésszám"
                value={uploadContractNumber}
                onChange={(e) => setUploadContractNumber(e.target.value)}
                placeholder="Üresen hagyva automatikus: SZ-..."
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
                    {contacts.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="upload-category">Kategória *</Label>
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
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept=".pdf"
                onChange={handleFileChange}
              />
              <Upload
                size={40}
                style={{
                  color: selectedFile
                    ? "var(--accent-primary, #e53935)"
                    : "var(--text-muted, #888)",
                  marginBottom: "12px",
                }}
              />
              <p
                style={{
                  color: "var(--text-primary, #fff)",
                  fontWeight: 600,
                  margin: "0 0 4px 0",
                }}
              >
                {selectedFile ? selectedFile.name : "Fájl kiválasztása (Kattints ide)"}
              </p>
              <p
                style={{
                  color: "var(--text-muted, #888)",
                  fontSize: "0.875rem",
                  margin: 0,
                }}
              >
                {selectedFile
                  ? "Fájl sikeresen kiválasztva (A mentés továbbra is dummy PDF-et ad a teszt során)"
                  : "Csak PDF formátum támogatott"}
              </p>
            </div>
          </Card>

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setStep(1)} disabled={saving}>
              Vissza
            </Button>
            <Button
              variant="primary"
              onClick={() => handleSave("draft")}
              disabled={saving}
            >
              {saving ? "Mentés..." : "Feltöltés és mentés"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
