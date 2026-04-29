"use client";

import { PageHeader, Card, Button, Input, Badge, Table } from "@crm/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  Briefcase,
  FolderKanban,
  Ticket,
  ClipboardList,
  BadgeCheck,
  Globe,
  Settings,
  Plus,
  AlertTriangle,
} from "lucide-react";

export default function OrganizationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("services");

  const org = {
    _id: "org1",
    name: "Acme Kft.",
    tax_id: "12345678-2-41",
    address: "1054 Budapest, Tech utca 1.",
    portal_permissions: {
      menu_tickets: true,
      menu_worklogs: true,
      menu_offers: false,
      menu_completion_certificates: true,
      menu_projects: true,
      menu_company_profile: true,
      menu_settings: true,
    },
  };

  const tabs = [
    { id: "basic", label: "Alapadatok", icon: <Building2 size={16} /> },
    { id: "services", label: "Szolgáltatások", icon: <Briefcase size={16} /> },
    { id: "projects", label: "Projektek", icon: <FolderKanban size={16} /> },
    { id: "tickets", label: "Ticketek", icon: <Ticket size={16} /> },
    { id: "worklogs", label: "Munkalapok", icon: <ClipboardList size={16} /> },
    { id: "certificates", label: "Igazolások", icon: <BadgeCheck size={16} /> },
    { id: "domain_hosting", label: "Domain & Tárhely", icon: <Globe size={16} /> },
    {
      id: "portal_permissions",
      label: "Portál jogosultságok",
      icon: <Settings size={16} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {org.name}
          </h1>
          <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)] mt-2">
            <span>Adószám: {org.tax_id}</span>
            <span>•</span>
            <span>{org.address}</span>
          </div>
        </div>
        <div>
          <Button variant="secondary" onClick={() => router.push("/organizations")}>
            Vissza
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] overflow-x-auto pb-[1px]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-[var(--color-accent-primary)] text-[var(--color-accent-primary)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-default)]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {activeTab === "basic" && (
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
              Alapadatok
            </h3>
            <div className="grid grid-cols-2 gap-4 max-w-2xl">
              <Input label="Szervezet neve" defaultValue={org.name} />
              <Input label="Adószám" defaultValue={org.tax_id} />
              <div className="col-span-2">
                <Input label="Cím" defaultValue={org.address} />
              </div>
              <div className="col-span-2 mt-4">
                <Button variant="primary">Mentés</Button>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "services" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
                Aktív szolgáltatások
              </h3>
              <div className="space-y-3">
                {[
                  "IT üzemeltetés",
                  "Hálózatépítés",
                  "NIS2 megfelelőség",
                  "Webfejlesztés",
                  "Biztonságtechnika",
                ].map((srv) => (
                  <div
                    key={srv}
                    className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-md"
                  >
                    <span className="text-sm font-medium">{srv}</span>
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-[var(--color-border-default)] bg-[var(--color-bg-primary)] text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]"
                      defaultChecked={srv === "IT üzemeltetés"}
                    />
                  </div>
                ))}
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
                  Szerződés részletei
                </h3>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Szerződés típusa
                </label>
                <select className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)] transition-colors mb-4">
                  <option value="project">Projekt alapú</option>
                  <option value="ongoing" selected>
                    Folyamatos support
                  </option>
                  <option value="mixed">Vegyes</option>
                </select>

                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Szolgáltatási megjegyzések
                </label>
                <textarea
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)] transition-colors min-h-[120px]"
                  defaultValue="24/7 SLA az IT üzemeltetésre."
                />
              </Card>
              <div className="flex justify-end">
                <Button variant="primary">Módosítások mentése</Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "domain_hosting" && (
          <div className="space-y-6">
            <Card className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Domainek
                </h3>
                <Button variant="ghost" className="h-8 px-2 text-sm">
                  <Plus size={14} className="mr-1" /> Új domain
                </Button>
              </div>

              <div className="p-3 bg-[var(--color-status-error)]/10 border border-[var(--color-status-error)]/30 rounded-md text-sm text-[var(--color-status-error)] flex items-center gap-3">
                <AlertTriangle size={16} /> <strong>acme.hu</strong> - Lejárat: 12 nap
                múlva (2026.05.11.)
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-[var(--color-text-muted)] uppercase bg-[var(--color-bg-secondary)]">
                    <tr>
                      <th className="px-4 py-2">Domain</th>
                      <th className="px-4 py-2">Regisztrátor</th>
                      <th className="px-4 py-2">Lejárat</th>
                      <th className="px-4 py-2 text-center">Auto-Renew</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[var(--color-border-subtle)]">
                      <td className="px-4 py-2 font-medium">acme.hu</td>
                      <td className="px-4 py-2 text-[var(--color-text-muted)]">
                        Rackhost
                      </td>
                      <td className="px-4 py-2 text-[var(--color-status-error)] font-medium">
                        2026.05.11.
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Badge variant="error">Kikapcsolva</Badge>
                      </td>
                    </tr>
                    <tr className="border-b border-[var(--color-border-subtle)]">
                      <td className="px-4 py-2 font-medium">acme-shop.hu</td>
                      <td className="px-4 py-2 text-[var(--color-text-muted)]">
                        Rackhost
                      </td>
                      <td className="px-4 py-2">2027.01.20.</td>
                      <td className="px-4 py-2 text-center">
                        <Badge variant="success">Aktív</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Tárhely (Hosting)
                  </h3>
                  <Button variant="ghost" className="h-8 px-2 text-sm">
                    <Plus size={14} className="mr-1" /> Új
                  </Button>
                </div>
                <div className="p-4 border border-[var(--color-border-subtle)] rounded-md bg-[var(--color-bg-secondary)]">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold">DigitalOcean Droplet</span>
                    <Badge variant="default">Aktív</Badge>
                  </div>
                  <div className="text-sm text-[var(--color-text-muted)] space-y-1">
                    <div>Csomag: 4GB / 2 CPU</div>
                    <div>Megújul: Minden hónap 1.</div>
                    <div>IP: 104.248.X.X</div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    SSL Tanúsítványok
                  </h3>
                  <Button variant="ghost" className="h-8 px-2 text-sm">
                    <Plus size={14} className="mr-1" /> Új
                  </Button>
                </div>
                <div className="p-4 border border-[var(--color-border-subtle)] rounded-md bg-[var(--color-bg-secondary)]">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold">*.acme.hu</span>
                    <Badge variant="success">Érvényes</Badge>
                  </div>
                  <div className="text-sm text-[var(--color-text-muted)] space-y-1">
                    <div>Szolgáltató: Let's Encrypt</div>
                    <div>Lejárat: 2026.06.20.</div>
                    <div>
                      Auto-renew:{" "}
                      <span className="text-[var(--color-status-success)]">Igen</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "portal_permissions" && (
          <Card className="p-6 space-y-6 max-w-2xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
              Partner Portál Láthatóság
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Kapcsold be azokat a menüpontokat, amelyeket a szervezet felhasználói
              láthatnak a Partner Portálon.
            </p>

            <div className="space-y-4">
              {Object.entries(org.portal_permissions).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-md"
                >
                  <span className="text-sm font-medium">
                    {key.replace("menu_", "").replace("_", " ").toUpperCase()}
                  </span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-[var(--color-border-default)] bg-[var(--color-bg-primary)] text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]"
                    defaultChecked={value}
                  />
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-end">
              <Button variant="primary">Jogosultságok mentése</Button>
            </div>
          </Card>
        )}

        {(activeTab === "projects" ||
          activeTab === "tickets" ||
          activeTab === "worklogs" ||
          activeTab === "certificates") && (
          <Card className="p-6 min-h-[300px] flex flex-col items-center justify-center text-[var(--color-text-muted)]">
            <div className="mb-4 opacity-50">
              {activeTab === "projects" && <FolderKanban size={48} />}
              {activeTab === "tickets" && <Ticket size={48} />}
              {activeTab === "worklogs" && <ClipboardList size={48} />}
              {activeTab === "certificates" && <BadgeCheck size={48} />}
            </div>
            <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
              Szervezethez tartozó{" "}
              {activeTab === "projects"
                ? "Projektek"
                : activeTab === "tickets"
                  ? "Ticketek"
                  : activeTab === "worklogs"
                    ? "Munkalapok"
                    : "Igazolások"}
            </h2>
            <p className="text-sm mt-2 text-center max-w-md">
              A {org.name} számára létrehozott és látható bejegyzések.
            </p>
            <Button
              variant="secondary"
              className="mt-6"
              onClick={() => router.push(`/${activeTab.replace("_", "-")}/new`)}
            >
              <Plus size={16} className="mr-2" /> Új hozzáadása
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
