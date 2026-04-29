import * as React from "react";
import { colors, radius } from "../tokens";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  emptyMessage?: string;
  style?: React.CSSProperties;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  emptyMessage = "No data to display",
  style,
}: TableProps<T>) {
  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        borderRadius: radius.lg,
        border: `1px solid ${colors.border.default}`,
        ...style,
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                style={{
                  padding: "12px 16px",
                  background: colors.bg.secondary,
                  color: colors.text.muted,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textAlign: "left",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  width: col.width,
                  borderBottom: `1px solid ${colors.border.default}`,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: "32px",
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
              <TableRow key={String(row[keyField])} row={row} columns={columns} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function TableRow<T extends Record<string, unknown>>({
  row,
  columns,
}: {
  row: T;
  columns: Column<T>[];
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <tr
      style={{
        background: hovered ? colors.bg.cardHover : "transparent",
        transition: "background 0.1s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {columns.map((col) => (
        <td
          key={String(col.key)}
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${colors.border.subtle}`,
            color: colors.text.primary,
            fontSize: "0.875rem",
          }}
        >
          {col.render ? col.render(row) : String(row[col.key as keyof T] ?? "")}
        </td>
      ))}
    </tr>
  );
}
