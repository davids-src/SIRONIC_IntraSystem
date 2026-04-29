"use client";

import * as React from "react";
import { colors, spacing } from "../tokens";
import { Sidebar, type SidebarProps } from "./Sidebar";
import { Topbar, type TopbarProps } from "./Topbar";
import { usePathname } from "next/navigation";

export interface AppShellProps {
  sidebar: SidebarProps;
  topbar?: Omit<TopbarProps, "locale" | "onLocaleChange" | "onMenuToggle">;
  children: React.ReactNode;
}

export function AppShell({ sidebar, topbar, children }: AppShellProps) {
  const pathname = usePathname() || "/";

  const [locale, setLocale] = React.useState<string>(() => {
    if (typeof window === "undefined") return "hu";
    return localStorage.getItem("sironic-locale") ?? "hu";
  });

  const handleLocaleChange = (l: string) => {
    setLocale(l);
    localStorage.setItem("sironic-locale", l);
    document.cookie = `sironic-locale=${l}; path=/; max-age=31536000`;
  };

  // Mobile sidebar state
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Lock body scroll when mobile menu is open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <style>{`
        .app-shell-layout {
          display: flex;
          min-height: 100vh;
          background: ${colors.bg.primary};
        }
        .app-shell-main-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow-x: hidden;
        }
        .app-shell-content {
          flex: 1;
          padding: ${spacing.cardPadding};
          display: flex;
          flex-direction: column;
          gap: ${spacing.sectionGap};
        }
        @media (max-width: 768px) {
          .app-shell-content {
            padding: 12px;
            gap: 12px;
          }
        }
      `}</style>
      <div className="app-shell-layout">
        <Sidebar
          {...sidebar}
          currentPath={pathname}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        <div className="app-shell-main-area">
          <Topbar
            {...topbar}
            locale={locale}
            onLocaleChange={handleLocaleChange}
            onMenuToggle={() => setMobileMenuOpen((o) => !o)}
          />
          <main className="app-shell-content">{children}</main>
        </div>
      </div>
    </>
  );
}
