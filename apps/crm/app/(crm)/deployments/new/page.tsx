"use client";

import {
  PageHeader,
  Card,
  Button,
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  CheckboxField,
  ContactSelect,
} from "@crm/ui";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Contact, DeploymentPackage, StackTemplate } from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";

// Lépések sorrendje: Partner → DNS → Stack & Image → Proxy → Számlázás → Áttekintés
const STEPS = ["Partner", "DNS", "Stack & Image", "Proxy", "Számlázás", "Áttekintés"];

// ─── Egy host adatai multi módban ────────────────────────────────────────────
interface HostEntry {
  id: string; // lokális kulcs (crypto.randomUUID)
  domain: string;
  wwwRedirect: boolean;
  dnsName: string;
  dnsRecordType: "A" | "CNAME";
  dnsTarget: string;
  dnsProxied: boolean;
  forwardHost: string;
  forwardPort: string;
  forwardScheme: "http" | "https";
  websocketSupport: boolean;
  stackName: string;
}

function newHost(defaultDnsTarget: string): HostEntry {
  return {
    id: typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36),
    domain: "",
    wwwRedirect: true,
    dnsName: "@",
    dnsRecordType: "A",
    dnsTarget: defaultDnsTarget,
    dnsProxied: false,
    forwardHost: "",
    forwardPort: "3000",
    forwardScheme: "http",
    websocketSupport: true,
    stackName: "",
  };
}

// ─── Sablon mentés modal ──────────────────────────────────────────────────────
function SaveTemplateModal({ yaml, onClose }: { yaml: string; onClose: () => void }) {
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const save = async () => {
    if (!tplName.trim()) {
      setErr("A sablon neve kötelező.");
      return;
    }
    if (!yaml.trim()) {
      setErr("A YAML tartalom üres.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await apiJsonBody("/api/stack-templates", "POST", {
        name: tplName.trim(),
        description: tplDesc.trim() || null,
        compose_yaml: yaml,
      });
      setDone(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Mentés sikertelen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--color-surface-card, #181818)",
          border: "1px solid var(--color-border-default, #333)",
          borderRadius: "12px",
          padding: "28px",
          width: "min(480px, 95vw)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {done ? (
          <>
            <p style={{ color: "var(--color-status-success, #22c55e)", fontWeight: 600 }}>
              ✓ Sablon sikeresen elmentve!
            </p>
            <Button variant="primary" onClick={onClose}>
              Bezárás
            </Button>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Mentés sablonként</h3>
            <Input
              label="Sablon neve *"
              placeholder="pl. Next.js alap"
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
            />
            <Input
              label="Leírás (opcionális)"
              placeholder="Rövid leírás"
              value={tplDesc}
              onChange={(e) => setTplDesc(e.target.value)}
            />
            {err && (
              <p
                style={{
                  color: "var(--color-status-error, #f87171)",
                  fontSize: "0.8rem",
                }}
              >
                {err}
              </p>
            )}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={onClose}>
                Mégse
              </Button>
              <Button
                variant="primary"
                onClick={save}
                style={{ opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Mentés..." : "Mentés"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Fő oldal ─────────────────────────────────────────────────────────────────
export default function NewDeploymentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"single" | "multi">("single");

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<StackTemplate[]>([]);
  const [packages, setPackages] = useState<DeploymentPackage[]>([]);

  // ── Partner / közös mezők
  const [contactId, setContactId] = useState("");
  const [name, setName] = useState("");

  // ── Single mód mezők
  const defaultTarget = process.env.NEXT_PUBLIC_DEPLOYMENTS_PUBLIC_IP ?? "";

  const [domain, setDomain] = useState("");
  const [wwwRedirect, setWwwRedirect] = useState(true);

  const [dnsName, setDnsName] = useState("@");
  const [dnsTarget, setDnsTarget] = useState(defaultTarget);
  const [dnsRecordType, setDnsRecordType] = useState<"A" | "CNAME">("A");
  const [dnsProxied, setDnsProxied] = useState(false);

  const [imageRepository, setImageRepository] = useState("");
  const [imageTag, setImageTag] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [stackName, setStackName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [stackComposeYaml, setStackComposeYaml] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const [forwardHost, setForwardHost] = useState("");
  const [forwardPort, setForwardPort] = useState("3000");
  const [forwardScheme, setForwardScheme] = useState<"http" | "https">("http");
  const [websocketSupport, setWebsocketSupport] = useState(true);

  // ── Multi mód
  const [hosts, setHosts] = useState<HostEntry[]>(() => [newHost(defaultTarget)]);

  // ── Számlázás (mindkét módban közös)
  const [packageId, setPackageId] = useState("");
  const [billingCycle, setBillingCycle] = useState<
    "monthly" | "quarterly" | "yearly" | ""
  >("");
  const [priceOverride, setPriceOverride] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [c, t, p] = await Promise.all([
          apiJson<Contact[]>("/api/contacts", { signal: ac.signal }),
          apiJson<StackTemplate[]>("/api/stack-templates", { signal: ac.signal }),
          apiJson<DeploymentPackage[]>("/api/deployment-packages", { signal: ac.signal }),
        ]);
        setContacts(c);
        setTemplates(t);
        setPackages(p.filter((pkg) => pkg.is_active));
      } catch {
        // best-effort
      }
    })();
    return () => ac.abort();
  }, []);

  // Sablon betöltése az editorba
  const prevTemplateId = useRef("");
  useEffect(() => {
    if (!templateId || templateId === prevTemplateId.current) return;
    prevTemplateId.current = templateId;
    const tpl = templates.find((t) => t._id === templateId);
    if (tpl) setStackComposeYaml(tpl.compose_yaml);
  }, [templateId, templates]);

  // ─── Validáció
  const canProceedStep0 =
    contactId.length > 0 &&
    name.trim().length > 0 &&
    (mode === "multi" || domain.trim().length > 2);

  // ─── Multi host segédek
  const updateHost = (id: string, patch: Partial<HostEntry>) =>
    setHosts((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));

  const addHost = () => setHosts((prev) => [...prev, newHost(defaultTarget)]);
  const removeHost = (id: string) =>
    setHosts((prev) => (prev.length > 1 ? prev.filter((h) => h.id !== id) : prev));

  // ─── Mentés (single)
  const saveSingle = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await apiJsonBody<{ _id: string }>("/api/deployments", "POST", {
        contact_id: contactId,
        name: name.trim(),
        domain: domain.trim().toLowerCase(),
        www_redirect: wwwRedirect,
        notes: notes.trim() || null,
        dns: dnsTarget.trim()
          ? {
              record_type: dnsRecordType,
              name: dnsName.trim() || "@",
              target: dnsTarget.trim(),
              proxied: dnsProxied,
            }
          : undefined,
        proxy: forwardHost.trim()
          ? {
              forward_host: forwardHost.trim(),
              forward_port: Number(forwardPort) || 3000,
              forward_scheme: forwardScheme,
              websocket_support: websocketSupport,
            }
          : undefined,
        image: imageRepository.trim()
          ? {
              repository: imageRepository.trim(),
              tag: imageTag.trim() || "latest",
              workflow_id: workflowId.trim() || null,
            }
          : undefined,
        stack: stackName.trim()
          ? {
              stack_name: stackName.trim(),
              template_id: templateId || null,
              compose_yaml: stackComposeYaml.trim() || null,
              env: [],
            }
          : undefined,
        package_id: packageId || null,
        billing_cycle: billingCycle || null,
        price_override_huf: priceOverride.trim() ? Number(priceOverride) : null,
      });
      router.push(`/deployments/${created._id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Mentés sikertelen.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Mentés (multi) – közös group_id
  const saveMulti = async () => {
    setSaving(true);
    setError(null);
    const groupId =
      typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36);
    let lastId = "";
    try {
      for (const h of hosts) {
        const created = await apiJsonBody<{ _id: string }>("/api/deployments", "POST", {
          contact_id: contactId,
          name: `${name.trim()} — ${h.domain}`,
          domain: h.domain.trim().toLowerCase(),
          www_redirect: h.wwwRedirect,
          group_id: groupId,
          notes: notes.trim() || null,
          dns: h.dnsTarget.trim()
            ? {
                record_type: h.dnsRecordType,
                name: h.dnsName.trim() || "@",
                target: h.dnsTarget.trim(),
                proxied: h.dnsProxied,
              }
            : undefined,
          proxy: h.forwardHost.trim()
            ? {
                forward_host: h.forwardHost.trim(),
                forward_port: Number(h.forwardPort) || 3000,
                forward_scheme: h.forwardScheme,
                websocket_support: h.websocketSupport,
              }
            : undefined,
          image: imageRepository.trim()
            ? {
                repository: imageRepository.trim(),
                tag: imageTag.trim() || "latest",
                workflow_id: workflowId.trim() || null,
              }
            : undefined,
          stack: h.stackName.trim()
            ? {
                stack_name: h.stackName.trim(),
                template_id: templateId || null,
                compose_yaml: stackComposeYaml.trim() || null,
                env: [],
              }
            : undefined,
          package_id: packageId || null,
          billing_cycle: billingCycle || null,
          price_override_huf: priceOverride.trim() ? Number(priceOverride) : null,
        });
        lastId = created._id;
      }
      // Redirect az utolsóhoz (vagy a listára)
      router.push(lastId ? `/deployments/${lastId}` : "/deployments");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Mentés sikertelen.");
    } finally {
      setSaving(false);
    }
  };

  const save = mode === "single" ? saveSingle : saveMulti;

  // ─── Step indicator
  const StepBar = () => (
    <div style={{ display: "flex", alignItems: "center" }}>
      {STEPS.map((s, i) => (
        <div
          key={s}
          style={{
            display: "flex",
            alignItems: "center",
            flex: i < STEPS.length - 1 ? 1 : "unset",
          }}
        >
          <button
            onClick={() => i <= step && setStep(i)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "none",
              border: "none",
              cursor: i <= step ? "pointer" : "default",
              color:
                i === step
                  ? "var(--color-accent-primary, #e53935)"
                  : i < step
                    ? "var(--color-status-success, #22c55e)"
                    : "var(--color-text-muted, #555)",
              fontWeight: i === step ? 700 : 500,
              fontSize: "0.8rem",
              padding: "6px 0",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                fontWeight: 700,
                background:
                  i === step
                    ? "var(--color-accent-primary, #e53935)"
                    : i < step
                      ? "var(--color-status-success, #22c55e)"
                      : "var(--color-border-default, #222)",
                color: i >= step && i !== step ? "var(--color-text-muted, #555)" : "#fff",
                flexShrink: 0,
              }}
            >
              {i < step ? <CheckCircle2 size={12} /> : i + 1}
            </span>
            {s}
          </button>
          {i < STEPS.length - 1 && (
            <div
              style={{
                flex: 1,
                height: "2px",
                background:
                  i < step
                    ? "var(--color-status-success, #22c55e)"
                    : "var(--color-border-default, #222)",
                margin: "0 10px",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );

  // ─── Mód kapcsoló
  const ModeToggle = () => (
    <div
      style={{
        display: "flex",
        gap: "0",
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid var(--color-border-default, #333)",
        width: "fit-content",
      }}
    >
      {(["single", "multi"] as const).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          style={{
            padding: "7px 18px",
            fontSize: "0.8rem",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            background:
              mode === m ? "var(--color-accent-primary, #e53935)" : "transparent",
            color: mode === m ? "#fff" : "var(--color-text-muted, #777)",
            transition: "all 0.15s",
          }}
        >
          {m === "single" ? "Egyedi" : "Több host egyszerre"}
        </button>
      ))}
    </div>
  );

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "32px", maxWidth: "820px" }}
    >
      <PageHeader
        title="Új deployment"
        subtitle="Partner site felvétele a provisioning pipeline-hoz"
        actions={
          <Button variant="secondary" onClick={() => router.push("/deployments")}>
            Mégse
          </Button>
        }
      />

      <ModeToggle />
      <StepBar />

      {error ? (
        <p className="text-sm" style={{ color: "var(--color-status-error, #f87171)" }}>
          {error}
        </p>
      ) : null}

      {/* ── STEP 0: Partner ─────────────────────────────────────────────────── */}
      {step === 0 && (
        <Card className="p-8">
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <ContactSelect
              label="Partner *"
              value={contactId}
              onChange={(id) => setContactId(id)}
              contacts={contacts}
            />
            <Input
              label="Deployment neve *"
              placeholder="pl. Acme Kft. — céges weboldal"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            {mode === "single" ? (
              <>
                <Input
                  label="Domain *"
                  placeholder="pl. acme.hu"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
                <CheckboxField
                  label="www. átirányítás"
                  checked={wwwRedirect}
                  onCheckedChange={(checked) => setWwwRedirect(checked === true)}
                />
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Label>
                  Hostok *{" "}
                  <span
                    style={{ fontWeight: 400, color: "var(--color-text-muted, #777)" }}
                  >
                    (minden hosthoz külön deployment jön létre)
                  </span>
                </Label>
                {hosts.map((h, idx) => (
                  <div
                    key={h.id}
                    style={{
                      border: "1px solid var(--color-border-default, #333)",
                      borderRadius: "8px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                        Host #{idx + 1}
                      </span>
                      {hosts.length > 1 && (
                        <button
                          onClick={() => removeHost(h.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--color-status-error, #f87171)",
                            padding: "4px",
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                    <Input
                      label="Domain *"
                      placeholder="pl. acme.hu"
                      value={h.domain}
                      onChange={(e) => updateHost(h.id, { domain: e.target.value })}
                    />
                    <Input
                      label="Stack neve"
                      placeholder="pl. partner-acme"
                      value={h.stackName}
                      onChange={(e) =>
                        updateHost(h.id, { stackName: e.target.value.toLowerCase() })
                      }
                    />
                    <Input
                      label="Proxy forward host"
                      placeholder="pl. partner-acme-app"
                      value={h.forwardHost}
                      onChange={(e) => updateHost(h.id, { forwardHost: e.target.value })}
                    />
                    <CheckboxField
                      label="www. átirányítás"
                      checked={h.wwwRedirect}
                      onCheckedChange={(checked) =>
                        updateHost(h.id, { wwwRedirect: checked === true })
                      }
                    />
                  </div>
                ))}
                <Button
                  variant="secondary"
                  onClick={addHost}
                  style={{ width: "fit-content" }}
                >
                  <Plus size={14} style={{ marginRight: "6px" }} />
                  Host hozzáadása
                </Button>
              </div>
            )}
          </div>
          <div style={{ marginTop: "28px" }}>
            <Button
              variant="primary"
              onClick={() => setStep(1)}
              style={{ opacity: canProceedStep0 ? 1 : 0.5 }}
            >
              Tovább: DNS
              <ChevronRight size={16} style={{ marginLeft: "6px" }} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 1: DNS ─────────────────────────────────────────────────────── */}
      {step === 1 && (
        <Card className="p-8">
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {mode === "single" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label>Rekord típus</Label>
                  <Select
                    value={dnsRecordType}
                    onValueChange={(v) => setDnsRecordType(v as "A" | "CNAME")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A (IPv4 cím)</SelectItem>
                      <SelectItem value="CNAME">CNAME (hostname alias)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  label="Rekord neve"
                  placeholder={dnsRecordType === "A" ? "@ (apex)" : "@ vagy www"}
                  value={dnsName}
                  onChange={(e) => setDnsName(e.target.value)}
                />
                <Input
                  label={dnsRecordType === "A" ? "Cél IP-cím" : "Cél hostname"}
                  placeholder={
                    dnsRecordType === "A" ? "pl. 203.0.113.10" : "pl. proxy.example.com"
                  }
                  value={dnsTarget}
                  onChange={(e) => setDnsTarget(e.target.value)}
                />
                <CheckboxField
                  label="Cloudflare proxy (narancs felhő)"
                  checked={dnsProxied}
                  onCheckedChange={(checked) => setDnsProxied(checked === true)}
                />
              </>
            ) : (
              // Multi: minden hostnál DNS beállítás
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <p
                  style={{ fontSize: "0.85rem", color: "var(--color-text-muted, #777)" }}
                >
                  DNS beállítás minden hosthoz:
                </p>
                {hosts.map((h, idx) => (
                  <div
                    key={h.id}
                    style={{
                      border: "1px solid var(--color-border-default, #333)",
                      borderRadius: "8px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      Host #{idx + 1}: {h.domain || "—"}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      <Label>Rekord típus</Label>
                      <Select
                        value={h.dnsRecordType}
                        onValueChange={(v) =>
                          updateHost(h.id, { dnsRecordType: v as "A" | "CNAME" })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A (IPv4 cím)</SelectItem>
                          <SelectItem value="CNAME">CNAME (hostname alias)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      label="Rekord neve"
                      placeholder={h.dnsRecordType === "A" ? "@ (apex)" : "@ vagy www"}
                      value={h.dnsName}
                      onChange={(e) => updateHost(h.id, { dnsName: e.target.value })}
                    />
                    <Input
                      label={h.dnsRecordType === "A" ? "Cél IP-cím" : "Cél hostname"}
                      placeholder={
                        h.dnsRecordType === "A"
                          ? "pl. 203.0.113.10"
                          : "pl. proxy.example.com"
                      }
                      value={h.dnsTarget}
                      onChange={(e) => updateHost(h.id, { dnsTarget: e.target.value })}
                    />
                    <CheckboxField
                      label="Cloudflare proxy (narancs felhő)"
                      checked={h.dnsProxied}
                      onCheckedChange={(checked) =>
                        updateHost(h.id, { dnsProxied: checked === true })
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ marginTop: "28px", display: "flex", gap: "8px" }}>
            <Button variant="secondary" onClick={() => setStep(0)}>
              <ChevronLeft size={16} style={{ marginRight: "6px" }} />
              Vissza
            </Button>
            <Button variant="primary" onClick={() => setStep(2)}>
              Tovább: Stack & Image
              <ChevronRight size={16} style={{ marginLeft: "6px" }} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 2: Stack & Image ────────────────────────────────────────────── */}
      {step === 2 && (
        <Card className="p-8">
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <Input
              label="Image repository"
              placeholder="pl. ghcr.io/sironic/next-template"
              value={imageRepository}
              onChange={(e) => setImageRepository(e.target.value)}
            />
            <Input
              label="Image tag"
              placeholder="pl. latest / sha"
              value={imageTag}
              onChange={(e) => setImageTag(e.target.value)}
            />
            <Input
              label="GitHub workflow (opcionális)"
              placeholder="pl. main-build-images.yml"
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
            />

            {mode === "single" && (
              <Input
                label="Portainer stack neve"
                placeholder="pl. partner-acme"
                value={stackName}
                onChange={(e) => setStackName(e.target.value.toLowerCase())}
              />
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Stack sablon (opcionális)</Label>
              <Select value={templateId || undefined} onValueChange={setTemplateId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Válassz sablont (betölti a YAML szerkesztőbe)" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Label>docker-compose YAML</Label>
                <button
                  onClick={() => setShowSaveTemplate(true)}
                  disabled={!stackComposeYaml.trim()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "none",
                    border: "1px solid var(--color-border-default, #333)",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "0.75rem",
                    cursor: stackComposeYaml.trim() ? "pointer" : "not-allowed",
                    color: stackComposeYaml.trim()
                      ? "var(--color-text-primary, #eee)"
                      : "var(--color-text-muted, #555)",
                  }}
                >
                  <Save size={12} />
                  Mentés sablonként
                </button>
              </div>
              <textarea
                value={stackComposeYaml}
                onChange={(e) => setStackComposeYaml(e.target.value)}
                placeholder={
                  "version: '3'\nservices:\n  app:\n    image: ${IMAGE_REPO}:${IMAGE_TAG}\n    ..."
                }
                rows={14}
                style={{
                  width: "100%",
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  lineHeight: 1.6,
                  padding: "12px",
                  background: "var(--color-surface-input, #111)",
                  color: "var(--color-text-primary, #eee)",
                  border: "1px solid var(--color-border-default, #333)",
                  borderRadius: "8px",
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted, #555)" }}>
                A sablon kiválasztása automatikusan betölti a YAML-t. Szerkesztheted, majd
                elmentheted új sablonként.
              </p>
            </div>
          </div>
          <div style={{ marginTop: "28px", display: "flex", gap: "8px" }}>
            <Button variant="secondary" onClick={() => setStep(1)}>
              <ChevronLeft size={16} style={{ marginRight: "6px" }} />
              Vissza
            </Button>
            <Button variant="primary" onClick={() => setStep(3)}>
              Tovább: Proxy
              <ChevronRight size={16} style={{ marginLeft: "6px" }} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 3: Proxy ───────────────────────────────────────────────────── */}
      {step === 3 && (
        <Card className="p-8">
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {mode === "single" ? (
              <>
                <Input
                  label="Forward host (docker DNS név vagy IP)"
                  placeholder="pl. partner-example-app"
                  value={forwardHost}
                  onChange={(e) => setForwardHost(e.target.value)}
                />
                <Input
                  label="Forward port"
                  placeholder="3000"
                  value={forwardPort}
                  onChange={(e) => setForwardPort(e.target.value)}
                />
                <div className="flex flex-col gap-1.5">
                  <Label>Forward séma</Label>
                  <Select
                    value={forwardScheme}
                    onValueChange={(v) => setForwardScheme(v as "http" | "https")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="http">http</SelectItem>
                      <SelectItem value="https">https</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <CheckboxField
                  label="WebSocket támogatás"
                  checked={websocketSupport}
                  onCheckedChange={(checked) => setWebsocketSupport(checked === true)}
                />
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <p
                  style={{ fontSize: "0.85rem", color: "var(--color-text-muted, #777)" }}
                >
                  Proxy beállítás minden hosthoz:
                </p>
                {hosts.map((h, idx) => (
                  <div
                    key={h.id}
                    style={{
                      border: "1px solid var(--color-border-default, #333)",
                      borderRadius: "8px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      Host #{idx + 1}: {h.domain || "—"}
                    </span>
                    <Input
                      label="Forward host"
                      placeholder="pl. partner-acme-app"
                      value={h.forwardHost}
                      onChange={(e) => updateHost(h.id, { forwardHost: e.target.value })}
                    />
                    <Input
                      label="Forward port"
                      placeholder="3000"
                      value={h.forwardPort}
                      onChange={(e) => updateHost(h.id, { forwardPort: e.target.value })}
                    />
                    <div className="flex flex-col gap-1.5">
                      <Label>Forward séma</Label>
                      <Select
                        value={h.forwardScheme}
                        onValueChange={(v) =>
                          updateHost(h.id, { forwardScheme: v as "http" | "https" })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="http">http</SelectItem>
                          <SelectItem value="https">https</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <CheckboxField
                      label="WebSocket támogatás"
                      checked={h.websocketSupport}
                      onCheckedChange={(checked) =>
                        updateHost(h.id, { websocketSupport: checked === true })
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ marginTop: "28px", display: "flex", gap: "8px" }}>
            <Button variant="secondary" onClick={() => setStep(2)}>
              <ChevronLeft size={16} style={{ marginRight: "6px" }} />
              Vissza
            </Button>
            <Button variant="primary" onClick={() => setStep(4)}>
              Tovább: Számlázás
              <ChevronRight size={16} style={{ marginLeft: "6px" }} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 4: Számlázás ────────────────────────────────────────────────── */}
      {step === 4 && (
        <Card className="p-8">
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="flex flex-col gap-1.5">
              <Label>Csomag</Label>
              <Select value={packageId || undefined} onValueChange={setPackageId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Válassz csomagot (opcionális)" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Számlázási ciklus</Label>
              <Select
                value={billingCycle || undefined}
                onValueChange={(v) => setBillingCycle(v as typeof billingCycle)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Válassz ciklust" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Havi</SelectItem>
                  <SelectItem value="quarterly">Negyedéves</SelectItem>
                  <SelectItem value="yearly">Éves</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              label="Ár felülírás (HUF, opcionális)"
              placeholder="Csomag ára ha üres"
              value={priceOverride}
              onChange={(e) => setPriceOverride(e.target.value)}
            />
            <Textarea
              label="Megjegyzések"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div style={{ marginTop: "28px", display: "flex", gap: "8px" }}>
            <Button variant="secondary" onClick={() => setStep(3)}>
              <ChevronLeft size={16} style={{ marginRight: "6px" }} />
              Vissza
            </Button>
            <Button variant="primary" onClick={() => setStep(5)}>
              Tovább: Áttekintés
              <ChevronRight size={16} style={{ marginLeft: "6px" }} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 5: Áttekintés ───────────────────────────────────────────────── */}
      {step === 5 && (
        <Card className="p-8">
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "16px" }}>
            Áttekintés
          </h2>
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr",
              rowGap: "10px",
              fontSize: "0.875rem",
            }}
          >
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Mód</dt>
            <dd>
              {mode === "single" ? "Egyedi deployment" : `Több host (${hosts.length} db)`}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Partner</dt>
            <dd>{contacts.find((c) => c._id === contactId)?.name ?? "—"}</dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Név</dt>
            <dd>{name}</dd>
            {mode === "single" ? (
              <>
                <dt style={{ color: "var(--color-text-muted, #555)" }}>Domain</dt>
                <dd>{domain}</dd>
                <dt style={{ color: "var(--color-text-muted, #555)" }}>DNS</dt>
                <dd>
                  {dnsRecordType} {dnsName} → {dnsTarget || "—"}{" "}
                  {dnsProxied ? "(proxied)" : ""}
                </dd>
                <dt style={{ color: "var(--color-text-muted, #555)" }}>Proxy</dt>
                <dd>
                  {forwardHost || "—"}:{forwardPort}
                </dd>
                <dt style={{ color: "var(--color-text-muted, #555)" }}>Stack</dt>
                <dd>{stackName || "—"}</dd>
              </>
            ) : (
              <>
                <dt style={{ color: "var(--color-text-muted, #555)" }}>Hostok</dt>
                <dd>
                  {hosts.map((h) => (
                    <div key={h.id} style={{ marginBottom: "4px" }}>
                      <strong>{h.domain || "—"}</strong>{" "}
                      <span
                        style={{
                          color: "var(--color-text-muted, #555)",
                          fontSize: "0.8rem",
                        }}
                      >
                        DNS: {h.dnsRecordType} {h.dnsName} → {h.dnsTarget || "—"} | Proxy:{" "}
                        {h.forwardHost || "—"}:{h.forwardPort} | Stack:{" "}
                        {h.stackName || "—"}
                      </span>
                    </div>
                  ))}
                </dd>
              </>
            )}
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Image</dt>
            <dd>
              {imageRepository || "—"}:{imageTag || "—"}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Sablon</dt>
            <dd>
              {templates.find((t) => t._id === templateId)?.name ??
                (stackComposeYaml.trim() ? "Inline YAML" : "—")}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Csomag</dt>
            <dd>{packages.find((p) => p._id === packageId)?.name ?? "—"}</dd>
          </dl>
          <div style={{ marginTop: "28px", display: "flex", gap: "8px" }}>
            <Button variant="secondary" onClick={() => setStep(4)}>
              <ChevronLeft size={16} style={{ marginRight: "6px" }} />
              Vissza
            </Button>
            <Button
              variant="primary"
              onClick={save}
              style={{ opacity: saving ? 0.6 : 1 }}
            >
              {saving
                ? "Mentés..."
                : mode === "multi"
                  ? `${hosts.length} deployment létrehozása`
                  : "Deployment létrehozása"}
            </Button>
          </div>
        </Card>
      )}

      {showSaveTemplate && (
        <SaveTemplateModal
          yaml={stackComposeYaml}
          onClose={() => setShowSaveTemplate(false)}
        />
      )}
    </div>
  );
}
