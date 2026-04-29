"use client";

import * as React from "react";
import { colors, radius, spacing } from "../tokens";

export interface TopbarProps {
  breadcrumb?: string;
  locale?: string;
  onLocaleChange?: (locale: string) => void;
  notificationCount?: number;
  userInitials?: string;
  userMenuItems?: { label: string; onClick: () => void }[];
  /** Mobile hamburger */
  onMenuToggle?: () => void;
}

export function Topbar({
  breadcrumb,
  locale = "hu",
  onLocaleChange,
  notificationCount = 0,
  userInitials = "U",
  userMenuItems = [],
  onMenuToggle,
}: TopbarProps) {
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  return (
    <>
      <style>{`
        .topbar-hamburger {
          display: none;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: transparent;
          border: 1px solid ${colors.border.default};
          border-radius: ${radius.md};
          cursor: pointer;
          color: ${colors.text.secondary};
          flex-shrink: 0;
        }
        .topbar-hamburger:active {
          background: ${colors.bg.card};
        }
        @media (max-width: 768px) {
          .topbar-hamburger {
            display: flex;
          }
        }
      `}</style>
      <header
        style={{
          height: spacing.topbarHeight,
          background: colors.bg.topbar,
          borderBottom: `1px solid ${colors.border.default}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          gap: "12px",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        {/* Left – hamburger + breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          {onMenuToggle && (
            <button
              className="topbar-hamburger"
              onClick={onMenuToggle}
              aria-label="Menü megnyitása"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </button>
          )}
          <div
            style={{
              fontSize: "0.875rem",
              color: colors.text.muted,
              fontWeight: 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {breadcrumb ?? ""}
          </div>
        </div>

        {/* Right – controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {/* Language switcher */}
          {onLocaleChange && (
            <div
              style={{
                display: "flex",
                gap: "2px",
                background: colors.bg.card,
                borderRadius: radius.pill,
                padding: "3px",
                border: `1px solid ${colors.border.default}`,
              }}
            >
              {(["hu", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => onLocaleChange(l)}
                  style={{
                    padding: "3px 10px",
                    borderRadius: radius.pill,
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    fontFamily: "inherit",
                    transition: "background 0.15s, color 0.15s",
                    background: locale === l ? colors.accent.primary : "transparent",
                    color: locale === l ? "#fff" : colors.text.muted,
                  }}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Notification bell */}
          <button
            style={{
              position: "relative",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: `1px solid ${colors.border.default}`,
              borderRadius: radius.md,
              cursor: "pointer",
              color: colors.text.secondary,
            }}
            aria-label="Értesítések"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {notificationCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "4px",
                  right: "4px",
                  width: "8px",
                  height: "8px",
                  background: colors.accent.primary,
                  borderRadius: "50%",
                }}
              />
            )}
          </button>

          {/* User avatar */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: colors.accent.badgeBg,
                color: colors.accent.primary,
                border: `1px solid ${colors.border.default}`,
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 700,
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label="Felhasználó menü"
            >
              {userInitials}
            </button>

            {userMenuOpen && userMenuItems.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  background: colors.bg.card,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: radius.md,
                  minWidth: "160px",
                  zIndex: 100,
                  overflow: "hidden",
                }}
              >
                {userMenuItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      item.onClick();
                      setUserMenuOpen(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      color: colors.text.secondary,
                      textAlign: "left",
                      fontFamily: "inherit",
                      display: "block",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        colors.bg.cardHover;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "transparent";
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
