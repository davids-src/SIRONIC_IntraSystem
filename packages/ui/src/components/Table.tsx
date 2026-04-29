"use client";

import * as React from "react";
import { colors, radius } from "../tokens";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
  /** @deprecated use render */
  accessor?: (row: T) => React.ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  emptyMessage?: string;
  style?: React.CSSProperties;
  onRowClick?: (row: T) => void;
}

export function Table<T>({
  columns,
  data,
  keyField,
  emptyMessage = "No data to display",
  style,
  onRowClick,
}: TableProps<T>) {
  return (
    <>
      <style>{`
        .sironic-table-wrapper {
          width: 100%;
          overflow-x: auto;
          border-radius: ${radius.lg};
          border: 1px solid ${colors.border.default};
        }
        .sironic-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 600px;
        }
        @media (max-width: 640px) {
          .sironic-table-wrapper { border-radius: ${radius.md}; }
          .sironic-table { min-width: 500px; }
        }
      `}</style>
      <div className="sironic-table-wrapper" style={style}>
        <table className="sironic-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  style={{
                    padding: "10px 16px",
                    background: colors.bg.secondary,
                    color: colors.text.muted,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textAlign: "left",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    width: col.width,
                    borderBottom: `1px solid ${colors.border.default}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.header}
                </th>
              ))}
              {onRowClick && (
                <th
                  style={{
                    width: "32px",
                    padding: "10px 8px",
                    background: colors.bg.secondary,
                    borderBottom: `1px solid ${colors.border.default}`,
                  }}
                />
              )}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onRowClick ? 1 : 0)}
                  style={{
                    padding: "48px",
                    textAlign: "center",
                    color: colors.text.muted,
                    fontSize: "0.875rem",
                  }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <TableRow
                  key={String(row[keyField])}
                  row={row}
                  columns={columns}
                  onRowClick={onRowClick}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TableRow<T>({
  row,
  columns,
  onRowClick,
}: {
  row: T;
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  const isClickable = !!onRowClick;

  return (
    <tr
      style={{
        background: hovered ? colors.bg.cardHover : "transparent",
        transition: "background 0.1s",
        cursor: isClickable ? "pointer" : "default",
      }}
      onClick={isClickable ? () => onRowClick(row) : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {columns.map((col) => (
        <td
          key={String(col.key)}
          style={{
            padding: "13px 16px",
            borderBottom: `1px solid ${colors.border.subtle}`,
            color: colors.text.primary,
            fontSize: "0.875rem",
            verticalAlign: "middle",
          }}
        >
          {col.render
            ? col.render(row)
            : col.accessor
              ? col.accessor(row)
              : String(row[col.key as keyof T] ?? "")}
        </td>
      ))}
      {onRowClick && (
        <td
          style={{
            padding: "13px 8px",
            borderBottom: `1px solid ${colors.border.subtle}`,
            color: colors.text.muted,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </td>
      )}
    </tr>
  );
}
