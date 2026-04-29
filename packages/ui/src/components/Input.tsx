"use client";

import * as React from "react";
import { colors, radius } from "../tokens";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = React.useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && (
        <label
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: colors.text.secondary,
          }}
        >
          {label}
        </label>
      )}
      <input
        style={{
          height: "40px",
          padding: "0 12px",
          background: colors.bg.secondary,
          border: `1px solid ${focused ? colors.accent.primary : error ? colors.status.error : colors.border.default}`,
          borderRadius: radius.md,
          color: colors.text.primary,
          fontSize: "0.875rem",
          outline: "none",
          transition: "border-color 0.15s",
          fontFamily: "inherit",
          width: "100%",
          boxSizing: "border-box",
          ...style,
        }}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {error && (
        <span style={{ fontSize: "0.75rem", color: colors.status.error }}>{error}</span>
      )}
    </div>
  );
}
