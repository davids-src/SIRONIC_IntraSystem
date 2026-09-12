"use client";

import * as React from "react";
import { colors, radius } from "../tokens";
import { SupplierPickerModal } from "./SupplierPickerModal";
import type { Supplier } from "@crm/types";
import { Search, X, Truck, ChevronsUpDown } from "lucide-react";

export interface SupplierSelectProps {
  value?: string | null;
  onSelect: (supplier: Supplier) => void;
  onClear?: () => void;
  suppliers?: Supplier[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  modalTitle?: string;
  style?: React.CSSProperties;
  className?: string;
}

export function SupplierSelect({
  value,
  onSelect,
  onClear,
  suppliers: initialSuppliers,
  placeholder = "Válassz beszállítót...",
  label,
  error,
  disabled = false,
  required = false,
  allowClear = true,
  modalTitle = "Beszállító kiválasztása",
  style,
  className = "",
}: SupplierSelectProps) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>(initialSuppliers ?? []);
  const [selectedSupplier, setSelectedSupplier] = React.useState<Supplier | null>(null);

  React.useEffect(() => {
    if (initialSuppliers) setSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  const fetchSuppliers = React.useCallback(async () => {
    if (suppliers.length > 0) return;
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error fetching suppliers for SupplierSelect", e);
    }
  }, [suppliers.length]);

  React.useEffect(() => {
    if (!value || value === "__empty__") {
      setSelectedSupplier(null);
      return;
    }

    const s = suppliers.find((x) => x._id === value);
    if (s) {
      setSelectedSupplier(s);
    } else {
      if (suppliers.length === 0) {
        fetchSuppliers();
      }
    }
  }, [value, suppliers, fetchSuppliers]);

  const handleSelect = (s: Supplier) => {
    setSelectedSupplier(s);
    onSelect(s);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSupplier(null);
    if (onClear) onClear();
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

      {selectedSupplier ? (
        <div
          onClick={() => {
            if (!disabled) {
              fetchSuppliers();
              setModalOpen(true);
            }
          }}
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
                background: "rgba(168, 85, 247, 0.15)",
                color: "#c084fc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Truck size={15} />
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
                {selectedSupplier.name}
              </span>
              <span
                style={{
                  marginLeft: "8px",
                  fontSize: "0.75rem",
                  color: colors.text.muted,
                }}
              >
                ({selectedSupplier.partner_id})
              </span>
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
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            fetchSuppliers();
            setModalOpen(true);
          }}
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

      <SupplierPickerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        suppliers={suppliers}
        onSelect={handleSelect}
        title={modalTitle}
      />
    </div>
  );
}
