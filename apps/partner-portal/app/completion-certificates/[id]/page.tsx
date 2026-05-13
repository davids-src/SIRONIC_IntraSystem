"use client";

import { PageHeader, Card, Badge, Button } from "@crm/ui";
import type { CompletionCertificate } from "@crm/types";
import { apiJson } from "@/lib/api-client";
import { parseCompletionCertificate } from "@/lib/entity-parsers";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

const statusLabel: Record<CompletionCertificate["status"], string> = {
  draft: "Piszkozat",
  sent: "Aláírásra vár",
  accepted: "Elfogadva",
  rejected: "Elutasítva",
};

export default function PartnerCompletionCertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [doc, setDoc] = useState<CompletionCertificate | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const raw = await apiJson<unknown>(`/api/completion-certificates/${id}`, {
          signal: ac.signal,
        });
        setDoc(parseCompletionCertificate(raw));
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) setLoadErr("Az igazolás nem elérhető.");
      }
    })();
    return () => ac.abort();
  }, [id]);

  if (!doc && !loadErr) {
    return <div className="p-6 text-[var(--color-text-muted)]">Betöltés…</div>;
  }
  if (loadErr && !doc) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-red-400">{loadErr}</p>
        <Button
          variant="secondary"
          onClick={() => router.push("/completion-certificates")}
        >
          Vissza
        </Button>
      </div>
    );
  }
  if (!doc) return null;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <PageHeader
        title={`${doc.certificate_number} — ${doc.title}`}
        subtitle="Teljesítési igazolás"
        actions={
          <Button
            variant="secondary"
            onClick={() => router.push("/completion-certificates")}
          >
            Vissza
          </Button>
        }
      />
      <Badge variant="default">{statusLabel[doc.status]}</Badge>
      <Card className="p-6 space-y-3">
        <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">
          {doc.work_summary}
        </p>
      </Card>
    </div>
  );
}
