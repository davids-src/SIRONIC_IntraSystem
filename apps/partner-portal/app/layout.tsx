import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Partner Portal",
  description: "Partner organization portal",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "240px 1fr" }}>
          <aside
            style={{
              borderRight: "1px solid #27272a",
              padding: "1rem",
              background: "#0b1220",
              color: "#f8fafc",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Partner Portal</h2>
            <nav style={{ display: "grid", gap: "0.5rem" }}>
              <Link href="/">Dashboard</Link>
              <Link href="/offers">Offers</Link>
              <Link href="/inventory">Inventory</Link>
              <Link href="/company-profile">Company Profile</Link>
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
              Partner Workspace
            </header>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
