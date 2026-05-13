"use client";

import { PageHeader, Card, Badge, Button } from "@crm/ui";
import type { Contract } from "@crm/types";
import { apiJson } from "@/lib/api-client";
import { parseContract } from "@/lib/entity-parsers";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

const statusLabel: Record<Contract["status"], string> = {
  draft: "Piszkozat",
  sent: "Aláírásra vár",
  signed_digital: "Aláírva (digitális)",
  signed_paper: "Aláírva (papír)",
  cancelled: "Törölve",
};

export default function PartnerContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [c, setC] = useState<Contract | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const raw = await apiJson<unknown>(`/api/contracts/${id}`, { signal: ac.signal });
        setC(parseContract(raw));
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) setLoadErr("A szerződés nem elérhető.");
      }
    })();
    return () => ac.abort();
  }, [id]);

  if (!c && !loadErr) {
    return <div className="p-6 text-[var(--color-text-muted)]">Betöltés…</div>;
  }
  if (loadErr && !c) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-red-400">{loadErr}</p>
        <Button variant="secondary" onClick={() => router.push("/contracts")}>
          Vissza
        </Button>
      </div>
    );
  }
  if (!c) return null;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <PageHeader
        title={`${c.contract_number} — ${c.name}`}
        subtitle={c.category}
        actions={
          <Button variant="secondary" onClick={() => router.push("/contracts")}>
            Vissza
          </Button>
        }
      />
      <Badge variant="default">{statusLabel[c.status]}</Badge>
      {c.body ? (
        <Card className="p-6 prose prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: c.body }} />
        </Card>
      ) : (
        <Card className="p-6 text-[var(--color-text-muted)]">
          Nincs megjeleníthető szöveges törzs. PDF:{" "}
          {c.pdf_url ? (
            <a href={c.pdf_url} className="text-[var(--color-accent-primary)] underline">
              letöltés
            </a>
          ) : (
            "—"
          )}
        </Card>
      )}
    </div>
  );
}
