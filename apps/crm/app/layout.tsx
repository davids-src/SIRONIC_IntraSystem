import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM",
  description: "Internal CRM dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "260px 1fr" }}>
          <aside
            style={{
              borderRight: "1px solid #27272a",
              padding: "1rem",
              background: "#0f172a",
              color: "#f8fafc",
            }}
          >
            <h2 style={{ marginTop: 0 }}>SIRONIC CRM</h2>
            <nav style={{ display: "grid", gap: "0.5rem" }}>
              <Link href="/">Dashboard</Link>
              <Link href="/organizations">Organizations</Link>
              <Link href="/partners">Partners</Link>
              <Link href="/inventory">Inventory</Link>
              <Link href="/offers">Offers</Link>
              <Link href="/settings">Settings</Link>
            </nav>
          </aside>
          <div>
            <header
              style={{
                borderBottom: "1px solid #27272a",
                padding: "0.9rem 1.2rem",
                background: "#111827",
              }}
            >
              Internal CRM Panel
            </header>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
