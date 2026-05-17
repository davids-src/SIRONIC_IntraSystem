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

  // Import states
  const [sourceType, setSourceType] = useState<"offer" | "worklog" | "project" | "none">(
    "none",
  );
  const [sourceId, setSourceId] = useState("");
  const [sourceList, setSourceList] = useState<
    { id: string; label: string; data: any }[]
  >([]);
  const [loadingSource, setLoadingSource] = useState(false);

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
            offer_id: sourceType === "offer" ? sourceId : null,
            worklog_ids: sourceType === "worklog" ? [sourceId] : [],
            project_id: sourceType === "project" ? sourceId : null,
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

  const handleSourceTypeChange = async (type: string) => {
    setSourceType(type as any);
    setSourceId("");
    if (type === "none") {
      setSourceList([]);
      return;
    }
    setLoadingSource(true);
    try {
      if (type === "offer") {
        const res = await apiJson<any[]>("/api/offers");
        setSourceList(
          res.map((r) => ({
            id: r._id,
            label: `${r.offer_number} - ${r.title}`,
            data: r,
          })),
        );
      } else if (type === "worklog") {
        const res = await apiJson<any[]>("/api/worklogs");
        setSourceList(
          res.map((r) => ({
            id: r._id,
            label: `${r.worklog_number} - ${r.work_category}`,
            data: r,
          })),
        );
      } else if (type === "project") {
        const res = await apiJson<any[]>("/api/projects");
        setSourceList(
          res.map((r) => ({
            id: r._id,
            label: `${r.project_number} - ${r.name}`,
            data: r,
          })),
        );
      }
    } catch (e) {
      setLoadErr("Források betöltése sikertelen.");
    } finally {
      setLoadingSource(false);
    }
  };

  const handleImport = () => {
    if (!sourceId || sourceType === "none") return;
    const selected = sourceList.find((s) => s.id === sourceId)?.data;
    if (!selected) return;

    if (sourceType === "offer") {
      setTitle(`Teljesítési igazolás - ${selected.offer_number}`);
      const summary = selected.lines
        .map((l: any) => `- ${l.description} (${l.quantity} ${l.unit})`)
        .join("\n");
      setWorkSummary(`Elvégzett feladatok és tételek az ajánlat alapján:\n\n${summary}`);
    } else if (sourceType === "worklog") {
      setTitle(`Teljesítési igazolás - ${selected.worklog_number}`);
      const summary = selected.items
        .map((l: any) => `- ${l.description} (${l.quantity} ${l.unit})`)
        .join("\n");
      setWorkSummary(
        `Elvégzett munka (${new Date(selected.work_date).toLocaleDateString()}):\n${selected.work_description}\n\nFelhasznált anyagok:\n${summary}`,
      );
      if (selected.contact_id) setClientName(selected.client_name || ""); // Optionally pre-fill
      if (selected.work_date) setPeriodStart(selected.work_date.substring(0, 10));
    } else if (sourceType === "project") {
      setTitle(`Teljesítési igazolás - ${selected.project_number}`);
      const tasks =
        selected.tasks?.map((t: any) => `- ${t.title} (${t.status})`).join("\n") || "";
      setWorkSummary(`Projekt: ${selected.name}\n\nProjekt feladatok:\n${tasks}`);
      if (selected.start_date) setPeriodStart(selected.start_date.substring(0, 10));
      if (selected.end_date) setPeriodEnd(selected.end_date.substring(0, 10));
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

      {isNew && (
        <Card className="p-6 bg-blue-50/50 border-blue-100">
          <h3 className="text-sm font-bold text-blue-900 mb-4">
            Adatok importálása meglévő forrásból (Opcionális)
          </h3>
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <Label>Forrás típusa</Label>
              <Select value={sourceType} onValueChange={handleSourceTypeChange}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Ne importáljon --</SelectItem>
                  <SelectItem value="offer">Ajánlat</SelectItem>
                  <SelectItem value="worklog">Munkalap</SelectItem>
                  <SelectItem value="project">Projekt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {sourceType !== "none" && (
              <div className="flex flex-col gap-2 flex-1">
                <Label>Válassz dokumentumot</Label>
                <Select
                  value={sourceId}
                  onValueChange={setSourceId}
                  disabled={loadingSource}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue
                      placeholder={loadingSource ? "Betöltés..." : "Válassz..."}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              variant="secondary"
              onClick={handleImport}
              disabled={sourceType === "none" || !sourceId}
            >
              Importálás
            </Button>
          </div>
        </Card>
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
