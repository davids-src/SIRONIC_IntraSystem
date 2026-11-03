"use client";

import { Badge, Button, Card, Input, colors, radius } from "@crm/ui";
import type {
  Deployment,
  DeploymentStep,
  DeploymentStepKey,
  DeploymentStepStatus,
} from "@crm/types";
import { useState, type ChangeEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { apiJsonBody, ApiError } from "@/lib/api-client";

const STEP_LABELS: Record<DeploymentStepKey, string> = {
  cloudflare_zone: "Cloudflare zóna",
  ns_delegation: "NS delegálás",
  dns_records: "DNS rekordok",
  ssl_certificate: "SSL tanúsítvány",
  proxy_host: "Proxy host",
  image_build: "Image build",
  stack_create: "Stack létrehozás",
  stack_deploy: "Stack indítás",
};

const STATUS_LABEL: Record<DeploymentStepStatus, string> = {
  pending: "Várakozik",
  running: "Fut",
  done: "Kész",
  failed: "Hiba",
  skipped: "Kihagyva",
  adopted: "Adoptálva",
  manual_required: "Manuális teendő",
};

const STATUS_VARIANT: Record<
  DeploymentStepStatus,
  "default" | "info" | "success" | "warning" | "error"
> = {
  pending: "default",
  running: "info",
  done: "success",
  failed: "error",
  skipped: "default",
  adopted: "success",
  manual_required: "warning",
};

export function StepRunner({
  deployment,
  onChanged,
}: {
  deployment: Deployment;
  onChanged: (updated: Deployment) => void;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [inputPrompt, setInputPrompt] = useState<{
    key: DeploymentStepKey;
    action: "adopt" | "skip";
    required: boolean;
    title: string;
    label: string;
    value: string;
  } | null>(null);

  async function run(
    key: DeploymentStepKey,
    action: "plan" | "execute" | "adopt" | "verify" | "skip" | "unskip",
    inputValue?: string,
  ) {
    if (action === "adopt" && inputValue === undefined) {
      setInputPrompt({
        key,
        action: "adopt",
        required: true,
        title: `"${STEP_LABELS[key]}" adoptálása`,
        label: "Meglévő erőforrás azonosítója (external ID)",
        value: "",
      });
      return;
    }
    if (action === "skip" && inputValue === undefined) {
      setInputPrompt({
        key,
        action: "skip",
        required: false,
        title: `"${STEP_LABELS[key]}" kihagyása`,
        label: "Kihagyás oka (opcionális)",
        value: "",
      });
      return;
    }

    setBusyKey(`${key}:${action}`);
    try {
      if (action === "plan") {
        const plan = await apiJsonBody<{ summary: string; warnings: string[] }>(
          `/api/deployments/${deployment._id}/steps/${key}/plan`,
          "POST",
          {},
        );
        toast.message(plan.summary, {
          description: plan.warnings.length > 0 ? plan.warnings.join(" ") : undefined,
        });
        return;
      }
      if (action === "execute") {
        const updated = await apiJsonBody<Deployment>(
          `/api/deployments/${deployment._id}/steps/${key}/execute`,
          "POST",
          {},
        );
        toast.success(`"${STEP_LABELS[key]}" lépés lefutott.`);
        onChanged(updated);
        return;
      }
      if (action === "adopt") {
        if (!inputValue) return;
        const updated = await apiJsonBody<Deployment>(
          `/api/deployments/${deployment._id}/steps/${key}/adopt`,
          "POST",
          {
            external_id: inputValue,
          },
        );
        toast.success(`"${STEP_LABELS[key]}" adoptálva.`);
        onChanged(updated);
        return;
      }
      if (action === "verify") {
        const result = await apiJsonBody<{
          ok: boolean;
          message: string;
          drift: string[];
          deployment: Deployment;
        }>(`/api/deployments/${deployment._id}/steps/${key}/verify`, "POST", {});
        if (result.ok) toast.success(result.message);
        else
          toast.warning(result.message, {
            description: result.drift.join(", ") || undefined,
          });
        onChanged(result.deployment);
        return;
      }
      if (action === "skip") {
        const updated = await apiJsonBody<Deployment>(
          `/api/deployments/${deployment._id}/steps/${key}/skip`,
          "POST",
          {
            reason: inputValue || undefined,
          },
        );
        toast.success(`"${STEP_LABELS[key]}" kihagyva.`);
        onChanged(updated);
        return;
      }
      if (action === "unskip") {
        const updated = await apiJsonBody<Deployment>(
          `/api/deployments/${deployment._id}/steps/${key}/unskip`,
          "POST",
          {},
        );
        toast.success(`"${STEP_LABELS[key]}" újra aktív.`);
        onChanged(updated);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Művelet sikertelen.");
    } finally {
      setBusyKey(null);
    }
  }

  function submitInputPrompt() {
    if (!inputPrompt) return;
    if (inputPrompt.required && !inputPrompt.value.trim()) return;
    const { key, action, value } = inputPrompt;
    setInputPrompt(null);
    void run(key, action, value.trim());
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {deployment.steps.map((step: DeploymentStep) => (
        <Card key={step.key} className="p-4">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontWeight: 600 }}>{STEP_LABELS[step.key]}</span>
              <Badge variant={STATUS_VARIANT[step.status]}>
                {STATUS_LABEL[step.status]}
              </Badge>
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <Button
                variant="secondary"
                onClick={() => run(step.key, "plan")}
                style={{ opacity: busyKey ? 0.6 : 1 }}
              >
                Terv
              </Button>
              <Button
                variant="primary"
                onClick={() => run(step.key, "execute")}
                style={{ opacity: busyKey ? 0.6 : 1 }}
              >
                Futtatás
              </Button>
              <Button
                variant="secondary"
                onClick={() => run(step.key, "adopt")}
                style={{ opacity: busyKey ? 0.6 : 1 }}
              >
                Adopt
              </Button>
              <Button
                variant="secondary"
                onClick={() => run(step.key, "verify")}
                style={{ opacity: busyKey ? 0.6 : 1 }}
              >
                Verify
              </Button>
              {step.status === "skipped" ? (
                <Button
                  variant="ghost"
                  onClick={() => run(step.key, "unskip")}
                  style={{ opacity: busyKey ? 0.6 : 1 }}
                >
                  Aktiválás
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => run(step.key, "skip")}
                  style={{ opacity: busyKey ? 0.6 : 1 }}
                >
                  Kihagyás
                </Button>
              )}
            </div>
          </div>
          {step.message ? (
            <p
              style={{
                marginTop: "10px",
                fontSize: "0.8rem",
                color: "var(--color-text-muted, #555)",
              }}
            >
              {step.message}
            </p>
          ) : null}
          {step.last_error ? (
            <p
              style={{
                marginTop: "6px",
                fontSize: "0.8rem",
                color: "var(--color-status-error, #f87171)",
              }}
            >
              {step.last_error}
            </p>
          ) : null}
          {step.external_id ? (
            <p
              style={{
                marginTop: "6px",
                fontSize: "0.75rem",
                fontFamily: "monospace",
                color: "var(--color-text-muted, #555)",
              }}
            >
              ID: {step.external_id}
            </p>
          ) : null}
        </Card>
      ))}
      {inputPrompt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            padding: "16px",
          }}
          onClick={() => setInputPrompt(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              backgroundColor: colors.bg.card,
              border: `1px solid ${colors.border.subtle}`,
              borderRadius: radius.lg,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
              {inputPrompt.title}
            </h3>
            <Input
              label={inputPrompt.label}
              autoFocus
              value={inputPrompt.value}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setInputPrompt({ ...inputPrompt, value: e.target.value })
              }
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") submitInputPrompt();
                if (e.key === "Escape") setInputPrompt(null);
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <Button variant="secondary" onClick={() => setInputPrompt(null)}>
                Mégse
              </Button>
              <Button
                variant="primary"
                onClick={submitInputPrompt}
                disabled={inputPrompt.required && !inputPrompt.value.trim()}
              >
                {inputPrompt.action === "skip" ? "Kihagyás" : "Adoptálás"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
