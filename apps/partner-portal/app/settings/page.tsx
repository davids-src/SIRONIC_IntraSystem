"use client";

import { PageHeader, Card, Button } from "@crm/ui";
import { User, Bell, Lock, ShieldCheck, Mail, Smartphone } from "lucide-react";
import { useState } from "react";

export default function PartnerSettingsPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    ticketUpdates: true,
    marketing: false,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="Beállítások"
        subtitle="Saját fiók beállítások és értesítési preferenciák"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
          gap: "24px",
        }}
      >
        {/* Értesítések */}
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
                backgroundColor: "rgba(34, 197, 94, 0.1)",
                color: "#22c55e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bell size={20} />
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
                Értesítések
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  margin: "2px 0 0",
                  color: "var(--text-muted)",
                }}
              >
                Hogyan szeretne értesülni a frissítésekről?
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Mail size={16} style={{ color: "var(--text-muted)" }} />
                <div>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    E-mail értesítések
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Alapvető kommunikációs csatorna
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(e) =>
                  setNotifications((prev) => ({ ...prev, email: e.target.checked }))
                }
                style={{
                  accentColor: "var(--accent-primary)",
                  width: "18px",
                  height: "18px",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Smartphone size={16} style={{ color: "var(--text-muted)" }} />
                <div>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    SMS Értesítések
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Sürgős hibák esetén azonnali értesítés
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifications.sms}
                onChange={(e) =>
                  setNotifications((prev) => ({ ...prev, sms: e.target.checked }))
                }
                style={{
                  accentColor: "var(--accent-primary)",
                  width: "18px",
                  height: "18px",
                }}
              />
            </div>
          </div>
        </Card>

        {/* Biztonság */}
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
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                color: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldCheck size={20} />
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
                Biztonság
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  margin: "2px 0 0",
                  color: "var(--text-muted)",
                }}
              >
                Jelszó és kétlépcsős hitelesítés
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Button
              variant="secondary"
              style={{ justifyContent: "center", width: "100%" }}
            >
              <Lock size={16} style={{ marginRight: "8px" }} />
              Jelszó módosítása
            </Button>
            <Button variant="outline" style={{ justifyContent: "center", width: "100%" }}>
              <Smartphone size={16} style={{ marginRight: "8px" }} />
              2FA Beállítása (Hamarosan)
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
