"use client";

import { use } from "react";
import { PageHeader, Card, Badge, Button, Input } from "@crm/ui";
import { useRouter } from "next/navigation";
import type { Ticket, TicketComment } from "@crm/types";
import {
  MessageSquare,
  Paperclip,
  Clock,
  User,
  MapPin,
  Server,
  CheckCircle2,
  ShieldAlert,
  FileText,
  BadgeCheck,
  Send,
} from "lucide-react";

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
  assigned_to: "Kovács János (Admin)",
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
      author_id: "user1",
      author_role: "partner",
      message: "Kérlek, sürgősen nézzetek rá, leállt a munka!",
      is_internal: false,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      _id: "c2",
      author_id: "staff1",
      author_role: "crm_staff",
      message:
        "Látom a hibát a monitorozó rendszerben. Valószínűleg a switch dobta el a kapcsolatot. Egy kolléga hamarosan indul a helyszínre.",
      is_internal: true, // This is an internal note
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

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${ticket.ticket_number} - ${ticket.title}`}
        subtitle={`Beküldve: ${new Date(ticket.created_at).toLocaleString()} | Kontakt: ${ticket.contact_id ?? "-"}`}
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
              Aktivitás és hozzászólások
            </h3>

            <div className="space-y-6">
              <div className="relative border-l-2 border-[var(--color-border-subtle)] ml-4 space-y-6 pb-4">
                {ticket.comments.map((comment, index) => {
                  const isStaff = comment.author_role === "crm_staff";
                  const isInternal = comment.is_internal;
                  return (
                    <div key={comment._id} className="relative pl-6">
                      <div
                        className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm border-2 border-[var(--color-bg-primary)] ${
                          isStaff
                            ? "bg-[var(--color-accent-primary)] text-white"
                            : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                        }`}
                      >
                        {comment.author_id.substring(0, 2).toUpperCase()}
                      </div>

                      <div
                        className={`p-4 rounded-xl shadow-sm ${
                          isInternal
                            ? "bg-[var(--color-status-warning)]/10 border border-[var(--color-status-warning)]/20"
                            : "bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-semibold ${isStaff ? "text-[var(--color-accent-primary)]" : "text-[var(--color-text-primary)]"}`}
                            >
                              {comment.author_id}
                            </span>
                            {isInternal && (
                              <Badge variant="warning">Belső megjegyzés</Badge>
                            )}
                          </div>
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
              <div className="border border-[var(--color-border-subtle)] rounded-xl overflow-hidden bg-[var(--color-bg-card)] focus-within:border-[var(--color-accent-primary)] focus-within:ring-1 focus-within:ring-[var(--color-accent-primary)] transition-all">
                <textarea
                  placeholder="Írd le a fejleményeket vagy válaszolj az ügyfélnek..."
                  className="w-full bg-transparent border-none p-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none min-h-[100px] resize-y"
                />
                <div className="flex justify-between items-center bg-[var(--color-bg-secondary)] px-4 py-3 border-t border-[var(--color-border-subtle)]">
                  <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-primary)] transition-colors">
                    <input
                      type="checkbox"
                      className="rounded border-[var(--color-border-default)] accent-[var(--color-accent-primary)] w-3.5 h-3.5"
                    />
                    Belső megjegyzés (Csak munkatársak látják)
                  </label>
                  <Button variant="primary" className="py-1.5 px-4 text-sm">
                    <Send size={14} className="mr-2" />
                    Küldés
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Controls) */}
        <div className="space-y-8">
          <Card className="p-6 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Tulajdonságok
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                  Állapot
                </label>
                <select className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)]">
                  <option value="new">Új</option>
                  <option value="in_progress">Folyamatban</option>
                  <option value="waiting">Várakozás</option>
                  <option value="resolved">Megoldva</option>
                  <option value="closed">Lezárva</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                  Felelős
                </label>
                <select className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)]">
                  <option value="">Nincs kiosztva</option>
                  <option value="staff1">Kovács János</option>
                  <option value="staff2">Nagy Péter</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                  Prioritás
                </label>
                <select className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)]">
                  <option value="low">Alacsony</option>
                  <option value="medium">Közepes</option>
                  <option value="high">Magas</option>
                  <option value="critical">Kritikus</option>
                </select>
              </div>

              {/* SLA / further metadata is operator-driven and optional */}
            </div>
          </Card>

          <Card className="p-6 shadow-sm border border-[var(--color-border-subtle)] rounded-xl space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Kapcsolódó dokumentumok
            </h3>

            <div className="space-y-2">
              <Button variant="secondary" className="w-full justify-start">
                <FileText size={16} className="mr-2 text-[var(--color-text-muted)]" />
                Munkalap létrehozása
              </Button>
              <Button variant="secondary" className="w-full justify-start">
                <BadgeCheck size={16} className="mr-2 text-[var(--color-text-muted)]" />
                Teljesítési igazoláshoz adás
              </Button>
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

            <Button
              variant="ghost"
              className="w-full border border-dashed border-[var(--color-border-default)]"
            >
              + Új fájl feltöltése
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
