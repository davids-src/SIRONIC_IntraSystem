"use client";

import { use, useState } from "react";
import { Badge, Button } from "@crm/ui";
import { useRouter } from "next/navigation";
import type { Ticket } from "@crm/types";
import {
  MessageSquare,
  Paperclip,
  MapPin,
  Server,
  ShieldAlert,
  FileText,
  BadgeCheck,
  Send,
  ArrowLeft,
  Clock,
  User,
  ChevronRight,
  Download,
} from "lucide-react";
import Link from "next/link";

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
      is_internal: true,
      created_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
    },
  ],
  resolution_notes: null,
  resolved_at: null,
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
  updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
};

const priorityVariant = {
  low: "info",
  medium: "warning",
  high: "error",
  critical: "error",
} as const;
const priorityLabel = {
  low: "Alacsony",
  medium: "Közepes",
  high: "Magas",
  critical: "Kritikus",
} as const;
const statusVariant = {
  new: "info",
  in_progress: "warning",
  waiting: "default",
  resolved: "success",
  closed: "default",
} as const;
const statusLabel = {
  new: "Új",
  in_progress: "Folyamatban",
  waiting: "Várakozás",
  resolved: "Megoldva",
  closed: "Lezárva",
} as const;

const card = {
  background: "var(--color-bg-card)",
  border: "1px solid var(--color-border-subtle)",
  borderRadius: "12px",
};

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const ticket = { ...mockTicket, _id: id };

  const [commentText, setCommentText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [status, setStatus] = useState(ticket.status);
  const [assignedTo, setAssignedTo] = useState(ticket.assigned_to ?? "");
  const [priority, setPriority] = useState(ticket.priority);

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleString("hu-HU", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => router.push("/tickets")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-muted)",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.875rem",
            width: "fit-content",
          }}
        >
          <ArrowLeft size={14} /> Vissza a ticketekhez
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}
          >
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <Badge
                variant={
                  statusVariant[ticket.status as keyof typeof statusVariant] ?? "default"
                }
              >
                {statusLabel[ticket.status as keyof typeof statusLabel] ?? ticket.status}
              </Badge>
              <Badge
                variant={
                  priorityVariant[ticket.priority as keyof typeof priorityVariant] ??
                  "default"
                }
              >
                {priorityLabel[ticket.priority as keyof typeof priorityLabel] ??
                  ticket.priority}
              </Badge>
              <Badge variant="default">{ticket.category}</Badge>
            </div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "var(--color-text-primary)",
                margin: 0,
              }}
            >
              {ticket.ticket_number} – {ticket.title}
            </h1>
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                flexWrap: "wrap",
                fontSize: "0.875rem",
                color: "var(--color-text-muted)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Clock size={13} /> Beküldve: {fmtDate(ticket.created_at)}
              </span>
              <span>·</span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <User size={13} /> Kontakt: {ticket.contact_id ?? "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}
        className="lg:two-col-grid"
      >
        <style>{`
          @media (min-width: 1024px) {
            .lg\\:two-col-grid {
              grid-template-columns: 1fr 320px !important;
            }
          }
        `}</style>

        {/* LEFT — main content */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}
        >
          {/* Description card */}
          <div
            style={{
              ...card,
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <h3
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--color-text-muted)",
                margin: 0,
              }}
            >
              Leírás
            </h3>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--color-text-primary)",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {ticket.description}
            </p>

            {(ticket.location || ticket.affected_items) && (
              <div
                style={{
                  paddingTop: "16px",
                  borderTop: "1px solid var(--color-border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {ticket.location && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <MapPin
                      size={15}
                      style={{
                        color: "var(--color-text-muted)",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    />
                    <span
                      style={{ fontSize: "0.875rem", color: "var(--color-text-primary)" }}
                    >
                      {ticket.location}
                    </span>
                  </div>
                )}
                {ticket.affected_items && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <Server
                      size={15}
                      style={{
                        color: "var(--color-text-muted)",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    />
                    <span
                      style={{ fontSize: "0.875rem", color: "var(--color-text-primary)" }}
                    >
                      {ticket.affected_items}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity / Comments card */}
          <div style={{ ...card, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid var(--color-border-subtle)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <MessageSquare size={16} style={{ color: "var(--color-text-muted)" }} />
              <h3
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--color-text-muted)",
                  margin: 0,
                }}
              >
                Aktivitás és hozzászólások
              </h3>
            </div>

            {/* Comment list — timeline */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {ticket.comments.map((comment) => {
                const isStaff = comment.author_role === "crm_staff";
                return (
                  <div
                    key={comment._id}
                    style={{
                      display: "flex",
                      gap: "16px",
                      padding: "16px 24px",
                      borderBottom: "1px solid var(--color-border-subtle)",
                      background: comment.is_internal
                        ? "rgba(245,158,11,0.05)"
                        : "transparent",
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        background: isStaff
                          ? "var(--color-accent-primary)"
                          : "var(--color-bg-secondary)",
                        color: isStaff ? "#fff" : "var(--color-text-primary)",
                        marginTop: "2px",
                      }}
                    >
                      {comment.author_id.slice(0, 2).toUpperCase()}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            color: isStaff
                              ? "var(--color-accent-primary)"
                              : "var(--color-text-primary)",
                          }}
                        >
                          {comment.author_id}
                        </span>
                        {comment.is_internal && (
                          <Badge variant="warning">Belső megjegyzés</Badge>
                        )}
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--color-text-muted)",
                            marginLeft: "auto",
                          }}
                        >
                          {fmtDate(comment.created_at)}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--color-text-secondary)",
                          lineHeight: 1.6,
                          margin: 0,
                        }}
                      >
                        {comment.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comment input */}
            <div
              style={{
                padding: "16px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Írj megjegyzést vagy frissítsd az ügyfelet..."
                style={{
                  width: "100%",
                  minHeight: "80px",
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border-default)",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "0.875rem",
                  color: "var(--color-text-primary)",
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    style={{
                      width: "14px",
                      height: "14px",
                      accentColor: "var(--color-accent-primary)",
                    }}
                  />
                  Belső megjegyzés (csak munkatársak látják)
                </label>
                <Button variant="primary">
                  <Send size={14} style={{ marginRight: "6px" }} />
                  Küldés
                </Button>
              </div>
            </div>
          </div>

          {/* Attachments card */}
          <div
            style={{
              ...card,
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--color-text-muted)",
                  margin: 0,
                }}
              >
                Csatolmányok
                {ticket.attachments.length > 0 && (
                  <span
                    style={{ marginLeft: "8px", color: "var(--color-accent-primary)" }}
                  >
                    {ticket.attachments.length}
                  </span>
                )}
              </h3>
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  color: "var(--color-accent-primary)",
                  padding: 0,
                }}
              >
                + Csatolás
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {ticket.attachments.map((att, idx) => (
                <a
                  key={idx}
                  href={att.url}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    borderRadius: "8px",
                    background: "var(--color-bg-secondary)",
                    textDecoration: "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--color-bg-card-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "var(--color-bg-secondary)")
                  }
                >
                  <Paperclip
                    size={15}
                    style={{ color: "var(--color-text-muted)", flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--color-text-primary)",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {att.filename}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    {(att.size / 1024).toFixed(1)} KB
                  </span>
                  <Download
                    size={14}
                    style={{ color: "var(--color-text-muted)", flexShrink: 0 }}
                  />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — properties sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Properties card */}
          <div
            style={{
              ...card,
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <h3
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--color-text-muted)",
                margin: 0,
              }}
            >
              Tulajdonságok
            </h3>

            {[
              {
                label: "Állapot",
                value: status,
                onChange: (v: string) => setStatus(v as any),
                options: Object.entries(statusLabel).map(([k, v]) => ({
                  value: k,
                  label: v,
                })),
              },
              {
                label: "Felelős",
                value: assignedTo,
                onChange: (v: string) => setAssignedTo(v),
                options: [
                  { value: "", label: "Nincs kiosztva" },
                  { value: "staff1", label: "Kovács János" },
                  { value: "staff2", label: "Nagy Péter" },
                ],
              },
              {
                label: "Prioritás",
                value: priority,
                onChange: (v: string) => setPriority(v as any),
                options: Object.entries(priorityLabel).map(([k, v]) => ({
                  value: k,
                  label: v,
                })),
              },
            ].map(({ label, value, onChange, options }) => (
              <div
                key={label}
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <label style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  {label}
                </label>
                <select
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border-default)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "0.875rem",
                    color: "var(--color-text-primary)",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                >
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {ticket.project_id && (
              <div
                style={{
                  paddingTop: "12px",
                  borderTop: "1px solid var(--color-border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  Projekt
                </span>
                <Link
                  href={`/projects/${ticket.project_id}`}
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--color-accent-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ticket.project_id}
                </Link>
              </div>
            )}
          </div>

          {/* Related documents */}
          <div
            style={{
              ...card,
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <h3
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--color-text-muted)",
                margin: 0,
              }}
            >
              Kapcsolódó dokumentumok
            </h3>
            {[
              {
                href: `/worklogs/new?ticket_id=${ticket._id}`,
                icon: <FileText size={15} />,
                label: "Munkalap létrehozása",
              },
              {
                href: `/completion-certificates/new?ticket_id=${ticket._id}`,
                icon: <BadgeCheck size={15} />,
                label: "Teljesítési igazoláshoz adás",
              },
            ].map(({ href, icon, label }) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "var(--color-bg-secondary)",
                  textDecoration: "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--color-bg-card-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "var(--color-bg-secondary)")
                }
              >
                <span style={{ color: "var(--color-accent-primary)", flexShrink: 0 }}>
                  {icon}
                </span>
                <span
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--color-text-primary)",
                    flex: 1,
                  }}
                >
                  {label}
                </span>
                <ChevronRight
                  size={14}
                  style={{ color: "var(--color-text-muted)", flexShrink: 0 }}
                />
              </Link>
            ))}
          </div>

          {/* Meta info */}
          <div
            style={{
              ...card,
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <h3
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--color-text-muted)",
                margin: 0,
              }}
            >
              Információk
            </h3>
            {[
              { label: "Létrehozva", value: fmtDate(ticket.created_at) },
              { label: "Utolsó frissítés", value: fmtDate(ticket.updated_at) },
              ...(ticket.resolved_at
                ? [{ label: "Megoldva", value: fmtDate(ticket.resolved_at) }]
                : []),
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{ display: "flex", flexDirection: "column", gap: "3px" }}
              >
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  {label}
                </span>
                <span
                  style={{ fontSize: "0.875rem", color: "var(--color-text-primary)" }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
