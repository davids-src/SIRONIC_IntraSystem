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
import { useEffect, useState, use } from "react";
import { FileText, Upload, ArrowLeft, Save } from "lucide-react";
import type { Contact, ContractTemplate, Contract } from "@crm/types";
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

export default function EditContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loaded DB data
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contractType, setContractType] = useState<"generated" | "uploaded" | null>(null);

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

  useEffect(() => {
    Promise.all([
      apiJson<ContractTemplate[]>("/api/contract-templates"),
      apiJson<Contact[]>("/api/contacts"),
      apiJson<Contract>(`/api/contracts/${id}`),
    ])
      .then(([tmpls, conts, doc]) => {
        setTemplates(tmpls.filter((t) => t.is_active));
        setContacts(conts);
        setContractType(doc.type);

        if (doc.status !== "draft") {
          router.replace(`/contracts/${id}`);
          return;
        }

        if (doc.type === "generated") {
          setContractNumber(doc.contract_number);
          setTemplateId(doc.template_id || "");
          setContractName(doc.name);
          setContactId(doc.contact_id);
          setCategory(doc.category);
          setValidFrom(
            doc.valid_from ? new Date(doc.valid_from).toISOString().slice(0, 10) : "",
          );
          setValidUntil(
            doc.valid_until ? new Date(doc.valid_until).toISOString().slice(0, 10) : "",
          );
          setIndefinite(!doc.valid_until);
          setSigningType(doc.signing_type);
          setPortalVisible(doc.portal_visible);
          setVariablesFilled(doc.variables_filled || {});
        } else {
          setUploadContractNumber(doc.contract_number);
          setUploadName(doc.name);
          setUploadContactId(doc.contact_id);
          setUploadCategory(doc.category);
          setUploadSigningType(doc.signing_type);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Nem sikerült betölteni a szerződést.");
        setLoading(false);
      });
  }, [id, router]);

  const handleTemplateChange = (tmplId: string) => {
    setTemplateId(tmplId);
    const tmpl = templates.find((t) => t._id === tmplId);
    if (tmpl) {
      setContractName(tmpl.name);
      setCategory(tmpl.category);
      // Initialize variables filled
      const initVars: Record<string, string> = {};
      (tmpl.variables ?? []).forEach((v) => {
        initVars[v] = "";
      });
      setVariablesFilled(initVars);
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

  const handleSave = async () => {
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
          category,
          name: contractName,
          contract_number: contractNumber || undefined,
          template_id: templateId,
          variables_filled: variablesFilled,
          signing_type: signingType,
          portal_visible: portalVisible,
          valid_from: validFrom ? new Date(validFrom).toISOString() : null,
          valid_until:
            indefinite || !validUntil ? null : new Date(validUntil).toISOString(),
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
          category: uploadCategory,
          name: uploadName,
          contract_number: uploadContractNumber || undefined,
          signing_type: uploadSigningType,
        };
      }

      await apiJsonBody(`/api/contracts/${id}`, "PATCH", payload);
      router.push(`/contracts/${id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Hiba a mentés során.");
    } finally {
      setSaving(false);
    }
  };

  const selectedTemplate = templates.find((t) => t._id === templateId);
  const templateVariables = selectedTemplate?.variables ?? [];

  if (loading) {
    return <div className="p-6 text-[var(--color-text-muted)]">Betöltés…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="Szerződés szerkesztése"
        subtitle={
          contractType === "generated"
            ? "Sablon alapú szerződés módosítása"
            : "Feltöltött szerződés adatainak módosítása"
        }
        actions={
          <Button
            variant="secondary"
            onClick={() => router.push(`/contracts/${id}`)}
            disabled={saving}
          >
            <ArrowLeft size={16} style={{ marginRight: "8px" }} />
            Mégse
          </Button>
        }
      />

      {error && <div className="text-red-400 p-4 rounded-lg bg-red-950/30">{error}</div>}

      {/* From template */}
      {contractType === "generated" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Header fields */}
          <Card className="flex flex-col gap-5 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Alapadatok
            </h3>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-contract-template">Sablon *</Label>
                <Select
                  value={templateId || "__empty__"}
                  onValueChange={(v) => handleTemplateChange(v === "__empty__" ? "" : v)}
                >
                  <SelectTrigger id="edit-contract-template" className="w-full">
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
                <Label htmlFor="edit-contract-contact">Kontakt *</Label>
                <Select
                  value={contactId || "__empty__"}
                  onValueChange={(v) => setContactId(v === "__empty__" ? "" : v)}
                >
                  <SelectTrigger id="edit-contract-contact" className="w-full">
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
                <Label htmlFor="edit-contract-category">Kategória *</Label>
                <Select
                  value={category || "__empty__"}
                  onValueChange={(v) => setCategory(v === "__empty__" ? "" : v)}
                >
                  <SelectTrigger id="edit-contract-category" className="w-full">
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
                <Label htmlFor="edit-contract-valid-until">Érvényesség vége</Label>
                <Input
                  id="edit-contract-valid-until"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  disabled={indefinite}
                />
                <div className="flex flex-row items-center gap-2">
                  <Checkbox
                    id="edit-contract-indefinite"
                    checked={indefinite}
                    onCheckedChange={(v) => setIndefinite(v === true)}
                  />
                  <Label
                    htmlFor="edit-contract-indefinite"
                    className="cursor-pointer font-normal text-muted-foreground"
                  >
                    Határozatlan idejű
                  </Label>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2 xl:col-span-3">
                <Label htmlFor="edit-contract-signing">Aláírás módja</Label>
                <Select
                  value={signingType}
                  onValueChange={(v) => setSigningType(v as "digital" | "paper" | "none")}
                >
                  <SelectTrigger id="edit-contract-signing" className="w-full max-w-md">
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
                  id="edit-contract-portal-visible"
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
            <Button
              variant="secondary"
              onClick={() => router.push(`/contracts/${id}`)}
              disabled={saving}
            >
              Mégse
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              <Save size={15} className="mr-1.5" />
              {saving ? "Mentés..." : "Változtatások mentése"}
            </Button>
          </div>
        </div>
      )}

      {/* Uploaded */}
      {contractType === "uploaded" && (
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

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <Button
              variant="secondary"
              onClick={() => router.push(`/contracts/${id}`)}
              disabled={saving}
            >
              Mégse
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              <Save size={15} className="mr-1.5" />
              {saving ? "Mentés..." : "Változtatások mentése"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
