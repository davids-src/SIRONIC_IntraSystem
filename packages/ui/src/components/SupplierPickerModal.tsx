"use client";

import * as React from "react";
import { colors, radius } from "../tokens";
import { Button } from "./Button";
import { Search, X, Truck, Phone, Mail, MapPin } from "lucide-react";
import type { Supplier } from "@crm/types";

export interface SupplierPickerModalProps {
  open: boolean;
  onClose: () => void;
  suppliers?: Supplier[];
  onSelect: (supplier: Supplier) => void;
  title?: string;
}

export function SupplierPickerModal({
  open,
  onClose,
  suppliers: initialSuppliers,
  onSelect,
  title = "Beszállító kiválasztása",
}: SupplierPickerModalProps) {
  const [suppliers, setSuppliers] = React.useState<Supplier[]>(initialSuppliers ?? []);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [search, setSearch] = React.useState<string>("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setSearch("");

    if (initialSuppliers && initialSuppliers.length > 0) {
      setSuppliers(initialSuppliers);
    } else {
      setLoading(true);
      fetch("/api/suppliers")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setSuppliers(Array.isArray(data) ? data : []))
        .catch(() => setSuppliers([]))
        .finally(() => setLoading(false));
    }
  }, [open, initialSuppliers]);

  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const filteredSuppliers = suppliers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(q);
    const taxMatch = c.tax_number?.toLowerCase().includes(q);
    const emailMatch = c.email?.toLowerCase().includes(q);
    const phoneMatch = c.phone?.toLowerCase().includes(q);
    const headMatch = c.headquarters?.toLowerCase().includes(q);

    return nameMatch || taxMatch || emailMatch || phoneMatch || headMatch;
  });

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
            <Truck size={20} style={{ color: colors.accent.primary }} />
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
              placeholder="Keresés név, adószám, e-mail, telefonszám alapján..."
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
        </div>

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
              Beszállítók betöltése...
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: colors.text.muted,
                fontSize: "0.875rem",
              }}
            >
              Nincs a keresésnek megfelelő beszállító.
            </div>
          ) : (
            filteredSuppliers.map((c) => {
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
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: radius.sm,
                        background: "rgba(168, 85, 247, 0.15)",
                        color: "#c084fc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      <Truck size={18} />
                    </div>

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
                        <span style={{ fontSize: "0.8125rem", color: colors.text.muted }}>
                          ({c.partner_id})
                        </span>
                      </div>

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
                        {c.headquarters && (
                          <span
                            style={{ display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            <MapPin size={12} style={{ color: colors.text.muted }} />
                            {c.headquarters}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

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
