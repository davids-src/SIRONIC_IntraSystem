"use client";

import { PageHeader, Card, Input } from "@crm/ui";
import type { Contact } from "@crm/types";
import { apiJson } from "@/lib/api-client";
import { Building2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

function parseContact(raw: unknown): Contact {
  const r = raw as Record<string, unknown>;
  return {
    ...(r as unknown as Contact),
    created_at: new Date(String(r.created_at)),
    updated_at: new Date(String(r.updated_at)),
  };
}

function fmtAddr(c: Contact): string {
  const a = c.address;
  if (!a) return "";
  return [a.zip, a.city, a.street, a.country].filter(Boolean).join(", ");
}

export default function CompanyProfilePage() {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const raw = await apiJson<unknown>("/api/me", { signal: ac.signal });
        setContact(parseContact(raw));
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) setLoadErr("Az adatok nem tölthetők be.");
      }
    })();
    return () => ac.abort();
  }, []);

  if (!contact && !loadErr) {
    return <div className="p-6 text-[var(--color-text-muted)]">Betöltés…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="Cégprofil"
        subtitle="A portálhoz kapcsolt ügyfél adatai (csak olvasható)"
      />
      {loadErr && (
        <p className="text-sm text-red-400 px-1" role="alert">
          {loadErr}
        </p>
      )}
      {contact && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "24px",
          }}
        >
          <Card style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: "16px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  backgroundColor: "var(--accent-badge-bg)",
                  color: "var(--accent-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Building2 size={20} />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    margin: 0,
                    color: "var(--text-primary)",
                  }}
                >
                  Alapinformációk
                </h2>
              </div>
            </div>
            <Input label="Cégnév" value={contact.name} readOnly />
            <Input label="Adószám" value={contact.tax_number ?? "—"} readOnly />
            <Input
              label="Cégjegyzékszám"
              value={contact.registration_number ?? "—"}
              readOnly
            />
            <Input label="E-mail" value={contact.email ?? "—"} readOnly />
          </Card>

          <Card style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: "16px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  backgroundColor: "var(--status-info)",
                  opacity: 0.8,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MapPin size={20} />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    margin: 0,
                    color: "var(--text-primary)",
                  }}
                >
                  Cím és telefon
                </h2>
              </div>
            </div>
            <Input label="Cím" value={fmtAddr(contact)} readOnly />
            <Input label="Telefon" value={contact.phone ?? "—"} readOnly />
          </Card>
        </div>
      )}
    </div>
  );
}
