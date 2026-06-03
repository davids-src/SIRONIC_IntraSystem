"use client";

import { use, useState, useEffect, useCallback } from "react";
import {
  Badge,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TextareaControl,
  CheckboxField,
  Input,
  Textarea,
} from "@crm/ui";
import { useRouter } from "next/navigation";
import type { Ticket, TicketStatus, TicketPriority } from "@crm/types";
import {
  MessageSquare,
  Paperclip,
  MapPin,
  Server,
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
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";

function parseTicket(raw: unknown): Ticket {
  const t = raw as Record<string, unknown>;
  return {
    ...(t as unknown as Ticket),
    created_at: new Date(String(t["created_at"])),
    updated_at: new Date(String(t["updated_at"])),
    resolved_at: t["resolved_at"] ? new Date(String(t["resolved_at"])) : null,
    comments: ((t["comments"] as Ticket["comments"]) ?? []).map((c) => ({
      ...c,
      created_at: new Date(String(c.created_at)),
    })),
    attachments: ((t["attachments"] as Ticket["attachments"]) ?? []).map((a) => ({
      ...a,
      uploaded_at: new Date(String(a.uploaded_at)),
    })),
  };
}

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
  const isNew = id === "new";

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [contactName, setContactName] = useState("—");
  const [crmUsers, setCrmUsers] = useState<
    { _id: string; display_name: string | null; email: string }[]
  >([]);

  const [commentText, setCommentText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [status, setStatus] = useState<TicketStatus>("new");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [savingProps, setSavingProps] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  // New ticket creation states
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("incident");
  const [newPriority, setNewPriority] = useState<TicketPriority>("medium");
  const [newAffectedItems, setNewAffectedItems] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newContactId, setNewContactId] = useState("__none__");
  const [newOneTimeName, setNewOneTimeName] = useState("");
  const [newOneTimePhone, setNewOneTimePhone] = useState("");
  const [newAssignedTo, setNewAssignedTo] = useState("__none__");
  const [contacts, setContacts] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  const CATEGORY_BY_KEY: Record<string, string> = {
    incident: "Hibabejelentés",
    service_request: "Szervizigény",
    maintenance: "Karbantartás",
    security: "Biztonságtechnika",
  };

  const reload = useCallback(async () => {
    if (isNew) return;
    const t = parseTicket(await apiJson<unknown>(`/api/tickets/${id}`));
    setTicket(t);
    setStatus(t.status);
    setAssignedTo(t.assigned_to ?? "");
    setPriority(t.priority);
    if (t.contact_id) {
      try {
        const c = await apiJson<{ name: string }>(`/api/contacts/${t.contact_id}`);
        setContactName(c.name);
      } catch {
        setContactName(t.contact_id);
      }
    } else {
      setContactName(t.one_time_contact_name ?? "—");
    }
  }, [id, isNew]);

  useEffect(() => {
    (async () => {
      try {
        const users =
          await apiJson<{ _id: string; display_name: string | null; email: string }[]>(
            "/api/crm-users",
          );
        setCrmUsers(users);
      } catch {
        setCrmUsers([]);
      }
      if (isNew) {
        try {
          const cs = await apiJson<any[]>("/api/contacts");
          setContacts(cs);
        } catch {
          setContacts([]);
        }
      } else {
        try {
          await reload();
          setLoadErr(null);
        } catch {
          setLoadErr("A ticket nem tölthető be.");
          setTicket(null);
        }
      }
    })();
  }, [reload, isNew]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || !newAffectedItems.trim()) {
      setLoadErr("Tárgy, érintett rendszer és leírás kötelező.");
      return;
    }
    setCreating(true);
    setLoadErr(null);
    try {
      const payload = {
        title: newTitle.trim(),
        description: newDescription.trim(),
        category: CATEGORY_BY_KEY[newCategory] ?? newCategory,
        priority: newPriority,
        location: newLocation.trim() || null,
        affected_items: newAffectedItems.trim(),
        contact_id: newContactId === "__none__" ? null : newContactId,
        one_time_contact_name:
          newContactId === "__none__" ? newOneTimeName.trim() || null : null,
        one_time_contact_phone:
          newContactId === "__none__" ? newOneTimePhone.trim() || null : null,
        assigned_to: newAssignedTo === "__none__" ? null : newAssignedTo,
        source: "crm" as const,
        status: "new" as const,
      };

      const res = await apiJsonBody<{ _id: string }>("/api/tickets", "POST", payload);
      router.push(`/tickets/${res._id}`);
    } catch (err) {
      setLoadErr(err instanceof ApiError ? err.message : "Hiba a létrehozás során.");
    } finally {
      setCreating(false);
    }
  };

  const saveProps = async () => {
    if (!ticket) return;
    setSavingProps(true);
    try {
      const updated = await apiJsonBody<unknown>(`/api/tickets/${id}`, "PATCH", {
        status,
        priority,
        assigned_to: assignedTo.trim() || null,
      });
      setTicket(parseTicket(updated));
    } catch {
      setLoadErr("Mentés sikertelen.");
    } finally {
      setSavingProps(false);
    }
  };

  const sendComment = async () => {
    if (!ticket || !commentText.trim()) return;
    setSendingComment(true);
    try {
      const updated = await apiJsonBody<unknown>(`/api/tickets/${id}/comments`, "POST", {
        message: commentText.trim(),
        is_internal: isInternal,
      });
      setTicket(parseTicket(updated));
      setCommentText("");
      setIsInternal(false);
    } catch {
      setLoadErr("Hozzászólás küldése sikertelen.");
    } finally {
      setSendingComment(false);
    }
  };

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleString("hu-HU", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (isNew) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl">
        <div className="flex items-center gap-3">
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
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Új ticket rögzítése</h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Ügyfél bejelentés vagy belső feladat rögzítése a CRM-be
          </p>
        </div>

        {loadErr && (
          <p
            className="text-sm px-4 py-2 rounded-md"
            style={{
              color: "var(--color-status-error)",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}
            role="alert"
          >
            {loadErr}
          </p>
        )}

        <form onSubmit={(e) => void handleCreateTicket(e)} className="space-y-6">
          <div className="p-6 space-y-6" style={card}>
            <div className="space-y-4">
              <h3
                className="text-sm font-bold uppercase tracking-wider pb-2"
                style={{
                  color: "var(--color-text-muted)",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
              >
                Alapadatok
              </h3>

              <Input
                label="Tárgy / Rövid megnevezés *"
                placeholder="Pl. Szerver elérhetetlen a központi irodában"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ticket-type">Típus *</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger id="ticket-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incident">Hibabejelentés</SelectItem>
                      <SelectItem value="service_request">Szervizigény</SelectItem>
                      <SelectItem value="maintenance">Karbantartás</SelectItem>
                      <SelectItem value="security">Biztonságtechnika</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ticket-priority">Prioritás *</Label>
                  <Select
                    value={newPriority}
                    onValueChange={(v) => setNewPriority(v as TicketPriority)}
                  >
                    <SelectTrigger id="ticket-priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Alacsony</SelectItem>
                      <SelectItem value="medium">Közepes</SelectItem>
                      <SelectItem value="high">Magas</SelectItem>
                      <SelectItem value="critical">Kritikus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ticket-assignee-new">Felelős</Label>
                  <Select value={newAssignedTo} onValueChange={setNewAssignedTo}>
                    <SelectTrigger id="ticket-assignee-new" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nincs kiosztva</SelectItem>
                      {crmUsers.map((u) => {
                        const label = u.display_name?.trim() || u.email;
                        return (
                          <SelectItem key={u._id} value={label}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3
                className="text-sm font-bold uppercase tracking-wider pb-2"
                style={{
                  color: "var(--color-text-muted)",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
              >
                Partner / Ügyfél kapcsolódás
              </h3>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ticket-contact">Partner / Cég</Label>
                <Select value={newContactId} onValueChange={setNewContactId}>
                  <SelectTrigger id="ticket-contact" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      Egyszeri / Nem regisztrált partner
                    </SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newContactId === "__none__" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]">
                  <Input
                    label="Ügyfél neve (egyszeri)"
                    placeholder="Pl. Gipsz Jakab"
                    value={newOneTimeName}
                    onChange={(e) => setNewOneTimeName(e.target.value)}
                  />
                  <Input
                    label="Ügyfél telefonszáma (egyszeri)"
                    placeholder="Pl. +36 30 123 4567"
                    value={newOneTimePhone}
                    onChange={(e) => setNewOneTimePhone(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3
                className="text-sm font-bold uppercase tracking-wider pb-2"
                style={{
                  color: "var(--color-text-muted)",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
              >
                Helyszín és Rendszerek
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Érintett rendszer / Eszközök *"
                  placeholder="Pl. Hálózat, Kamera, Beléptető..."
                  required
                  value={newAffectedItems}
                  onChange={(e) => setNewAffectedItems(e.target.value)}
                />
                <Input
                  label="Helyszín"
                  placeholder="Pl. Központi iroda, 2. emelet"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3
                className="text-sm font-bold uppercase tracking-wider pb-2"
                style={{
                  color: "var(--color-text-muted)",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
              >
                Részletes leírás
              </h3>

              <Textarea
                label="Leírás *"
                placeholder="Kérjük, írd le a lehető legrészletesebben a feladatot vagy hibát..."
                required
                className="min-h-[150px] resize-y"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => router.push("/tickets")}>
              Mégse
            </Button>
            <Button type="submit" variant="primary" disabled={creating}>
              {creating ? "Rögzítés…" : "Ticket rögzítése"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {loadErr ?? "Betöltés…"}
        </p>
        <Button variant="secondary" onClick={() => router.push("/tickets")}>
          Vissza
        </Button>
      </div>
    );
  }

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
                variant={statusVariant[status as keyof typeof statusVariant] ?? "default"}
              >
                {statusLabel[status as keyof typeof statusLabel] ?? status}
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
                <User size={13} /> Kontakt: {contactName}
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
            <div className="flex flex-col gap-3 px-6 py-4">
              <TextareaControl
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Írj megjegyzést vagy frissítsd az ügyfelet..."
                className="min-h-[80px] resize-y"
              />
              <div className="flex flex-row flex-wrap items-center justify-between gap-4">
                <CheckboxField
                  id="ticket-internal-comment"
                  label="Belső megjegyzés (csak munkatársak látják)"
                  checked={isInternal}
                  onCheckedChange={(v) => setIsInternal(v === true)}
                />
                <Button
                  variant="primary"
                  disabled={sendingComment}
                  onClick={() => void sendComment()}
                >
                  <Send size={14} style={{ marginRight: "6px" }} />
                  {sendingComment ? "Küldés…" : "Küldés"}
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

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ticket-status" className="text-xs text-muted-foreground">
                  Állapot
                </Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as TicketStatus)}
                >
                  <SelectTrigger id="ticket-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabel).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="ticket-assignee"
                  className="text-xs text-muted-foreground"
                >
                  Felelős
                </Label>
                <Select
                  value={assignedTo || "__none__"}
                  onValueChange={(v) => setAssignedTo(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger id="ticket-assignee" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nincs kiosztva</SelectItem>
                    {crmUsers.map((u) => {
                      const label = u.display_name?.trim() || u.email;
                      return (
                        <SelectItem key={u._id} value={label}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="ticket-priority"
                  className="text-xs text-muted-foreground"
                >
                  Prioritás
                </Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as TicketPriority)}
                >
                  <SelectTrigger id="ticket-priority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabel).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={savingProps}
                onClick={() => void saveProps()}
              >
                {savingProps ? "Mentés…" : "Tulajdonságok mentése"}
              </Button>
            </div>

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
