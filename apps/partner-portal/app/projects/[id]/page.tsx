"use client";

import { PageHeader, Card, Badge, Button } from "@crm/ui";
import type { Project } from "@crm/types";
import { apiJson } from "@/lib/api-client";
import { parseProject } from "@/lib/entity-parsers";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

const statusLabel: Record<Project["status"], string> = {
  open: "Nyitott",
  on_hold: "Szüneteltetve",
  closed: "Lezárva",
};

export default function PartnerProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const raw = await apiJson<unknown>(`/api/projects/${id}`, { signal: ac.signal });
        setProject(parseProject(raw));
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) setLoadErr("A projekt nem elérhető.");
      }
    })();
    return () => ac.abort();
  }, [id]);

  if (!project && !loadErr) {
    return <div className="p-6 text-[var(--color-text-muted)]">Betöltés…</div>;
  }
  if (loadErr && !project) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-red-400">{loadErr}</p>
        <Button variant="secondary" onClick={() => router.push("/projects")}>
          Vissza
        </Button>
      </div>
    );
  }
  if (!project) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${project.project_number} — ${project.name}`}
        subtitle={project.description}
        actions={
          <Button variant="secondary" onClick={() => router.push("/projects")}>
            Vissza
          </Button>
        }
      />
      <div className="flex gap-2 flex-wrap">
        <Badge variant="default">{statusLabel[project.status]}</Badge>
        {project.category && <Badge variant="default">{project.category}</Badge>}
      </div>
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase text-[var(--color-text-muted)]">
          Fázisok
        </h3>
        <ul className="space-y-2 text-sm">
          {project.phases?.length ? (
            project.phases.map((ph, i) => (
              <li
                key={i}
                className="flex justify-between border-b border-[var(--color-border-subtle)] py-2"
              >
                <span>{ph.name}</span>
                <span className="text-[var(--color-text-muted)]">{ph.status}</span>
              </li>
            ))
          ) : (
            <li className="text-[var(--color-text-muted)]">Nincs megadott fázis.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
