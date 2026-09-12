"use client";

import * as React from "react";
import { colors, radius } from "../tokens";
import { ItemPickerModal } from "./ItemPickerModal";
import type {
  PriceListItemForPicker,
  ServiceItemForPicker,
  StockInfoForPicker,
} from "./ItemPickerModal";
import { Search, X, Package, Tag, ChevronsUpDown } from "lucide-react";

export interface ProductSelectProps {
  value?: string | null;
  onSelect: (
    item: PriceListItemForPicker | ServiceItemForPicker,
    type: "product" | "service",
  ) => void;
  onClear?: () => void;
  priceList?: PriceListItemForPicker[];
  servicePriceList?: ServiceItemForPicker[];
  stockItems?: StockInfoForPicker[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  defaultTab?: "product" | "service";
  allowClear?: boolean;
  modalTitle?: string;
  style?: React.CSSProperties;
  className?: string;
}

const fmtHuf = (n: number) =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(n);

export function ProductSelect({
  value,
  onSelect,
  onClear,
  priceList: initialPriceList,
  servicePriceList: initialServicePriceList,
  stockItems: initialStockItems,
  placeholder = "Válassz terméket vagy szolgáltatást...",
  label,
  error,
  disabled = false,
  required = false,
  defaultTab = "product",
  allowClear = true,
  modalTitle = "Termék / Szolgáltatás kiválasztása",
  style,
  className = "",
}: ProductSelectProps) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [priceList, setPriceList] = React.useState<PriceListItemForPicker[]>(
    initialPriceList ?? [],
  );
  const [servicePriceList, setServicePriceList] = React.useState<ServiceItemForPicker[]>(
    initialServicePriceList ?? [],
  );
  const [stockItems, setStockItems] = React.useState<StockInfoForPicker[]>(
    initialStockItems ?? [],
  );

  const [selectedProduct, setSelectedProduct] =
    React.useState<PriceListItemForPicker | null>(null);
  const [selectedService, setSelectedService] =
    React.useState<ServiceItemForPicker | null>(null);

  // Sync initial props
  React.useEffect(() => {
    if (initialPriceList) setPriceList(initialPriceList);
    if (initialServicePriceList) setServicePriceList(initialServicePriceList);
    if (initialStockItems) setStockItems(initialStockItems);
  }, [initialPriceList, initialServicePriceList, initialStockItems]);

  // Auto fetch if lists not passed and modal opened or value exists
  const fetchLists = React.useCallback(async () => {
    if (priceList.length > 0 || servicePriceList.length > 0) return;
    try {
      const [pRes, sRes, stockRes] = await Promise.all([
        fetch("/api/price-list").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/service-price-list").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/warehouse/stock")
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
      ]);
      setPriceList(Array.isArray(pRes) ? pRes : []);
      setServicePriceList(Array.isArray(sRes) ? sRes : []);
      setStockItems(Array.isArray(stockRes) ? stockRes : []);
    } catch (e) {
      console.error("Error fetching product list for ProductSelect", e);
    }
  }, [priceList.length, servicePriceList.length]);

  // Match selected item based on value
  React.useEffect(() => {
    if (!value || value === "__empty__") {
      setSelectedProduct(null);
      setSelectedService(null);
      return;
    }

    const prod = priceList.find((p) => p._id === value);
    if (prod) {
      setSelectedProduct(prod);
      setSelectedService(null);
      return;
    }

    const srv = servicePriceList.find((s) => s._id === value);
    if (srv) {
      setSelectedService(srv);
      setSelectedProduct(null);
      return;
    }

    // Fetch lists if not loaded yet
    if (priceList.length === 0 && servicePriceList.length === 0) {
      fetchLists();
    }
  }, [value, priceList, servicePriceList, fetchLists]);

  const handleSelectProduct = (item: PriceListItemForPicker) => {
    setSelectedProduct(item);
    setSelectedService(null);
    onSelect(item, "product");
  };

  const handleSelectService = (item: ServiceItemForPicker) => {
    setSelectedService(item);
    setSelectedProduct(null);
    onSelect(item, "service");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProduct(null);
    setSelectedService(null);
    if (onClear) onClear();
  };

  const stockInfo = selectedProduct
    ? stockItems.find((s) => s.price_list_item_id === selectedProduct._id)
    : null;

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

      {selectedProduct || selectedService ? (
        /* Selected Item Display Card */
        <div
          onClick={() => {
            if (!disabled) {
              fetchLists();
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
                background: selectedProduct
                  ? "rgba(59, 130, 246, 0.15)"
                  : "rgba(168, 85, 247, 0.15)",
                color: selectedProduct ? "#60a5fa" : "#c084fc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {selectedProduct ? <Package size={15} /> : <Tag size={15} />}
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
                {selectedProduct ? selectedProduct.name : selectedService?.name}
              </span>
              {selectedProduct && selectedProduct.item_number && (
                <span
                  style={{
                    marginLeft: "8px",
                    fontSize: "0.75rem",
                    color: colors.text.muted,
                    fontFamily: "monospace",
                  }}
                >
                  ({selectedProduct.item_number})
                </span>
              )}
              {selectedProduct && selectedProduct.net_price !== undefined && (
                <span
                  style={{
                    marginLeft: "8px",
                    fontSize: "0.75rem",
                    color: colors.text.secondary,
                    fontWeight: 600,
                  }}
                >
                  · {fmtHuf(selectedProduct.net_price)} / {selectedProduct.unit}
                </span>
              )}
              {stockInfo && (
                <span
                  style={{
                    marginLeft: "8px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color:
                      stockInfo.quantity_in_stock > 0
                        ? colors.status.success
                        : colors.status.error,
                  }}
                >
                  ·{" "}
                  {stockInfo.quantity_in_stock > 0
                    ? `${stockInfo.quantity_in_stock} db készleten`
                    : "Nincs készleten"}
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
          onClick={() => {
            fetchLists();
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

      {/* Item Picker Modal */}
      <ItemPickerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        priceList={priceList}
        servicePriceList={servicePriceList}
        stockItems={stockItems}
        onSelectProduct={handleSelectProduct}
        onSelectService={handleSelectService}
        title={modalTitle}
        defaultTab={defaultTab}
      />
    </div>
  );
}
