"use client";

import { PageHeader, Card, Button, InputControl, Label } from "@crm/ui";
import { Save, ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { Supplier } from "@crm/types";

const EMPTY = {
  name: "",
  tax_number: "",
  registration_number: "",
  headquarters: "",
  email: "",
  phone: "",
  bank_account: "",
  notes: "",
};

export default function SupplierFormPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const isNew = id === "new";

  const [form, setForm] = useState(EMPTY);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/suppliers/${id}`)
      .then((r) => r.json())
      .then((s: Supplier) => {
        setSupplier(s);
        setForm({
          name: s.name,
          tax_number: s.tax_number ?? "",
          registration_number: s.registration_number ?? "",
          headquarters: s.headquarters ?? "",
          email: s.email ?? "",
          phone: s.phone ?? "",
          bank_account: s.bank_account ?? "",
          notes: s.notes ?? "",
        });
      })
      .catch(() => setError("Nem sikerült betölteni a beszállítót."));
  }, [id, isNew]);

  const set =
    (key: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        tax_number: form.tax_number || null,
        registration_number: form.registration_number || null,
        headquarters: form.headquarters || null,
        email: form.email || null,
        phone: form.phone || null,
        bank_account: form.bank_account || null,
        notes: form.notes || null,
      };
      const res = await fetch(isNew ? "/api/suppliers" : `/api/suppliers/${id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.formErrors?.[0] ?? "Mentés sikertelen.");
      }
      router.push("/suppliers");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = { marginBottom: "20px" };
  const gridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isNew ? "Új Beszállító" : (supplier?.name ?? "Szerkesztés")}
        subtitle={isNew ? "Új szállítópartner rögzítése" : (supplier?.partner_id ?? "")}
        actions={
          <Button variant="ghost" onClick={() => router.push("/suppliers")}>
            <ChevronLeft size={16} className="mr-1" /> Vissza
          </Button>
        }
      />

      {error && <div className="text-red-400 p-4 rounded-lg bg-red-950/30">{error}</div>}

      <form onSubmit={handleSubmit}>
        <Card className="p-6">
          <h3 style={{ fontWeight: 700, marginBottom: "20px" }}>Cégadatok</h3>

          <div style={fieldStyle}>
            <Label htmlFor="name">Cégnév *</Label>
            <InputControl
              id="name"
              value={form.name}
              onChange={set("name")}
              required
              placeholder="Pl. Péter Hardware Kft."
            />
          </div>

          <div style={gridStyle}>
            <div style={fieldStyle}>
              <Label htmlFor="tax_number">Adószám</Label>
              <InputControl
                id="tax_number"
                value={form.tax_number}
                onChange={set("tax_number")}
                placeholder="12345678-1-23"
              />
            </div>
            <div style={fieldStyle}>
              <Label htmlFor="registration_number">Cégjegyzékszám</Label>
              <InputControl
                id="registration_number"
                value={form.registration_number}
                onChange={set("registration_number")}
                placeholder="01-09-123456"
              />
            </div>
          </div>

          <div style={fieldStyle}>
            <Label htmlFor="headquarters">Székhely</Label>
            <InputControl
              id="headquarters"
              value={form.headquarters}
              onChange={set("headquarters")}
              placeholder="1011 Budapest, Fő utca 1."
            />
          </div>

          <div style={gridStyle}>
            <div style={fieldStyle}>
              <Label htmlFor="email">E-mail cím</Label>
              <InputControl
                id="email"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="info@pelda.hu"
              />
            </div>
            <div style={fieldStyle}>
              <Label htmlFor="phone">Telefonszám</Label>
              <InputControl
                id="phone"
                value={form.phone}
                onChange={set("phone")}
                placeholder="+36 30 123 4567"
              />
            </div>
          </div>

          <div style={fieldStyle}>
            <Label htmlFor="bank_account">Bankszámlaszám</Label>
            <InputControl
              id="bank_account"
              value={form.bank_account}
              onChange={set("bank_account")}
              placeholder="12345678-12345678-12345678"
            />
          </div>

          <div style={fieldStyle}>
            <Label htmlFor="notes">Megjegyzések</Label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={set("notes")}
              placeholder="Egyéb megjegyzések..."
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid var(--color-border-subtle)",
                background: "var(--color-bg-secondary)",
                color: "var(--color-text-primary)",
                fontSize: "14px",
                resize: "vertical",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "8px",
            }}
          >
            <Button
              variant="ghost"
              type="button"
              onClick={() => router.push("/suppliers")}
            >
              Mégsem
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              <Save size={15} className="mr-2" />
              {saving ? "Mentés..." : "Mentés"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
