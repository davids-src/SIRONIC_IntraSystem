"use client";

import {
  Card,
  Button,
  Badge,
  PageHeader,
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  CheckboxField,
  TextareaControl,
} from "@crm/ui";
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
            <div className="flex flex-col gap-5">
              <Input
                label="Sablon neve *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pl. Karbantartási szerz. alap"
              />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tmpl-category">Kategória</Label>
                <Select
                  value={category || "__empty__"}
                  onValueChange={(v) => setCategory(v === "__empty__" ? "" : v)}
                >
                  <SelectTrigger id="tmpl-category" className="w-full">
                    <SelectValue placeholder="-- Kategória --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">-- Kategória --</SelectItem>
                    {CONTRACT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                label="Leírás"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Rövid leírás a sablon céljáról…"
              />
              <div className="flex flex-col gap-2">
                <div className="flex flex-row items-center justify-between gap-2">
                  <Label
                    htmlFor="tmpl-body"
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Sablon tartalma *
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowVarRef(!showVarRef)}
                    className="flex cursor-pointer items-center gap-1 border-0 bg-transparent text-sm text-primary"
                  >
                    <Info size={14} />
                    {showVarRef ? "Változók elrejtése" : "Elérhető változók"}
                  </button>
                </div>
                <TextareaControl
                  id="tmpl-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={18}
                  className="min-h-[320px] resize-y font-mono text-sm leading-relaxed"
                  placeholder={`Írd be a szerződés szövegét.\nHasználj {{variable_name}} szintaxist a változókhoz.\n\nPl.:\nEzen szerződés létrejött a {{company_name}} és {{contact_name}} között.\nKelt: {{contract_date}}`}
                />
                {showVarRef && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-border">
                    <div className="bg-muted px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Elérhető változók
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {AVAILABLE_VARIABLES.map((v) => (
                        <div
                          key={v.name}
                          className="flex cursor-pointer flex-row items-center justify-between gap-2 border-b border-border px-3.5 py-2 last:border-b-0"
                          onClick={() => {
                            setBody(body + v.name);
                          }}
                          title="Kattintásra beillesztés"
                        >
                          <code className="shrink-0 text-sm text-primary">{v.name}</code>
                          <span className="min-w-0 flex-1 text-right text-xs text-muted-foreground">
                            {v.desc}
                          </span>
                          <Copy size={12} className="shrink-0 text-muted-foreground" />
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
            <div className="flex flex-col gap-3.5">
              <CheckboxField
                id="tmpl-requires-signature"
                label={
                  <span>
                    <span className="font-semibold text-foreground">
                      Digitális aláírás szükséges
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Partner portálon aláírható
                    </span>
                  </span>
                }
                checked={requiresSignature}
                onCheckedChange={(v) => setRequiresSignature(v === true)}
                containerClassName="items-start"
              />
              <CheckboxField
                id="tmpl-active"
                label={
                  <span>
                    <span className="font-semibold text-foreground">Aktív sablon</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Megjelenik az új szerz. létrehozásánál
                    </span>
                  </span>
                }
                checked={isActive}
                onCheckedChange={(v) => setIsActive(v === true)}
                containerClassName="items-start"
              />
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
