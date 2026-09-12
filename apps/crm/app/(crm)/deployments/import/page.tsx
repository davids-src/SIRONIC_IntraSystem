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
import { CheckCircle2, ChevronRight, ChevronLeft, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Contact } from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";

const STEPS = ["Alapadatok", "Infrastruktúra azonosítók", "Áttekintés"];

export default function ImportDeploymentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);

  // ── Step 0: Alapadatok
  const [contactId, setContactId] = useState("");
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [wwwRedirect, setWwwRedirect] = useState(true);
  const [dnsRecordType, setDnsRecordType] = useState<"A" | "CNAME">("A");
  const [dnsName, setDnsName] = useState("@");
  const [dnsTarget, setDnsTarget] = useState("");
  const [dnsProxied, setDnsProxied] = useState(false);
  const [forwardHost, setForwardHost] = useState("");
  const [forwardPort, setForwardPort] = useState("3000");
  const [stackName, setStackName] = useState("");
  const [notes, setNotes] = useState("");

  // ── Step 1: Külső azonosítók
  const [cfZoneId, setCfZoneId] = useState("");
  const [cfDnsRecordIds, setCfDnsRecordIds] = useState("");
  const [npmCertId, setNpmCertId] = useState("");
  const [npmProxyHostId, setNpmProxyHostId] = useState("");
  const [portainerStackId, setPortainerStackId] = useState("");
  const [portainerEndpointId, setPortainerEndpointId] = useState("");
  const [portainerWebhookId, setPortainerWebhookId] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    apiJson<Contact[]>("/api/contacts", { signal: ac.signal })
      .then(setContacts)
      .catch(() => {});
    return () => ac.abort();
  }, []);

  const canProceedStep0 =
    contactId.length > 0 && name.trim().length > 0 && domain.trim().length > 2;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await apiJsonBody<{ _id: string }>("/api/deployments", "POST", {
        contact_id: contactId,
        name: name.trim(),
        domain: domain.trim().toLowerCase(),
        www_redirect: wwwRedirect,
        source: "imported",
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
              forward_scheme: "http" as const,
              websocket_support: true,
            }
          : undefined,
        stack: stackName.trim()
          ? {
              stack_name: stackName.trim(),
              template_id: null,
              compose_yaml: null,
              env: [],
            }
          : undefined,
        external_ids: {
          cloudflare_zone_id: cfZoneId.trim() || null,
          cloudflare_dns_record_ids: cfDnsRecordIds
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          npm_certificate_id: npmCertId.trim() ? Number(npmCertId) : null,
          npm_proxy_host_id: npmProxyHostId.trim() ? Number(npmProxyHostId) : null,
          portainer_stack_id: portainerStackId.trim() ? Number(portainerStackId) : null,
          portainer_endpoint_id: portainerEndpointId.trim()
            ? Number(portainerEndpointId)
            : null,
          portainer_webhook_id: portainerWebhookId.trim() || null,
        },
      });
      router.push(`/deployments/${created._id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Importálás sikertelen.");
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "32px", maxWidth: "760px" }}
    >
      <PageHeader
        title="Deployment importálása"
        subtitle="Meglévő külső infrastruktúra regisztrálása a CRM-be"
        actions={
          <Button variant="secondary" onClick={() => router.push("/deployments")}>
            Mégse
          </Button>
        }
      />

      {/* Info sáv */}
      <div
        style={{
          padding: "12px 16px",
          borderRadius: "8px",
          background: "rgba(59,130,246,0.08)",
          border: "1px solid rgba(59,130,246,0.2)",
          fontSize: "0.82rem",
          color: "var(--color-text-muted, #aaa)",
          display: "flex",
          gap: "10px",
          alignItems: "flex-start",
        }}
      >
        <Download
          size={15}
          style={{ marginTop: "1px", flexShrink: 0, color: "#60a5fa" }}
        />
        <span>
          Az importált deployment <strong style={{ color: "#e2e8f0" }}>live</strong>{" "}
          állapottal jön létre. A megadott külső azonosítók alapján a pipeline lépések{" "}
          <strong style={{ color: "#e2e8f0" }}>adopted</strong> státuszt kapnak – a
          provisioning pipeline nem fogja újra futtatni őket.
        </span>
      </div>

      <StepBar />

      {error ? (
        <p className="text-sm" style={{ color: "var(--color-status-error, #f87171)" }}>
          {error}
        </p>
      ) : null}

      {/* ── STEP 0: Alapadatok ───────────────────────────────────────────────── */}
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
              placeholder="pl. Acme Kft. — meglévő weboldal"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
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

            <hr style={{ borderColor: "var(--color-border-default, #333)" }} />
            <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted, #777)" }}>
              DNS és proxy adatok (opcionális – ha ismert):
            </p>

            <div className="flex flex-col gap-1.5">
              <Label>DNS rekord típus</Label>
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
              placeholder="@ (apex)"
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
            <Input
              label="Nginx Proxy Manager – forward host"
              placeholder="pl. partner-acme-app"
              value={forwardHost}
              onChange={(e) => setForwardHost(e.target.value)}
            />
            <Input
              label="Nginx Proxy Manager – forward port"
              placeholder="3000"
              value={forwardPort}
              onChange={(e) => setForwardPort(e.target.value)}
            />
            <Input
              label="Portainer stack neve"
              placeholder="pl. partner-acme"
              value={stackName}
              onChange={(e) => setStackName(e.target.value.toLowerCase())}
            />
            <Textarea
              label="Megjegyzések"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div style={{ marginTop: "28px" }}>
            <Button
              variant="primary"
              onClick={() => setStep(1)}
              style={{ opacity: canProceedStep0 ? 1 : 0.5 }}
            >
              Tovább: Azonosítók
              <ChevronRight size={16} style={{ marginLeft: "6px" }} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 1: Infrastruktúra azonosítók ───────────────────────────────── */}
      {step === 1 && (
        <Card className="p-8">
          <p
            style={{
              fontSize: "0.82rem",
              color: "var(--color-text-muted, #777)",
              marginBottom: "20px",
            }}
          >
            Add meg a meglévő erőforrások azonosítóit. Ahol kitöltöd, a pipeline lépés{" "}
            <strong>adopted</strong> állapotra áll és nem kerül újra futtatásra.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--color-text-muted, #777)",
                }}
              >
                Cloudflare
              </span>
              <Input
                label="Zone ID"
                placeholder="pl. abc123..."
                value={cfZoneId}
                onChange={(e) => setCfZoneId(e.target.value)}
              />
              <Input
                label="DNS record ID-k (vesszővel elválasztva)"
                placeholder="pl. rec1,rec2"
                value={cfDnsRecordIds}
                onChange={(e) => setCfDnsRecordIds(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--color-text-muted, #777)",
                }}
              >
                Nginx Proxy Manager
              </span>
              <Input
                label="Certificate ID"
                placeholder="pl. 42"
                value={npmCertId}
                onChange={(e) => setNpmCertId(e.target.value)}
              />
              <Input
                label="Proxy Host ID"
                placeholder="pl. 15"
                value={npmProxyHostId}
                onChange={(e) => setNpmProxyHostId(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--color-text-muted, #777)",
                }}
              >
                Portainer
              </span>
              <Input
                label="Stack ID"
                placeholder="pl. 7"
                value={portainerStackId}
                onChange={(e) => setPortainerStackId(e.target.value)}
              />
              <Input
                label="Endpoint ID"
                placeholder="pl. 1"
                value={portainerEndpointId}
                onChange={(e) => setPortainerEndpointId(e.target.value)}
              />
              <Input
                label="Webhook ID"
                placeholder="pl. xxxxxxxx-xxxx-..."
                value={portainerWebhookId}
                onChange={(e) => setPortainerWebhookId(e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginTop: "28px", display: "flex", gap: "8px" }}>
            <Button variant="secondary" onClick={() => setStep(0)}>
              <ChevronLeft size={16} style={{ marginRight: "6px" }} />
              Vissza
            </Button>
            <Button variant="primary" onClick={() => setStep(2)}>
              Tovább: Áttekintés
              <ChevronRight size={16} style={{ marginLeft: "6px" }} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 2: Áttekintés ───────────────────────────────────────────────── */}
      {step === 2 && (
        <Card className="p-8">
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "16px" }}>
            Áttekintés
          </h2>
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "220px 1fr",
              rowGap: "10px",
              fontSize: "0.875rem",
            }}
          >
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Partner</dt>
            <dd>{contacts.find((c) => c._id === contactId)?.name ?? "—"}</dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Név</dt>
            <dd>{name}</dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Domain</dt>
            <dd>{domain}</dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>DNS</dt>
            <dd>
              {dnsRecordType} {dnsName} → {dnsTarget || "—"}
              {dnsProxied ? " (proxied)" : ""}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Proxy forward</dt>
            <dd>
              {forwardHost || "—"}:{forwardPort}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Stack neve</dt>
            <dd>{stackName || "—"}</dd>

            <dt
              style={{
                color: "var(--color-text-muted, #555)",
                marginTop: "8px",
                fontWeight: 600,
              }}
            >
              Cloudflare zone
            </dt>
            <dd style={{ marginTop: "8px", fontFamily: "monospace", fontSize: "0.8rem" }}>
              {cfZoneId || "—"}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>CF DNS record ID-k</dt>
            <dd style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
              {cfDnsRecordIds || "—"}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>NPM cert ID</dt>
            <dd style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
              {npmCertId || "—"}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>NPM proxy host ID</dt>
            <dd style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
              {npmProxyHostId || "—"}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Portainer stack ID</dt>
            <dd style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
              {portainerStackId || "—"}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Portainer webhook</dt>
            <dd style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
              {portainerWebhookId || "—"}
            </dd>
          </dl>

          <div
            style={{
              marginTop: "16px",
              padding: "10px 14px",
              borderRadius: "6px",
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
              fontSize: "0.8rem",
              color: "var(--color-text-muted, #aaa)",
            }}
          >
            ✓ Az importált deployment <strong style={{ color: "#86efac" }}>live</strong>{" "}
            állapottal és a megadott azonosítók alapján{" "}
            <strong style={{ color: "#86efac" }}>adopted</strong> lépésekkel kerül be.
          </div>

          <div style={{ marginTop: "28px", display: "flex", gap: "8px" }}>
            <Button variant="secondary" onClick={() => setStep(1)}>
              <ChevronLeft size={16} style={{ marginRight: "6px" }} />
              Vissza
            </Button>
            <Button
              variant="primary"
              onClick={save}
              style={{ opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Importálás..." : "Deployment importálása"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
