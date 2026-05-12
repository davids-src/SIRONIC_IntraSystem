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
          height: 100vh;
          overflow: hidden;
          background: ${colors.bg.primary};
        }
        .app-shell-sidebar {
          flex-shrink: 0;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .app-shell-main-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }
        .app-shell-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
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
          <main className="app-shell-content">
            <div
              style={{
                padding: "24px",
                maxWidth: "1400px",
                margin: "0 auto",
                width: "100%",
              }}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
