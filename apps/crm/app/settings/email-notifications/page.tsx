"use client";

import { Card, PageHeader } from "@crm/ui";
import { useState } from "react";
import {
  Ticket,
  ClipboardList,
  BadgeCheck,
  FileText,
  FolderKanban,
  Globe,
  Mail,
  Bell,
  BellOff,
} from "lucide-react";

/* ────────────── Types ────────────── */

interface NotificationToggle {
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
}

interface NotificationGroup {
  key: string;
  title: string;
  icon: React.ReactNode;
  toggles: NotificationToggle[];
}

/* ──────── Notification Groups ──────── */

const notificationGroups: NotificationGroup[] = [
  {
    key: "tickets",
    title: "Ticketek",
    icon: <Ticket size={18} />,
    toggles: [
      {
        key: "ticket_created_internal",
        label: "Új ticket (belső)",
        description: "Értesítés új ticket létrehozásakor a hozzárendelt operátornak.",
        defaultEnabled: true,
      },
      {
        key: "ticket_created_partner",
        label: "Ticket rögzítve (partner)",
        description: "Visszaigazolás a partnernek új ticket beküldésekor.",
        defaultEnabled: true,
      },
      {
        key: "ticket_status_changed_partner",
        label: "Státusz változás (partner)",
        description: "Értesítés a partnernek ticket státusz frissítésekor.",
        defaultEnabled: true,
      },
      {
        key: "ticket_comment_to_partner",
        label: "Megjegyzés (partner felé)",
        description: "Belső megjegyzés továbbítása a partnernek.",
        defaultEnabled: true,
      },
      {
        key: "ticket_comment_to_internal",
        label: "Partner válasz (belső)",
        description: "Értesítés az operátornak partner megjegyzésekor.",
        defaultEnabled: true,
      },
    ],
  },
  {
    key: "worklogs",
    title: "Munkalapok",
    icon: <ClipboardList size={18} />,
    toggles: [
      {
        key: "worklog_finalized_partner",
        label: "Munkalap elkészült (partner)",
        description: "Értesítés a partnernek véglegesített munkalapról.",
        defaultEnabled: true,
      },
    ],
  },
  {
    key: "certificates",
    title: "Teljesítési igazolások",
    icon: <BadgeCheck size={18} />,
    toggles: [
      {
        key: "certificate_sent_partner",
        label: "Igazolás küldés (partner)",
        description: "Igazolás aláírás kérés küldése a partnernek.",
        defaultEnabled: true,
      },
      {
        key: "certificate_signed_internal",
        label: "Igazolás aláírva (belső)",
        description: "Értesítés az operátornak partner aláírásakor.",
        defaultEnabled: true,
      },
    ],
  },
  {
    key: "offers",
    title: "Ajánlatok",
    icon: <FileText size={18} />,
    toggles: [
      {
        key: "offer_sent_partner",
        label: "Ajánlat küldés (partner)",
        description: "Ajánlat kiküldése a partnernek.",
        defaultEnabled: true,
      },
      {
        key: "offer_accepted_internal",
        label: "Ajánlat elfogadva (belső)",
        description: "Értesítés ajánlat elfogadásakor.",
        defaultEnabled: true,
      },
    ],
  },
  {
    key: "projects",
    title: "Projektek",
    icon: <FolderKanban size={18} />,
    toggles: [
      {
        key: "project_created_partner",
        label: "Projekt indítás (partner)",
        description: "Értesítés a partnernek új projekt létrehozásakor.",
        defaultEnabled: true,
      },
      {
        key: "phase_completed_partner",
        label: "Fázis teljesítve (partner)",
        description: "Értesítés a partnernek fázis teljesítésekor.",
        defaultEnabled: true,
      },
      {
        key: "staging_link_added_partner",
        label: "Jóváhagyás szükséges (partner)",
        description: "Staging link és jóváhagyás kérés a partnernek.",
        defaultEnabled: true,
      },
      {
        key: "staging_approved_internal",
        label: "Verzió jóváhagyva (belső)",
        description: "Értesítés a partner jóváhagyásakor.",
        defaultEnabled: true,
      },
      {
        key: "staging_changes_requested_internal",
        label: "Módosítás kérés (belső)",
        description: "Értesítés partner módosítási kérelméről.",
        defaultEnabled: true,
      },
      {
        key: "checklist_item_uploaded_internal",
        label: "Anyag feltöltve (belső)",
        description: "Értesítés partner anyag feltöltésekor.",
        defaultEnabled: true,
      },
    ],
  },
  {
    key: "portal",
    title: "Portál hozzáférés",
    icon: <Globe size={18} />,
    toggles: [
      {
        key: "portal_invite",
        label: "Portál meghívó",
        description: "Meghívó e-mail a Partner Portálhoz.",
        defaultEnabled: true,
      },
      {
        key: "password_reset",
        label: "Jelszó visszaállítás",
        description: "Jelszó visszaállítási e-mail.",
        defaultEnabled: true,
      },
    ],
  },
];

/* ──────── Toggle Switch ──────── */

function Toggle({
  enabled,
  onToggle,
  id,
}: {
  enabled: boolean;
  onToggle: () => void;
  id: string;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className="toggle-switch"
      style={{
        position: "relative",
        width: "44px",
        height: "24px",
        borderRadius: "12px",
        border: "none",
        cursor: "pointer",
        transition: "background-color 0.2s ease",
        backgroundColor: enabled
          ? "var(--color-accent, #e53935)"
          : "var(--color-border-subtle, #d1d5db)",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "2px",
          left: enabled ? "22px" : "2px",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          backgroundColor: "#ffffff",
          transition: "left 0.2s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}
      />
    </button>
  );
}

/* ──────── Main Page ──────── */

export default function EmailNotificationsPage() {
  const [settings, setSettings] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of notificationGroups) {
      for (const toggle of group.toggles) {
        initial[toggle.key] = toggle.defaultEnabled;
      }
    }
    return initial;
  });

  const handleToggle = (key: string) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGroupToggle = (group: NotificationGroup, enable: boolean) => {
    setSettings((prev) => {
      const next = { ...prev };
      for (const toggle of group.toggles) {
        next[toggle.key] = enable;
      }
      return next;
    });
  };

  const totalEnabled = Object.values(settings).filter(Boolean).length;
  const totalToggles = Object.keys(settings).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="E-mail értesítések"
        subtitle="Automatikus e-mail értesítések be- és kikapcsolása modulonként"
      />

      {/* Summary bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "var(--color-accent-muted, #fef2f2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Mail size={18} style={{ color: "var(--color-accent, #e53935)" }} />
            </div>
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                {totalEnabled} / {totalToggles} értesítés aktív
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                SMTP: no-reply@sironic.hu
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const all: Record<string, boolean> = {};
                for (const k of Object.keys(settings)) all[k] = true;
                setSettings(all);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-md border"
              style={{
                borderColor: "var(--color-border-subtle, #e5e7eb)",
                color: "var(--color-text-primary)",
                backgroundColor: "var(--color-bg, #ffffff)",
              }}
            >
              <Bell size={12} className="inline mr-1.5" />
              Mind be
            </button>
            <button
              onClick={() => {
                const all: Record<string, boolean> = {};
                for (const k of Object.keys(settings)) all[k] = false;
                setSettings(all);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-md border"
              style={{
                borderColor: "var(--color-border-subtle, #e5e7eb)",
                color: "var(--color-text-muted)",
                backgroundColor: "var(--color-bg, #ffffff)",
              }}
            >
              <BellOff size={12} className="inline mr-1.5" />
              Mind ki
            </button>
          </div>
        </div>
      </Card>

      {/* Notification groups */}
      <div className="space-y-4">
        {notificationGroups.map((group) => {
          const groupEnabled = group.toggles.every((t) => settings[t.key]);
          const groupPartial =
            group.toggles.some((t) => settings[t.key]) && !groupEnabled;

          return (
            <Card key={group.key} className="overflow-hidden">
              {/* Group header */}
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{
                  borderBottom: "1px solid var(--color-border-subtle, #e5e7eb)",
                  backgroundColor: "var(--color-bg-secondary, #fafafa)",
                }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ color: "var(--color-accent, #e53935)" }}>
                    {group.icon}
                  </span>
                  <h3
                    className="text-sm font-bold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {group.title}
                  </h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: groupEnabled
                        ? "var(--color-accent-muted, #fef2f2)"
                        : groupPartial
                          ? "var(--color-warning-muted, #fffbeb)"
                          : "var(--color-bg-tertiary, #f3f4f6)",
                      color: groupEnabled
                        ? "var(--color-accent, #e53935)"
                        : groupPartial
                          ? "#d97706"
                          : "var(--color-text-muted, #6b7280)",
                    }}
                  >
                    {group.toggles.filter((t) => settings[t.key]).length}/
                    {group.toggles.length}
                  </span>
                </div>
                <Toggle
                  id={`group-toggle-${group.key}`}
                  enabled={groupEnabled}
                  onToggle={() => handleGroupToggle(group, !groupEnabled)}
                />
              </div>

              {/* Individual toggles */}
              <div
                className="divide-y"
                style={{ borderColor: "var(--color-border-subtle, #f3f4f6)" }}
              >
                {group.toggles.map((toggle) => (
                  <div
                    key={toggle.key}
                    className="flex items-center justify-between px-6 py-3.5"
                    style={{
                      opacity: settings[toggle.key] ? 1 : 0.6,
                      transition: "opacity 0.15s ease",
                    }}
                  >
                    <div className="pr-4">
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {toggle.label}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {toggle.description}
                      </p>
                    </div>
                    <Toggle
                      id={`toggle-${toggle.key}`}
                      enabled={settings[toggle.key] ?? false}
                      onToggle={() => handleToggle(toggle.key)}
                    />
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Save hint */}
      <Card className="p-4">
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          (UI demo) A beállítások mentése API/DB integráció után kerül megvalósításra.
        </p>
      </Card>
    </div>
  );
}
