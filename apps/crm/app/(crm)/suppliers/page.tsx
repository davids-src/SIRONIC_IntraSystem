"use client";

import { PageHeader, Card, Badge, Button } from "@crm/ui";
import { Plus, Edit, Trash2, Phone, Mail, Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Supplier } from "@crm/types";

const fmt = (v: string | null) => v || "—";

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/suppliers");
      if (!res.ok) throw new Error("Nem sikerült betölteni a beszállítókat.");
      setSuppliers(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Biztosan törlöd a következő beszállítót?\n\n${name}`)) return;
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    setSuppliers((prev) => prev.filter((s) => s._id !== id));
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Beszállítók"
        subtitle="Regisztrált szállítópartnerek kezelése"
        actions={
          <Button variant="primary" onClick={() => router.push("/suppliers/new")}>
            <Plus size={16} className="mr-2" /> Új beszállító
          </Button>
        }
      />

      {error && <div className="text-red-400 p-4">{error}</div>}

      {loading ? (
        <div className="p-8 text-center text-gray-400">Betöltés...</div>
      ) : suppliers.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-gray-400">Még nem rögzítettél egyetlen beszállítót sem.</p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => router.push("/suppliers/new")}
          >
            <Plus size={16} className="mr-2" /> Első beszállító hozzáadása
          </Button>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--color-border-subtle)",
                  background: "var(--color-bg-secondary)",
                }}
              >
                {[
                  "Azonosító",
                  "Cégnév",
                  "Adószám",
                  "Telefon",
                  "E-mail",
                  "Székhely",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr
                  key={s._id}
                  style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                >
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "12px",
                        background: "var(--color-bg-secondary)",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {s.partner_id}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", fontWeight: 600 }}>{s.name}</td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontSize: "13px",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {fmt(s.tax_number)}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: "13px" }}>
                    {s.phone ? (
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Phone size={12} />
                        {s.phone}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: "13px" }}>
                    {s.email ? (
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Mail size={12} />
                        {s.email}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontSize: "13px",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {fmt(s.headquarters)}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/suppliers/${s._id}`)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(s._id, s.name)}
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
