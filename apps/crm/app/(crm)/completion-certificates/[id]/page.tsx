"use client";

import {
  PageHeader,
  Card,
  Button,
  Input,
  Textarea,
  Badge,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/ui";
import type { CompletionCertificate, CompletionCertificateStatus } from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

function parseCc(raw: unknown): CompletionCertificate {
  const r = raw as Record<string, unknown>;
  return {
    ...(r as unknown as CompletionCertificate),
    work_period_start: r.work_period_start ? new Date(String(r.work_period_start)) : null,
    work_period_end: r.work_period_end ? new Date(String(r.work_period_end)) : null,
    signed_at: r.signed_at ? new Date(String(r.signed_at)) : null,
    created_at: new Date(String(r.created_at)),
    updated_at: new Date(String(r.updated_at)),
  };
}

const statusLabel: Record<CompletionCertificateStatus, string> = {
  draft: "Piszkozat",
  sent: "Kiküldve",
  accepted: "Elfogadva",
  rejected: "Elutasítva",
};

export default function CompletionCertificateFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "new";

  const [doc, setDoc] = useState<CompletionCertificate | null>(null);
  const [title, setTitle] = useState("");
  const [workSummary, setWorkSummary] = useState("");
  const [status, setStatus] = useState<CompletionCertificateStatus>("draft");
  const [clientName, setClientName] = useState("");
  const [totalHours, setTotalHours] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    const ac = new AbortController();
    (async () => {
      try {
        const raw = await apiJson<unknown>(`/api/completion-certificates/${id}`, {
          signal: ac.signal,
        });
        const c = parseCc(raw);
        setDoc(c);
        setTitle(c.title);
        setWorkSummary(c.work_summary);
        setStatus(c.status);
        setClientName(c.client_name ?? "");
        setTotalHours(c.total_hours != null ? String(c.total_hours) : "");
        setPeriodStart(
          c.work_period_start ? c.work_period_start.toISOString().slice(0, 10) : "",
        );
        setPeriodEnd(
          c.work_period_end ? c.work_period_end.toISOString().slice(0, 10) : "",
        );
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) setLoadErr("Az igazolás nem tölthető be.");
      }
    })();
    return () => ac.abort();
  }, [id, isNew]);

  const save = async () => {
    if (isNew) {
      if (!title.trim() || !workSummary.trim()) {
        setLoadErr("Cím és összefoglaló kötelező.");
        return;
      }
      setSaving(true);
      setLoadErr(null);
      try {
        const created = await apiJsonBody<Record<string, unknown>>(
          "/api/completion-certificates",
          "POST",
          {
            title: title.trim(),
            work_summary: workSummary.trim(),
            status: "draft",
            total_hours: totalHours.trim() === "" ? null : Number.parseFloat(totalHours),
            work_period_start: periodStart ? new Date(periodStart) : null,
            work_period_end: periodEnd ? new Date(periodEnd) : null,
          },
        );
        router.replace(`/completion-certificates/${String(created._id)}`);
      } catch (e) {
        setLoadErr(e instanceof ApiError ? e.message : "Mentés sikertelen.");
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    setLoadErr(null);
    try {
      const raw = await apiJsonBody<unknown>(
        `/api/completion-certificates/${id}`,
        "PATCH",
        {
          title: title.trim(),
          work_summary: workSummary.trim(),
          status,
          client_name: clientName.trim() || null,
          total_hours: totalHours.trim() === "" ? null : Number.parseFloat(totalHours),
          work_period_start: periodStart ? new Date(periodStart) : null,
          work_period_end: periodEnd ? new Date(periodEnd) : null,
        },
      );
      setDoc(parseCc(raw));
    } catch (e) {
      setLoadErr(e instanceof ApiError ? e.message : "Mentés sikertelen.");
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && !doc && !loadErr) {
    return <div className="p-6 text-[var(--color-text-muted)]">Betöltés…</div>;
  }
  if (!isNew && loadErr && !doc) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-[var(--color-status-error)]">{loadErr}</p>
        <Button
          variant="secondary"
          onClick={() => router.push("/completion-certificates")}
        >
          Vissza
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <PageHeader
        title={
          isNew
            ? "Új teljesítési igazolás"
            : doc
              ? doc.certificate_number
              : "Teljesítési igazolás"
        }
        subtitle="Szerződések és projektek lezárása"
        actions={
          <Button
            variant="secondary"
            onClick={() => router.push("/completion-certificates")}
          >
            Vissza
          </Button>
        }
      />
      {loadErr && (
        <p className="text-sm text-[var(--color-status-error)]" role="alert">
          {loadErr}
        </p>
      )}
      {!isNew && doc && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-text-muted)]">Állapot:</span>
          <Badge variant="default">{statusLabel[doc.status]}</Badge>
        </div>
      )}

      <Card className="p-6 space-y-4">
        <Input label="Cím *" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea
          label="Munka összefoglalója *"
          value={workSummary}
          onChange={(e) => setWorkSummary(e.target.value)}
          rows={5}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="date"
            label="Munkaidőszak kezdete"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
          />
          <Input
            type="date"
            label="Munkaidőszak vége"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
          />
        </div>
        <Input
          label="Összesített órák (opcionális)"
          value={totalHours}
          onChange={(e) => setTotalHours(e.target.value)}
          inputMode="decimal"
        />
        {!isNew && (
          <>
            <div className="space-y-2">
              <Label>Státusz</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as CompletionCertificateStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(statusLabel) as CompletionCertificateStatus[]).map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel[s]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <Input
              label="Ügyfél aláíró neve"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </>
        )}
        <Button variant="primary" disabled={saving} onClick={() => void save()}>
          {saving ? "Mentés…" : isNew ? "Létrehozás" : "Mentés"}
        </Button>
      </Card>
    </div>
  );
}
