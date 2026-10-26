"use client";

import React from "react";
import { isServiceItem } from "../lib/item-classifier";

export interface OfferLineItem {
  description: string;
  quantity: number;
  unit: string;
  net_unit_price: number;
  discount_percent?: number | null;
  line_type?: string | null;
  service_price_list_item_id?: string | null;
  group_id?: string | null;
  is_group_parent?: boolean | null;
}

export interface OfferLinesTableProps {
  lines: OfferLineItem[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(n);

export function OfferLinesTable({ lines }: OfferLinesTableProps) {
  const topLevel = lines.filter((l) => !l.group_id || l.is_group_parent);

  const products = topLevel.filter((l) => !isServiceItem(l));
  const services = topLevel.filter((l) => isServiceItem(l));

  const hasProducts = products.length > 0;
  const hasServices = services.length > 0;
  const hasBoth = hasProducts && hasServices;

  const renderRow = (l: OfferLineItem, idx: number) => {
    const discountedPrice = l.net_unit_price * (1 - (l.discount_percent ?? 0) / 100);
    const isParent = l.is_group_parent;
    const children = isParent
      ? lines.filter((cl) => cl.group_id === l.group_id && !cl.is_group_parent)
      : [];

    return (
      <tr
        key={idx}
        style={{ borderBottom: "1px solid #e2e8f0", pageBreakInside: "avoid" }}
      >
        <td
          style={{
            padding: "8px 10px",
            fontWeight: 600,
            fontSize: "12px",
            color: "#0f172a",
          }}
        >
          {l.description}
          {l.discount_percent ? (
            <span
              style={{
                marginLeft: "6px",
                color: "#16a34a",
                fontSize: "10px",
                fontWeight: 500,
              }}
            >
              (-{l.discount_percent}%)
            </span>
          ) : null}
          {isParent && children.length > 0 && (
            <div
              style={{
                fontWeight: 400,
                color: "#64748b",
                fontSize: "10px",
                marginTop: "2px",
              }}
            >
              {children.map((cl) => cl.description).join(" • ")}
            </div>
          )}
        </td>
        <td
          style={{
            textAlign: "right",
            padding: "8px 10px",
            fontSize: "12px",
            whiteSpace: "nowrap",
            color: "#334155",
          }}
        >
          {l.quantity} {l.unit}
        </td>
        <td
          style={{
            textAlign: "right",
            padding: "8px 10px",
            fontSize: "12px",
            whiteSpace: "nowrap",
            color: "#334155",
          }}
        >
          {fmt(discountedPrice)}
        </td>
        <td
          style={{
            textAlign: "right",
            padding: "8px 10px",
            fontSize: "12px",
            fontWeight: 700,
            whiteSpace: "nowrap",
            color: "#0f172a",
          }}
        >
          {fmt(l.quantity * discountedPrice)}
        </td>
      </tr>
    );
  };

  const sectionHeader = (title: string, count: number) => (
    <tr style={{ pageBreakInside: "avoid", pageBreakAfter: "avoid" }}>
      <td
        colSpan={4}
        style={{
          padding: "12px 10px 6px",
          fontSize: "11px",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          color: "#0f172a",
          backgroundColor: "#f8fafc",
          borderTop: "1px solid #cbd5e1",
          borderBottom: "1px solid #cbd5e1",
        }}
      >
        <span style={{ marginRight: "6px" }}>{title}</span>
        <span style={{ fontSize: "10px", fontWeight: 500, color: "#64748b" }}>
          ({count} tétel)
        </span>
      </td>
    </tr>
  );

  return (
    <table
      className="offer-lines-table"
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "12px",
        marginBottom: "20px",
        pageBreakInside: "auto",
      }}
    >
      <thead>
        <tr style={{ borderBottom: "2px solid #0f172a", pageBreakInside: "avoid" }}>
          <th
            style={{
              textAlign: "left",
              padding: "8px 10px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#334155",
            }}
          >
            Megnevezés
          </th>
          <th
            style={{
              textAlign: "right",
              padding: "8px 10px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#334155",
              width: "80px",
            }}
          >
            Menny.
          </th>
          <th
            style={{
              textAlign: "right",
              padding: "8px 10px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#334155",
              width: "110px",
            }}
          >
            Nettó egységár
          </th>
          <th
            style={{
              textAlign: "right",
              padding: "8px 10px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#334155",
              width: "110px",
            }}
          >
            Nettó összesen
          </th>
        </tr>
      </thead>
      <tbody>
        {hasBoth ? (
          <>
            {sectionHeader("🔧 Termékek", products.length)}
            {products.map((l, i) => renderRow(l, i))}
            {sectionHeader("⚙️ Munkadíj / Szolgáltatások", services.length)}
            {services.map((l, i) => renderRow(l, i + products.length))}
          </>
        ) : hasProducts ? (
          <>
            {sectionHeader("🔧 Termékek", products.length)}
            {products.map((l, i) => renderRow(l, i))}
          </>
        ) : hasServices ? (
          <>
            {sectionHeader("⚙️ Munkadíj / Szolgáltatások", services.length)}
            {services.map((l, i) => renderRow(l, i))}
          </>
        ) : (
          <tr>
            <td
              colSpan={4}
              style={{ padding: "16px", textAlign: "center", color: "#64748b" }}
            >
              Nincsenek tételek az ajánlatban.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
