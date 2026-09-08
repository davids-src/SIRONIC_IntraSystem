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
} from "@crm/ui";
import { CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Contact, DeploymentPackage, StackTemplate } from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";

const STEPS = ["Partner", "DNS", "Proxy", "Image és stack", "Számlázás", "Áttekintés"];

export default function NewDeploymentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<StackTemplate[]>([]);
  const [packages, setPackages] = useState<DeploymentPackage[]>([]);

  const [contactId, setContactId] = useState("");
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [wwwRedirect, setWwwRedirect] = useState(true);

  const [dnsTarget, setDnsTarget] = useState(
    process.env.NEXT_PUBLIC_DEPLOYMENTS_PUBLIC_IP ?? "",
  );
  const [dnsRecordType, setDnsRecordType] = useState<"A" | "CNAME">("A");
  const [dnsProxied, setDnsProxied] = useState(false);

  const [forwardHost, setForwardHost] = useState("");
  const [forwardPort, setForwardPort] = useState("3000");
  const [forwardScheme, setForwardScheme] = useState<"http" | "https">("http");
  const [websocketSupport, setWebsocketSupport] = useState(true);

  const [imageRepository, setImageRepository] = useState("");
  const [imageTag, setImageTag] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [stackName, setStackName] = useState("");
  const [templateId, setTemplateId] = useState("");

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
        // best-effort — pickers just render empty
      }
    })();
    return () => ac.abort();
  }, []);

  const canProceedFromStep0 =
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
        notes: notes.trim() || null,
        dns: dnsTarget.trim()
          ? { record_type: dnsRecordType, target: dnsTarget.trim(), proxied: dnsProxied }
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
          ? { stack_name: stackName.trim(), template_id: templateId || null, env: [] }
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

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "32px", maxWidth: "760px" }}
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
                  color:
                    i >= step && i !== step ? "var(--color-text-muted, #555)" : "#fff",
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

      {error ? (
        <p className="text-sm" style={{ color: "var(--color-status-error, #f87171)" }}>
          {error}
        </p>
      ) : null}

      {step === 0 && (
        <Card className="p-8">
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="flex flex-col gap-1.5">
              <Label>Partner *</Label>
              <Select value={contactId || undefined} onValueChange={setContactId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Válassz partnert" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              label="Deployment neve *"
              placeholder="pl. Acme Kft. — céges weboldal"
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
          </div>
          <div style={{ marginTop: "28px" }}>
            <Button
              variant="primary"
              onClick={() => setStep(1)}
              style={{ opacity: canProceedFromStep0 ? 1 : 0.5 }}
            >
              Tovább: DNS
              <ChevronRight size={16} style={{ marginLeft: "6px" }} />
            </Button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card className="p-8">
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="CNAME">CNAME</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              label="Cél (IP vagy hostname)"
              placeholder="pl. 203.0.113.10"
              value={dnsTarget}
              onChange={(e) => setDnsTarget(e.target.value)}
            />
            <CheckboxField
              label="Cloudflare proxy (narancs felhő)"
              checked={dnsProxied}
              onCheckedChange={(checked) => setDnsProxied(checked === true)}
            />
          </div>
          <div style={{ marginTop: "28px", display: "flex", gap: "8px" }}>
            <Button variant="secondary" onClick={() => setStep(0)}>
              <ChevronLeft size={16} style={{ marginRight: "6px" }} />
              Vissza
            </Button>
            <Button variant="primary" onClick={() => setStep(2)}>
              Tovább: Proxy
              <ChevronRight size={16} style={{ marginLeft: "6px" }} />
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-8">
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
          </div>
          <div style={{ marginTop: "28px", display: "flex", gap: "8px" }}>
            <Button variant="secondary" onClick={() => setStep(1)}>
              <ChevronLeft size={16} style={{ marginRight: "6px" }} />
              Vissza
            </Button>
            <Button variant="primary" onClick={() => setStep(3)}>
              Tovább: Image és stack
              <ChevronRight size={16} style={{ marginLeft: "6px" }} />
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
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
            <Input
              label="Portainer stack neve"
              placeholder="pl. partner-acme"
              value={stackName}
              onChange={(e) => setStackName(e.target.value.toLowerCase())}
            />
            <div className="flex flex-col gap-1.5">
              <Label>Stack sablon</Label>
              <Select value={templateId || undefined} onValueChange={setTemplateId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Válassz sablont" />
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
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Partner</dt>
            <dd>{contacts.find((c) => c._id === contactId)?.name ?? "—"}</dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Név</dt>
            <dd>{name}</dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Domain</dt>
            <dd>{domain}</dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>DNS</dt>
            <dd>
              {dnsRecordType} → {dnsTarget || "—"}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Proxy</dt>
            <dd>
              {forwardHost || "—"}:{forwardPort}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Image</dt>
            <dd>
              {imageRepository || "—"}:{imageTag || "—"}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Stack</dt>
            <dd>{stackName || "—"}</dd>
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
              {saving ? "Mentés..." : "Deployment létrehozása"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
