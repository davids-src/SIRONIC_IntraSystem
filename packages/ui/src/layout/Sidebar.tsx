"use client";

import * as React from "react";
import { colors, radius, spacing } from "../tokens";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

export interface SidebarUser {
  name: string;
  role: string;
  avatarInitials?: string;
}

export interface SidebarProps {
  appName: string;
  appIcon: React.ReactNode;
  navItems: NavItem[];
  currentPath: string;
  user: SidebarUser;
  onLogout?: () => void;
  /** Mobile: controlled open state */
  mobileOpen?: boolean;
  /** Mobile: close callback */
  onMobileClose?: () => void;
}

export function Sidebar({
  appName,
  appIcon,
  navItems,
  currentPath,
  user,
  onLogout,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  // Close on Escape key
  React.useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onMobileClose?.();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mobileOpen, onMobileClose]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div
        style={{
          height: spacing.topbarHeight,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "0 16px",
          borderBottom: `1px solid ${colors.border.default}`,
          flexShrink: 0,
        }}
      >
        <div style={{ color: colors.accent.primary, flexShrink: 0 }}>{appIcon}</div>
        <span
          style={{
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: colors.text.primary,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {appName}
        </span>

        {/* Close button – mobile only */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="sidebar-close-btn"
            style={{
              marginLeft: "auto",
              width: "32px",
              height: "32px",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: colors.text.secondary,
              borderRadius: radius.md,
            }}
            aria-label="Menü bezárása"
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: "12px 8px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          overflowY: "auto",
        }}
      >
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.key}
            item={item}
            isActive={
              currentPath === item.href ||
              (item.href !== "/" && currentPath.startsWith(item.href))
            }
            onNavigate={onMobileClose}
          />
        ))}
      </nav>

      {/* User footer */}
      <div
        style={{
          padding: "12px",
          borderTop: `1px solid ${colors.border.default}`,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px",
            borderRadius: radius.md,
            background: colors.bg.card,
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: colors.accent.badgeBg,
              color: colors.accent.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {user.avatarInitials ?? user.name.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: colors.text.primary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.name}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: colors.text.muted,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.role}
            </div>
          </div>
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              width: "100%",
              padding: "7px",
              background: "transparent",
              border: `1px solid ${colors.border.default}`,
              borderRadius: radius.md,
              color: colors.text.muted,
              fontSize: "0.8125rem",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                colors.accent.primary;
              (e.currentTarget as HTMLButtonElement).style.color = colors.accent.primary;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                colors.border.default;
              (e.currentTarget as HTMLButtonElement).style.color = colors.text.muted;
            }}
          >
            Kijelentkezés
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* CSS for responsive sidebar */}
      <style>{`
        .sidebar-desktop {
          width: ${spacing.sidebarWidth};
          min-width: ${spacing.sidebarWidth};
          max-width: ${spacing.sidebarWidth};
          background: ${colors.bg.sidebar};
          border-right: 1px solid ${colors.border.default};
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
          flex-shrink: 0;
        }
        .sidebar-mobile-overlay {
          display: none;
        }
        .sidebar-close-btn {
          display: none !important;
        }
        @media (max-width: 768px) {
          .sidebar-desktop {
            display: none !important;
          }
          .sidebar-mobile-overlay {
            display: ${mobileOpen ? "block" : "none"};
            position: fixed;
            inset: 0;
            z-index: 999;
          }
          .sidebar-mobile-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 999;
          }
          .sidebar-mobile-panel {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: 280px;
            max-width: 85vw;
            background: ${colors.bg.sidebar};
            border-right: 1px solid ${colors.border.default};
            display: flex;
            flex-direction: column;
            z-index: 1000;
            animation: slideIn 0.2s ease-out;
          }
          @keyframes slideIn {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
          .sidebar-close-btn {
            display: flex !important;
          }
        }
      `}</style>

      {/* Desktop sidebar */}
      <aside className="sidebar-desktop">{sidebarContent}</aside>

      {/* Mobile sidebar overlay */}
      <div className="sidebar-mobile-overlay">
        <div className="sidebar-mobile-backdrop" onClick={onMobileClose} />
        <aside className="sidebar-mobile-panel">{sidebarContent}</aside>
      </div>
    </>
  );
}

import Link from "next/link";

function SidebarNavItem({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 10px",
        borderRadius: radius.md,
        textDecoration: "none",
        fontSize: "0.875rem",
        fontWeight: isActive ? 600 : 400,
        color: isActive
          ? colors.accent.primary
          : hovered
            ? colors.text.primary
            : colors.text.secondary,
        background: isActive
          ? colors.accent.badgeBg
          : hovered
            ? colors.bg.card
            : "transparent",
        borderLeft: isActive
          ? `2px solid ${colors.accent.primary}`
          : "2px solid transparent",
        transition: "background 0.15s, color 0.15s",
        boxSizing: "border-box",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        style={{
          flexShrink: 0,
          width: "16px",
          height: "16px",
          display: "flex",
          alignItems: "center",
        }}
      >
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}
