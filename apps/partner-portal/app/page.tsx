"use client";

import { Card, Button } from "@crm/ui";
import { apiJson } from "@/lib/api-client";
import { parseContract, parseProject, parseTicket } from "@/lib/entity-parsers";
import type { Contract, Project, Ticket } from "@crm/types";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Ticket as TicketIcon,
  FileText,
  FileSignature,
  ClipboardList,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function PortalDashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [p, t, c, inv] = await Promise.all([
          apiJson<unknown[]>("/api/projects", { signal: ac.signal }),
          apiJson<unknown[]>("/api/tickets", { signal: ac.signal }),
          apiJson<unknown[]>("/api/contracts", { signal: ac.signal }),
          apiJson<unknown[]>("/api/invoices", { signal: ac.signal }),
        ]);
        setProjects(p.map(parseProject));
        setTickets(t.map(parseTicket));
        setContracts(c.map(parseContract));
        setInvoiceCount(inv.length);
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) setLoadErr("A vezérlőpult adatai nem tölthetők be.");
      }
    })();
    return () => ac.abort();
  }, []);

  const activeProjects = projects.filter((p) => p.status === "open").length;
  const openTickets = tickets.filter(
    (x) => x.status !== "closed" && x.status !== "resolved",
  ).length;
  const pendingInvoices = invoiceCount;
  const pendingContracts = contracts.filter((x) => x.status === "sent").length;

  const stats = [
    {
      label: "Aktív projektek",
      value: String(activeProjects),
      icon: <FolderKanban size={20} />,
      color: "#8b5cf6",
      bg: "rgba(139,92,246,0.08)",
      link: "/projects",
    },
    {
      label: "Nyitott ticketek",
      value: String(openTickets),
      icon: <TicketIcon size={20} />,
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.08)",
      link: "/tickets",
    },
    {
      label: "Számlák (összes)",
      value: String(pendingInvoices),
      icon: <FileText size={20} />,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
      link: "/invoices",
    },
    {
      label: "Aláírásra váró szerződés",
      value: String(pendingContracts),
      icon: <FileSignature size={20} />,
      color: "#e53935",
      bg: "rgba(229,57,53,0.08)",
      link: "/contracts",
    },
  ];

  const recentTickets = [...tickets]
    .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 min-w-0">
        <h1 className="text-2xl font-bold text-white truncate">Vezérlőpult</h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Összefoglaló a legutóbbi adatokból.
        </p>
      </div>

      {loadErr && (
        <p className="text-sm text-red-400 px-1" role="alert">
          {loadErr}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={() => router.push(stat.link)}
            className="rounded-xl border p-5 flex items-center gap-4 text-left w-full transition-colors"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
              cursor: "pointer",
            }}
          >
            <div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: stat.bg, color: stat.color }}
            >
              {stat.icon}
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              <span
                className="text-sm truncate"
                style={{ color: "var(--color-text-muted)" }}
              >
                {stat.label}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)]">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
            Legutóbbi ticketek
          </h2>
          <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
            {recentTickets.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] py-2">Nincs ticket.</p>
            ) : (
              recentTickets.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className="flex items-center gap-3 py-3 text-left w-full"
                  onClick={() => router.push(`/tickets/${item._id}`)}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                    <TicketIcon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {item.ticket_number} · {item.status}
                    </p>
                  </div>
                  <Clock size={14} className="text-[var(--color-text-muted)] shrink-0" />
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6 border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)]">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
            Gyors linkek
          </h2>
          <div className="flex flex-col gap-2">
            {[
              { href: "/worklogs", label: "Munkalapok" },
              { href: "/completion-certificates", label: "Teljesítési igazolások" },
              { href: "/offers", label: "Ajánlatok" },
              { href: "/inventory", label: "Leltár" },
            ].map((l) => (
              <Button
                key={l.href}
                variant="secondary"
                className="justify-between"
                onClick={() => router.push(l.href)}
              >
                {l.label}
                <ArrowRight size={16} />
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
