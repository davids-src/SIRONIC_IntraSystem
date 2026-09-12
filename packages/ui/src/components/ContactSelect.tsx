"use client";

import * as React from "react";
import { colors, radius } from "../tokens";
import { ContactPickerModal } from "./ContactPickerModal";
import { Search, X, Building2, User, ChevronsUpDown } from "lucide-react";
import type { Contact } from "@crm/types";

export interface ContactSelectProps {
  value?: string | null;
  onChange: (contactId: string, contact?: Contact | null) => void;
  contacts?: Contact[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  filterRole?: string;
  className?: string;
  allowClear?: boolean;
  modalTitle?: string;
  style?: React.CSSProperties;
}

export function ContactSelect({
  value,
  onChange,
  contacts: initialContacts,
  placeholder = "Válassz partnert...",
  label,
  error,
  disabled = false,
  required = false,
  filterRole = "all",
  className = "",
  allowClear = true,
  modalTitle = "Partner kiválasztása",
  style,
}: ContactSelectProps) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [contacts, setContacts] = React.useState<Contact[]>(initialContacts ?? []);
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null);

  // Sync contacts if provided
  React.useEffect(() => {
    if (initialContacts) {
      setContacts(initialContacts);
    }
  }, [initialContacts]);

  // Find or fetch selected contact details if value exists
  React.useEffect(() => {
    if (!value || value === "__empty__") {
      setSelectedContact(null);
      return;
    }

    const found = contacts.find((c) => c._id === value);
    if (found) {
      setSelectedContact(found);
    } else {
      // Fetch from API if not present in contacts array
      fetch(`/api/contacts/${value}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data._id) {
            setSelectedContact(data);
          } else {
            setSelectedContact({
              _id: value,
              name: value,
            } as any);
          }
        })
        .catch(() => {
          setSelectedContact({
            _id: value,
            name: value,
          } as any);
        });
    }
  }, [value, contacts]);

  const handleSelect = (contact: Contact) => {
    setSelectedContact(contact);
    onChange(contact._id, contact);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedContact(null);
    onChange("", null);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        width: "100%",
        ...style,
      }}
      className={className}
    >
      {label && (
        <label
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: colors.text.primary,
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {label}
          {required && <span style={{ color: colors.status.error }}>*</span>}
        </label>
      )}

      {selectedContact ? (
        /* Selected Contact Display Card */
        <div
          onClick={() => !disabled && setModalOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            background: colors.bg.secondary,
            border: `1px solid ${error ? colors.status.error : colors.border.default}`,
            borderRadius: radius.md,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!disabled) e.currentTarget.style.borderColor = colors.accent.primary;
          }}
          onMouseLeave={(e) => {
            if (!disabled)
              e.currentTarget.style.borderColor = error
                ? colors.status.error
                : colors.border.default;
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: radius.sm,
                background:
                  selectedContact.type === "company"
                    ? "rgba(59, 130, 246, 0.15)"
                    : "rgba(16, 185, 129, 0.15)",
                color: selectedContact.type === "company" ? "#60a5fa" : "#34d399",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {selectedContact.type === "company" ? (
                <Building2 size={15} />
              ) : (
                <User size={15} />
              )}
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: colors.text.primary,
                }}
              >
                {selectedContact.name}
              </span>
              {selectedContact.tax_number && (
                <span
                  style={{
                    marginLeft: "8px",
                    fontSize: "0.75rem",
                    color: colors.text.muted,
                    fontFamily: "monospace",
                  }}
                >
                  ({selectedContact.tax_number})
                </span>
              )}
            </div>
          </div>

          <div
            style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                color: colors.accent.primary,
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: radius.sm,
                background: colors.accent.badgeBg,
              }}
            >
              Módosítás
            </span>
            {allowClear && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: colors.text.muted,
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radius.sm,
                }}
                title="Eltávolítás"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty Trigger Button */
        <button
          type="button"
          disabled={disabled}
          onClick={() => setModalOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: "9px 12px",
            background: colors.bg.secondary,
            border: `1px solid ${error ? colors.status.error : colors.border.default}`,
            borderRadius: radius.md,
            color: colors.text.muted,
            fontSize: "0.875rem",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            textAlign: "left",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.borderColor = colors.accent.primary;
              e.currentTarget.style.color = colors.text.secondary;
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.borderColor = error
                ? colors.status.error
                : colors.border.default;
              e.currentTarget.style.color = colors.text.muted;
            }
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Search size={16} style={{ color: colors.text.muted }} />
            <span>{placeholder}</span>
          </div>
          <ChevronsUpDown size={16} style={{ color: colors.text.muted }} />
        </button>
      )}

      {error && (
        <span style={{ fontSize: "0.75rem", color: colors.status.error }}>{error}</span>
      )}

      {/* Modal Dialog */}
      <ContactPickerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        contacts={contacts}
        onSelect={handleSelect}
        title={modalTitle}
        filterRole={filterRole}
      />
    </div>
  );
}
