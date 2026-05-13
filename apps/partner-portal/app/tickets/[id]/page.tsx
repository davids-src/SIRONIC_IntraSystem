"use client";

import { PageHeader, Card, Badge, Button, Input, TextareaControl } from "@crm/ui";
import type { Ticket } from "@crm/types";
import {
  MessageSquare,
  Paperclip,
  MapPin,
  Server,
  ShieldAlert,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { use } from "react";

// Hardcoded single ticket for UI demo
const mockTicket: Ticket = {
  _id: "t1",
  ticket_number: "TK-000001",
  tenantId: "tenant1",
  contact_id: "org1",
  one_time_contact_name: null,
  one_time_contact_phone: null,
  project_id: null,
  created_by: "user1",
  assigned_to: "Kovács János",
  source: "partner_portal",
  category: "Hibabejelentés",
  priority: "high",
  status: "new",
  title: "Szerver leállás a központi irodában",
  description:
    "A központi fájlszerver nem elérhető tegnap este óta. A belső hálózat megszakadt, senki nem éri el a megosztott meghajtókat.",
  location: "Központi iroda, 1054 Budapest",
  affected_items: "SRV-01 (Main File Server), SW-04 (Core Switch)",
  attachments: [
    { filename: "error_log.txt", url: "#", size: 12400, uploaded_at: new Date() },
    { filename: "screenshot.png", url: "#", size: 1024000, uploaded_at: new Date() },
  ],
  comments: [
    {
      _id: "c1",
      author_id: "Saját felhasználó (Te)",
      author_role: "partner",
      message: "Kérlek, sürgősen nézzetek rá, leállt a munka!",
      is_internal: false,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      _id: "c2",
      author_id: "SIRONIC Support",
      author_role: "crm_staff",
      message:
        "Látom a hibát a monitorozó rendszerben. Valószínűleg a switch dobta el a kapcsolatot. Egy kolléga hamarosan indul a helyszínre.",
      is_internal: false, // Internal comment (c3) would be filtered out on the backend. This is a public response.
      created_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
    },
  ],
  resolution_notes: null,
  resolved_at: null,
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
  updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
};

const priorityColorMap: Record<
  string,
  "success" | "warning" | "error" | "info" | "default"
> = {
  low: "info",
  medium: "warning",
  high: "error",
  critical: "error",
};

const statusColorMap: Record<
  string,
  "success" | "warning" | "error" | "info" | "default"
> = {
  new: "info",
  in_progress: "warning",
  waiting: "default",
  resolved: "success",
  closed: "default",
};

export default function PartnerTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const ticket = mockTicket; // In real app, fetch based on use(params).id

  const priorityLabels: Record<string, string> = {
    low: "Alacsony",
    medium: "Közepes",
    high: "Magas",
    critical: "Kritikus",
  };

  const statusLabels: Record<string, string> = {
    new: "Új",
    in_progress: "Folyamatban",
    waiting: "Várakozás",
    resolved: "Megoldva",
    closed: "Lezárva",
  };

  // Partner specific filtering (would happen on backend in real app)
  const publicComments = ticket.comments.filter((c) => !c.is_internal);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${ticket.ticket_number} - ${ticket.title}`}
        subtitle={`Beküldve: ${new Date(ticket.created_at).toLocaleString()}`}
        actions={
          <Button variant="secondary" onClick={() => router.push("/tickets")}>
            Vissza
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Main Content) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-6">
            <div className="flex gap-2 flex-wrap">
              <Badge variant={statusColorMap[ticket.status]}>
                {statusLabels[ticket.status] || ticket.status}
              </Badge>
              <Badge variant={priorityColorMap[ticket.priority]}>
                {priorityLabels[ticket.priority] || ticket.priority}
              </Badge>
              <Badge variant="default">{ticket.category}</Badge>
            </div>

            <div>
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                Leírás
              </h3>
              <p className="text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-bg-secondary)]/50 p-6 border border-[var(--color-border-subtle)] backdrop-blur-sm shadow-sm rounded-lg rounded-md">
                {ticket.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                  <MapPin size={12} /> Helyszín
                </div>
                <div className="text-sm font-medium">{ticket.location}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                  <Server size={12} /> Érintett rendszer
                </div>
                <div className="text-sm font-medium">{ticket.affected_items ?? "-"}</div>
              </div>
            </div>

            {ticket.affected_items && (
              <div className="space-y-2">
                <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                  <ShieldAlert size={12} /> Érintett elemek
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="default">{ticket.affected_items}</Badge>
                </div>
              </div>
            )}
          </Card>

          {/* Timeline / Comments */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <MessageSquare size={18} />
              Üzenetek
            </h3>

            <div className="space-y-6">
              <div className="relative border-l-2 border-[var(--color-border-subtle)] ml-4 space-y-6 pb-4">
                {publicComments.map((comment) => {
                  const isSupport = comment.author_role === "crm_staff";
                  return (
                    <div key={comment._id} className="relative pl-6">
                      <div
                        className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm border-2 border-[var(--color-bg-primary)] ${
                          isSupport
                            ? "bg-[var(--color-accent-primary)] text-white"
                            : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                        }`}
                      >
                        {isSupport ? "SI" : "TE"}
                      </div>

                      <div
                        className={`p-4 rounded-xl shadow-sm ${
                          isSupport
                            ? "bg-[var(--color-accent-primary)]/5 border border-[var(--color-accent-primary)]/20"
                            : "bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span
                            className={`text-sm font-semibold ${isSupport ? "text-[var(--color-accent-primary)]" : "text-[var(--color-text-primary)]"}`}
                          >
                            {comment.author_id}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {new Date(comment.created_at).toLocaleString("hu-HU", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                          {comment.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add comment box */}
              {ticket.status !== "closed" && (
                <div className="border border-[var(--color-border-subtle)] rounded-xl overflow-hidden bg-[var(--color-bg-card)] focus-within:border-[var(--color-accent-primary)] focus-within:ring-1 focus-within:ring-[var(--color-accent-primary)] transition-all">
                  <TextareaControl
                    placeholder="Kérdezz, vagy írj választ a támogatásnak..."
                    className="min-h-[100px] w-full resize-y border-0 bg-transparent p-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
                  />
                  <div className="flex justify-end items-center bg-[var(--color-bg-secondary)] px-4 py-3 border-t border-[var(--color-border-subtle)]">
                    <Button variant="primary" className="py-1.5 px-4 text-sm">
                      <Send size={14} className="mr-2" />
                      Küldés
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Controls) */}
        <div className="space-y-8">
          <Card className="p-6 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Tulajdonságok
            </h3>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-[var(--color-border-subtle)]">
                <span className="text-[var(--color-text-muted)]">Állapot</span>
                <span className="font-medium">
                  {statusLabels[ticket.status] || ticket.status}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--color-border-subtle)]">
                <span className="text-[var(--color-text-muted)]">Kijelölt technikus</span>
                <span className="font-medium">
                  {ticket.assigned_to || "Nincs kijelölve"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[var(--color-text-muted)]">Beküldve</span>
                <span className="font-medium">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center justify-between">
              Csatolmányok
              <Badge variant="default">{ticket.attachments.length}</Badge>
            </h3>

            {ticket.attachments.length > 0 ? (
              <div className="space-y-2">
                {ticket.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-[var(--color-bg-secondary)] transition-colors border border-transparent hover:border-[var(--color-border-subtle)]"
                  >
                    <div className="bg-[var(--color-bg-primary)] p-2 rounded text-[var(--color-text-muted)]">
                      <Paperclip size={16} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="text-sm font-medium truncate">{att.filename}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {(att.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[var(--color-text-muted)] text-center py-4">
                Nincs csatolmány
              </div>
            )}

            {ticket.status !== "closed" && (
              <Button
                variant="ghost"
                className="w-full border border-dashed border-[var(--color-border-default)]"
              >
                + Új fájl feltöltése
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
