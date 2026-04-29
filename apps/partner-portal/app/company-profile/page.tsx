"use client";

import { PageHeader, Card, Button, Input } from "@crm/ui";
import { Building2, Mail, Phone, MapPin, Save, Globe } from "lucide-react";
import { useState } from "react";

export default function CompanyProfilePage() {
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="Cégprofil"
        subtitle="Saját céges adatok, számlázási információk és kapcsolattartók kezelése"
        actions={
          <Button variant="primary" onClick={handleSave}>
            {saving ? (
              "Mentés..."
            ) : (
              <>
                <Save size={16} style={{ marginRight: "8px" }} />
                Adatok mentése
              </>
            )}
          </Button>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
          gap: "24px",
        }}
      >
        {/* Alap adatok */}
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
              <p
                style={{
                  fontSize: "0.875rem",
                  margin: "2px 0 0",
                  color: "var(--text-muted)",
                }}
              >
                A cég hivatalos adatai
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Input label="Cégnév" defaultValue="Kovács és Társa Kft." />
            <Input label="Adószám" defaultValue="12345678-2-11" />
            <Input label="Cégjegyzékszám" defaultValue="01-09-123456" />
            <Input label="Weboldal" defaultValue="www.kovacs-tarsa.hu" />
          </div>
        </Card>

        {/* Elérhetőségek */}
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
                Elérhetőségek
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  margin: "2px 0 0",
                  color: "var(--text-muted)",
                }}
              >
                Központi iroda és kapcsolattartás
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Input label="Irányítószám, Város" defaultValue="1111 Budapest" />
            <Input label="Utca, házszám" defaultValue="Minta utca 12." />
            <Input label="Központi E-mail" defaultValue="info@kovacs-tarsa.hu" />
            <Input label="Központi Telefonszám" defaultValue="+36 1 234 5678" />
          </div>
        </Card>
      </div>
    </div>
  );
}
