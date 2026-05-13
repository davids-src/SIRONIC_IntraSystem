"use client";

import { PageHeader, Card, Badge, Button } from "@crm/ui";
import type { Worklog } from "@crm/types";
import { apiJson } from "@/lib/api-client";
import { parseWorklog } from "@/lib/entity-parsers";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

export default function PartnerWorklogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [wl, setWl] = useState<Worklog | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const raw = await apiJson<unknown>(`/api/worklogs/${id}`, { signal: ac.signal });
        setWl(parseWorklog(raw));
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) setLoadErr("A munkalap nem elérhető.");
      }
    })();
    return () => ac.abort();
  }, [id]);

  if (!wl && !loadErr) {
    return <div className="p-6 text-[var(--color-text-muted)]">Betöltés…</div>;
  }
  if (loadErr && !wl) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-red-400">{loadErr}</p>
        <Button variant="secondary" onClick={() => router.push("/worklogs")}>
          Vissza
        </Button>
      </div>
    );
  }
  if (!wl) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={wl.worklog_number}
        subtitle={`${wl.work_category} — ${wl.work_date.toLocaleDateString("hu-HU")}`}
        actions={
          <Button variant="secondary" onClick={() => router.push("/worklogs")}>
            Vissza
          </Button>
        }
      />
      <Badge variant={wl.status === "finalized" ? "success" : "default"}>
        {wl.status === "finalized" ? "Véglegesített" : "Piszkozat"}
      </Badge>
      <Card className="p-6 space-y-3">
        <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">
          {wl.work_description}
        </p>
        {wl.site_address && (
          <p className="text-xs text-[var(--color-text-muted)]">
            Helyszín: {wl.site_address}
          </p>
        )}
      </Card>
    </div>
  );
}
