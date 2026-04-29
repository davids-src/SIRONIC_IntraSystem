"use client";

import { PageHeader, Card, Badge, Button, Input } from "@crm/ui";
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

// Hardcoded single ticket for UI demo
const mockTicket: Ticket = {
  _id: "t1",
  ticket_number: "TK-000001",
  tenantId: "tenant1",
  organization_id: "Acme Kft.",
  project_id: null,
  created_by: "user1",
  assigned_to: "Kovács János",
  source: "partner_portal",
  type: "incident",
  priority: "high",
  status: "new",
  title: "Szerver leállás a központi irodában",
  description:
    "A központi fájlszerver nem elérhető tegnap este óta. A belső hálózat megszakadt, senki nem éri el a megosztott meghajtókat.",
  location: "Központi iroda, 1054 Budapest",
  affected_system: "Szerver",
  affected_devices: ["SRV-01 (Main File Server)", "SW-04 (Core Switch)"],
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
  sla_deadline: null,
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

export default function PartnerTicketDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const ticket = mockTicket; // In real app, fetch based on params.id

  const typeLabels: Record<string, string> = {
    incident: "Hibabejelentés",
    service_request: "Szervizigény",
    maintenance: "Karbantartás",
    security: "Biztonságtechnika",
  };

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
    <div className="space-y-6">
      <PageHeader
        title={`${ticket.ticket_number} - ${ticket.title}`}
        subtitle={`Beküldve: ${new Date(ticket.created_at).toLocaleString()}`}
        actions={
          <Button variant="secondary" onClick={() => router.push("/tickets")}>
            Vissza
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main Content) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 space-y-6">
            <div className="flex gap-2 flex-wrap">
              <Badge variant={statusColorMap[ticket.status]}>
                {statusLabels[ticket.status] || ticket.status}
              </Badge>
              <Badge variant={priorityColorMap[ticket.priority]}>
                {priorityLabels[ticket.priority] || ticket.priority}
              </Badge>
              <Badge variant="default">{typeLabels[ticket.type] || ticket.type}</Badge>
            </div>

            <div>
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                Leírás
              </h3>
              <p className="text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-bg-secondary)] p-4 rounded-md">
                {ticket.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="text-sm font-medium">{ticket.affected_system}</div>
              </div>
            </div>

            {ticket.affected_devices.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                  <ShieldAlert size={12} /> Érintett eszközök
                </div>
                <div className="flex gap-2 flex-wrap">
                  {ticket.affected_devices.map((dev) => (
                    <span key={dev} className="inline-flex">
                      <Badge variant="default">{dev}</Badge>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Timeline / Comments */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <MessageSquare size={18} />
              Üzenetek
            </h3>

            <div className="space-y-4">
              {publicComments.map((comment) => {
                const isSupport = comment.author_role === "crm_staff";
                return (
                  <Card
                    key={comment._id}
                    className={`p-4 ${isSupport ? "border-[var(--color-accent-primary)] border-opacity-30" : ""}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isSupport
                              ? "bg-[var(--color-accent-primary)] text-white"
                              : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                          }`}
                        >
                          {isSupport ? "SI" : "TE"}
                        </div>
                        <div>
                          <div
                            className={`text-sm font-medium ${isSupport ? "text-[var(--color-accent-primary)]" : ""}`}
                          >
                            {comment.author_id}
                          </div>
                          <div className="text-xs text-[var(--color-text-muted)]">
                            {new Date(comment.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-3">
                      {comment.message}
                    </p>
                  </Card>
                );
              })}

              {/* Add comment box */}
              {ticket.status !== "closed" && (
                <Card className="p-4 space-y-4">
                  <Input
                    label="Új üzenet írása"
                    placeholder="Írj választ a támogatásnak..."
                  />
                  <div className="flex justify-end items-center">
                    <Button variant="primary">
                      <Send size={16} className="mr-2" />
                      Küldés
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Controls) */}
        <div className="space-y-6">
          <Card className="p-5 space-y-5">
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

          <Card className="p-5 space-y-4">
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
