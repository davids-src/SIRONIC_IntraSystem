import type { Metadata } from "next";
import "@erp/ui/globals.css";
import { Toaster } from "@erp/ui";

/** Portal pages use MongoDB — never prerender at build (CI/Docker have no database). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "SIRONIC Partnerportál", template: "%s — SIRONIC Partnerportál" },
  description: "Hibajegyek, munkalapok, igazolások és számlák egy helyen.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu">
      <body className="bg-background text-foreground flex min-h-dvh flex-col antialiased">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
