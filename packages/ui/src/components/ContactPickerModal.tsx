"use client";

import * as React from "react";
import { colors, radius } from "../tokens";
import { Button } from "./Button";
import { Search, X, Building2, User, Phone, Mail, MapPin } from "lucide-react";
import type { Contact } from "@crm/types";

export interface ContactPickerModalProps {
  open: boolean;
  onClose: () => void;
  /** Opcióként átadott partnerek listája. Ha nincs megadva, automatikusan letölti az `/api/contacts` végpontról */
  contacts?: Contact[];
  onSelect: (contact: Contact) => void;
  title?: string;
  filterRole?: string;
}

export function ContactPickerModal({
  open,
  onClose,
  contacts: initialContacts,
  onSelect,
  title = "Partner kiválasztása",
  filterRole = "all",
}: ContactPickerModalProps) {
  const [contacts, setContacts] = React.useState<Contact[]>(initialContacts ?? []);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [search, setSearch] = React.useState<string>("");
  const [roleFilter, setRoleFilter] = React.useState<string>(filterRole);
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sync or fetch contacts
  React.useEffect(() => {
    if (!open) return;
    setSearch("");
    setRoleFilter(filterRole);
    setTypeFilter("all");

    if (initialContacts && initialContacts.length > 0) {
      setContacts(initialContacts);
    } else {
      setLoading(true);
      fetch("/api/contacts")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setContacts(Array.isArray(data) ? data : []))
        .catch(() => setContacts([]))
        .finally(() => setLoading(false));
    }
  }, [open, initialContacts, filterRole]);

  // Focus search input on open
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard shortcut: Escape
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const filteredContacts = contacts.filter((c) => {
    // Role filter
    if (roleFilter !== "all") {
      if (
        roleFilter === "client" &&
        c.partner_role &&
        c.partner_role !== "client" &&
        c.partner_role !== "mixed"
      )
        return false;
      if (
        roleFilter === "supplier" &&
        c.partner_role &&
        c.partner_role !== "supplier" &&
        c.partner_role !== "mixed"
      )
        return false;
      if (
        roleFilter === "subcontractor" &&
        c.partner_role &&
        c.partner_role !== "subcontractor_employer" &&
        c.partner_role !== "mixed"
      )
        return false;
    }

    // Type filter
    if (typeFilter !== "all") {
      if (typeFilter === "company" && c.type !== "company") return false;
      if (typeFilter === "individual" && c.type !== "individual") return false;
    }

    // Search query
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(q);
    const shortNameMatch = c.short_name?.toLowerCase().includes(q);
    const taxMatch = c.tax_number?.toLowerCase().includes(q);
    const emailMatch = c.email?.toLowerCase().includes(q);
    const phoneMatch = c.phone?.toLowerCase().includes(q);
    const cityMatch = c.address?.city?.toLowerCase().includes(q);
    const streetMatch = c.address?.street?.toLowerCase().includes(q);
    const tagsMatch = c.tags?.some((t) => t.toLowerCase().includes(q));

    return (
      nameMatch ||
      shortNameMatch ||
      taxMatch ||
      emailMatch ||
      phoneMatch ||
      cityMatch ||
      streetMatch ||
      tagsMatch
    );
  });

  const getRoleBadge = (role?: string | null) => {
    switch (role) {
      case "client":
        return { label: "Ügyfél", bg: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" };
      case "supplier":
        return { label: "Beszállító", bg: "rgba(168, 85, 247, 0.15)", color: "#c084fc" };
      case "subcontractor_employer":
        return {
          label: "Alvállalkozó",
          bg: "rgba(245, 158, 11, 0.15)",
          color: "#fbbf24",
        };
      case "mixed":
        return { label: "Vegyes", bg: "rgba(16, 185, 129, 0.15)", color: "#34d399" };
      default:
        return { label: "Partner", bg: "rgba(107, 114, 128, 0.15)", color: "#9ca3af" };
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: colors.bg.card,
          border: `1px solid ${colors.border.default}`,
          borderRadius: radius.lg,
          width: "100%",
          maxWidth: "760px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: `1px solid ${colors.border.default}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: colors.bg.secondary,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Building2 size={20} style={{ color: colors.accent.primary }} />
            <h2
              style={{
                margin: 0,
                fontSize: "1.125rem",
                fontWeight: 700,
                color: colors.text.primary,
              }}
            >
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: colors.text.secondary,
              padding: "4px",
              borderRadius: radius.sm,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Filters */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: `1px solid ${colors.border.default}`,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            background: colors.bg.card,
          }}
        >
          {/* Search box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: colors.bg.secondary,
              border: `1px solid ${colors.border.default}`,
              borderRadius: radius.md,
              padding: "8px 12px",
            }}
          >
            <Search size={18} style={{ color: colors.text.muted, flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Keresés név, adószám, e-mail, telefonszám, város alapján..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: colors.text.primary,
                fontSize: "0.9375rem",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: colors.text.muted,
                  padding: "2px",
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {/* Role Filter Pills */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: colors.text.muted,
                  marginRight: "4px",
                }}
              >
                Szerepkör:
              </span>
              {[
                { id: "all", label: "Összes" },
                { id: "client", label: "Ügyfelek" },
                { id: "supplier", label: "Beszállítók" },
                { id: "subcontractor", label: "Alvállalkozók" },
              ].map((f) => {
                const active = roleFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setRoleFilter(f.id)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: radius.sm,
                      border: active
                        ? `1px solid ${colors.accent.primary}`
                        : `1px solid ${colors.border.default}`,
                      background: active ? colors.accent.badgeBg : "transparent",
                      color: active ? colors.accent.primary : colors.text.secondary,
                      fontSize: "0.75rem",
                      fontWeight: active ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Type Filter Pills */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: colors.text.muted,
                  marginRight: "4px",
                }}
              >
                Típus:
              </span>
              {[
                { id: "all", label: "Mind" },
                { id: "company", label: "Cég" },
                { id: "individual", label: "Magánszemély" },
              ].map((f) => {
                const active = typeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setTypeFilter(f.id)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: radius.sm,
                      border: active
                        ? `1px solid ${colors.accent.primary}`
                        : `1px solid ${colors.border.default}`,
                      background: active ? colors.accent.badgeBg : "transparent",
                      color: active ? colors.accent.primary : colors.text.secondary,
                      fontSize: "0.75rem",
                      fontWeight: active ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Contact List */}
        <div
          style={{
            padding: "16px 24px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: colors.text.muted,
                fontSize: "0.875rem",
              }}
            >
              Partnerek betöltése...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: colors.text.muted,
                fontSize: "0.875rem",
              }}
            >
              Nincs a keresésnek megfelelő partner.
            </div>
          ) : (
            filteredContacts.map((c) => {
              const roleBadge = getRoleBadge(c.partner_role);
              const addressStr = c.address
                ? [c.address.zip, c.address.city, c.address.street]
                    .filter(Boolean)
                    .join(" ")
                : "";

              return (
                <div
                  key={c._id}
                  onClick={() => {
                    onSelect(c);
                    onClose();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "12px 16px",
                    border: `1px solid ${colors.border.default}`,
                    borderRadius: radius.md,
                    background: colors.bg.secondary,
                    cursor: "pointer",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.accent.primary;
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border.default;
                    e.currentTarget.style.background = colors.bg.secondary;
                  }}
                >
                  <div style={{ display: "flex", gap: "12px", flex: 1, minWidth: 0 }}>
                    {/* Icon */}
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: radius.sm,
                        background:
                          c.type === "company"
                            ? "rgba(59, 130, 246, 0.1)"
                            : "rgba(16, 185, 129, 0.1)",
                        color: c.type === "company" ? "#60a5fa" : "#34d399",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      {c.type === "company" ? (
                        <Building2 size={18} />
                      ) : (
                        <User size={18} />
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
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
                            fontWeight: 600,
                            fontSize: "0.9375rem",
                            color: colors.text.primary,
                          }}
                        >
                          {c.name}
                        </span>
                        {c.short_name && c.short_name !== c.name && (
                          <span
                            style={{ fontSize: "0.8125rem", color: colors.text.muted }}
                          >
                            ({c.short_name})
                          </span>
                        )}
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                            background: roleBadge.bg,
                            color: roleBadge.color,
                          }}
                        >
                          {roleBadge.label}
                        </span>
                      </div>

                      {/* Sub-info details */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          marginTop: "6px",
                          fontSize: "0.78125rem",
                          color: colors.text.secondary,
                          flexWrap: "wrap",
                        }}
                      >
                        {c.tax_number && (
                          <span style={{ fontFamily: "monospace" }}>
                            Adószám: {c.tax_number}
                          </span>
                        )}
                        {c.email && (
                          <span
                            style={{ display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            <Mail size={12} style={{ color: colors.text.muted }} />
                            {c.email}
                          </span>
                        )}
                        {c.phone && (
                          <span
                            style={{ display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            <Phone size={12} style={{ color: colors.text.muted }} />
                            {c.phone}
                          </span>
                        )}
                        {addressStr && (
                          <span
                            style={{ display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            <MapPin size={12} style={{ color: colors.text.muted }} />
                            {addressStr}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Select button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(c);
                      onClose();
                    }}
                    style={{ flexShrink: 0, alignSelf: "center" }}
                  >
                    Kiválaszt
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
