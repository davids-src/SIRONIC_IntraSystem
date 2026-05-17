"use client";

import {
  Card,
  Button,
  Input,
  Badge,
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@crm/ui";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import type {
  Address,
  Contact,
  DomainHostingRecord,
  InventoryItem,
  PortalPermissions,
  PortalUser,
} from "@crm/types";
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
  Server,
  FileSignature,
  UserPlus,
  User,
} from "lucide-react";
import { ContactContractsTab } from "../../contacts/[id]/ContactContractsTab";

const SERVICE_OPTIONS = [
  "IT üzemeltetés",
  "Hálózatépítés",
  "NIS2 megfelelőség",
  "Webfejlesztés",
  "Biztonságtechnika",
] as const;

const PORTAL_PERM_LABELS: Record<keyof PortalPermissions, string> = {
  menu_tickets: "Ticketek",
  menu_worklogs: "Munkalapok",
  menu_offers: "Ajánlatok",
  menu_completion_certificates: "Teljesítési igazolások",
  menu_projects: "Projektek",
  menu_contracts: "Szerződések",
  menu_invoices: "Számlák",
  menu_company_profile: "Cégprofil",
  menu_settings: "Beállítások",
};

function parseContact(raw: unknown): Contact {
  const r = raw as Record<string, unknown>;
  return {
    ...(r as unknown as Contact),
    created_at: new Date(String(r.created_at)),
    updated_at: new Date(String(r.updated_at)),
  };
}

function parseInventoryRows(raw: unknown[]): InventoryItem[] {
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      ...(r as unknown as InventoryItem),
      warranty_end: r.warranty_end ? new Date(String(r.warranty_end)) : null,
      created_at: new Date(String(r.created_at)),
      updated_at: new Date(String(r.updated_at)),
    };
  });
}

function parseDomainRows(raw: unknown[]): DomainHostingRecord[] {
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      ...(r as unknown as DomainHostingRecord),
      expiry_date: r.expiry_date ? new Date(String(r.expiry_date)) : null,
      created_at: new Date(String(r.created_at)),
      updated_at: new Date(String(r.updated_at)),
    };
  });
}

function fmtAddr(a: Address | null | undefined): string {
  if (!a) return "";
  return [a.street, a.zip, a.city, a.country].filter(Boolean).join(", ");
}

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("hu-HU").format(d);
}

export default function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("services");
  const [contact, setContact] = useState<Contact | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [domainRows, setDomainRows] = useState<DomainHostingRecord[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  const [servicesSel, setServicesSel] = useState<string[]>([]);
  const [contractType, setContractType] = useState<Contact["contract_type"]>("ongoing");
  const [serviceNotes, setServiceNotes] = useState("");

  const [portalPerms, setPortalPerms] = useState<PortalPermissions | null>(null);

  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const raw = await apiJson<unknown>(`/api/contacts/${id}`, { signal: ac.signal });
        const c = parseContact(raw);
        setContact(c);
        setName(c.name);
        setTaxNumber(c.tax_number ?? "");
        setStreet(c.address?.street ?? "");
        setZip(c.address?.zip ?? "");
        setCity(c.address?.city ?? "");
        setCountry(c.address?.country ?? "");
        setServicesSel([...c.active_services]);
        setContractType(c.contract_type ?? "ongoing");
        setServiceNotes(c.notes ?? "");
        setPortalPerms({ ...c.portal_permissions });
        setLoadErr(null);

        if (id !== "new") {
          try {
            const puRaw = await apiJson<unknown[]>(`/api/portal-users?contact_id=${id}`, {
              signal: ac.signal,
            });
            setPortalUsers(puRaw as PortalUser[]);
          } catch (e) {
            console.error("Failed to load portal users", e);
          }
        }
      } catch {
        if (!ac.signal.aborted) {
          setLoadErr("Nem sikerült betölteni a kapcsolatot.");
        }
      }
    })();
    return () => ac.abort();
  }, [id]);

  useEffect(() => {
    if (!contact) return;
    const ac = new AbortController();
    (async () => {
      try {
        const [inv, dom] = await Promise.all([
          apiJson<unknown[]>(`/api/inventory?contact_id=${id}`, { signal: ac.signal }),
          apiJson<unknown[]>(`/api/domain-hosting?contact_id=${id}`, {
            signal: ac.signal,
          }),
        ]);
        setInventory(parseInventoryRows(inv));
        setDomainRows(parseDomainRows(dom));
      } catch {
        /* list errors are non-fatal */
      }
    })();
    return () => ac.abort();
  }, [id, contact]);

  const saveBasic = async () => {
    setSaving(true);
    setLoadErr(null);
    try {
      const raw = await apiJsonBody(`/api/contacts/${id}`, "PATCH", {
        name: name.trim(),
        tax_number: taxNumber.trim() || null,
        address: {
          street: street.trim(),
          zip: zip.trim(),
          city: city.trim(),
          country: country.trim(),
        },
      });
      setContact(parseContact(raw));
    } catch (e) {
      setLoadErr(e instanceof ApiError ? e.message : "Mentés sikertelen.");
    } finally {
      setSaving(false);
    }
  };

  const saveServices = async () => {
    setSaving(true);
    setLoadErr(null);
    try {
      const raw = await apiJsonBody(`/api/contacts/${id}`, "PATCH", {
        active_services: servicesSel,
        contract_type: contractType,
        notes: serviceNotes.trim() || null,
      });
      setContact(parseContact(raw));
    } catch (e) {
      setLoadErr(e instanceof ApiError ? e.message : "Mentés sikertelen.");
    } finally {
      setSaving(false);
    }
  };

  const savePortal = async () => {
    if (!portalPerms) return;
    setSaving(true);
    setLoadErr(null);
    try {
      const raw = await apiJsonBody(`/api/contacts/${id}`, "PATCH", {
        portal_permissions: portalPerms,
      });
      setContact(parseContact(raw));
      setPortalPerms({ ...parseContact(raw).portal_permissions });
    } catch (e) {
      setLoadErr(e instanceof ApiError ? e.message : "Mentés sikertelen.");
    } finally {
      setSaving(false);
    }
  };

  const invitePortalUser = async () => {
    if (!inviteEmail.trim() || !invitePassword.trim()) {
      alert("Email és jelszó kötelező!");
      return;
    }
    setInviting(true);
    try {
      const raw = await apiJsonBody("/api/portal-users", "POST", {
        contact_id: id,
        email: inviteEmail.trim(),
        password: invitePassword,
        display_name: inviteName.trim() || undefined,
        roleKeys: ["partner.admin"],
      });
      setPortalUsers((prev) => [...prev, raw as PortalUser]);
      setInviteEmail("");
      setInviteName("");
      setInvitePassword("");
      alert("Felhasználó sikeresen létrehozva!");
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Hiba történt a meghívás során.");
    } finally {
      setInviting(false);
    }
  };

  const refreshInventory = async () => {
    const inv = await apiJson<unknown[]>(`/api/inventory?contact_id=${id}`);
    setInventory(parseInventoryRows(inv));
  };

  const refreshDomain = async () => {
    const dom = await apiJson<unknown[]>(`/api/domain-hosting?contact_id=${id}`);
    setDomainRows(parseDomainRows(dom));
  };

  const addDomainRow = async (record_type: DomainHostingRecord["record_type"]) => {
    const label = window.prompt("Megnevezés (pl. domain vagy csomag neve)")?.trim();
    if (!label || !contact) return;
    await apiJsonBody("/api/domain-hosting", "POST", {
      contact_id: contact._id,
      record_type,
      label,
      provider: null,
      expiry_date: null,
      auto_renew: null,
      details: null,
    });
    await refreshDomain();
  };

  const addInventoryItem = async () => {
    if (!contact) return;
    const nameIn = window.prompt("Eszköz megnevezése")?.trim();
    if (!nameIn) return;
    await apiJsonBody("/api/inventory", "POST", {
      contact_id: contact._id,
      name: nameIn,
      category: "hardware",
      status: "active",
    });
    await refreshInventory();
  };

  if (!contact && !loadErr) {
    return (
      <div className="flex flex-col gap-4 p-6 text-[var(--color-text-muted)]">
        Betöltés…
      </div>
    );
  }

  if (loadErr && !contact) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <p className="text-[var(--color-status-error)]">{loadErr}</p>
        <Button variant="secondary" onClick={() => router.push("/organizations")}>
          Vissza
        </Button>
      </div>
    );
  }

  if (!contact) {
    return null;
  }

  const tabs = [
    { id: "basic", label: "Alapadatok", icon: <Building2 size={16} /> },
    { id: "services", label: "Szolgáltatások", icon: <Briefcase size={16} /> },
    { id: "projects", label: "Projektek", icon: <FolderKanban size={16} /> },
    { id: "tickets", label: "Ticketek", icon: <Ticket size={16} /> },
    { id: "worklogs", label: "Munkalapok", icon: <ClipboardList size={16} /> },
    { id: "certificates", label: "Igazolások", icon: <BadgeCheck size={16} /> },
    { id: "contracts", label: "Szerződések", icon: <FileSignature size={16} /> },
    { id: "domain_hosting", label: "Domain & Tárhely", icon: <Globe size={16} /> },
    { id: "inventory", label: "Rendszerelemek", icon: <Server size={16} /> },
    {
      id: "portal_permissions",
      label: "Portál jogosultságok",
      icon: <Settings size={16} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {loadErr && (
        <p className="text-sm text-[var(--color-status-error)] px-1" role="alert">
          {loadErr}
        </p>
      )}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {contact.name}
          </h1>
          <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)] mt-2">
            <span>Adószám: {contact.tax_number ?? "—"}</span>
            <span>•</span>
            <span>{fmtAddr(contact.address)}</span>
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
              <Input
                label="Szervezet neve"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="Adószám"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
              />
              <Input
                label="Utca, házszám"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="col-span-2"
              />
              <Input
                label="Irányítószám"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
              />
              <Input
                label="Város"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                label="Ország"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="col-span-2"
              />
              <div className="col-span-2 mt-4">
                <Button
                  variant="primary"
                  disabled={saving}
                  onClick={() => void saveBasic()}
                >
                  {saving ? "Mentés…" : "Mentés"}
                </Button>
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
                {SERVICE_OPTIONS.map((srv) => (
                  <div
                    key={srv}
                    className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-md"
                  >
                    <span className="text-sm font-medium">{srv}</span>
                    <Checkbox
                      checked={servicesSel.includes(srv)}
                      onCheckedChange={(v) => {
                        const on = v === true;
                        setServicesSel((prev) =>
                          on ? [...prev, srv] : prev.filter((s) => s !== srv),
                        );
                      }}
                      aria-label={srv}
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
                <div className="mb-4 flex flex-col gap-1.5">
                  <Label htmlFor="org-contract-type">Szerződés típusa</Label>
                  <Select
                    value={contractType ?? "ongoing"}
                    onValueChange={(v) => setContractType(v as Contact["contract_type"])}
                  >
                    <SelectTrigger id="org-contract-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project">Projekt alapú</SelectItem>
                      <SelectItem value="ongoing">Folyamatos support</SelectItem>
                      <SelectItem value="mixed">Vegyes</SelectItem>
                      <SelectItem value="one_time">Egyszeri</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Textarea
                  label="Megjegyzések (kapcsolat)"
                  value={serviceNotes}
                  onChange={(e) => setServiceNotes(e.target.value)}
                  className="min-h-[120px]"
                />
              </Card>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  disabled={saving}
                  onClick={() => void saveServices()}
                >
                  {saving ? "Mentés…" : "Módosítások mentése"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "domain_hosting" && (
          <div className="space-y-6">
            <Card className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Domain, tárhely, SSL
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-2 text-sm"
                    onClick={() => void addDomainRow("domain")}
                  >
                    <Plus size={14} className="mr-1" /> Új domain
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-2 text-sm"
                    onClick={() => void addDomainRow("hosting")}
                  >
                    <Plus size={14} className="mr-1" /> Új tárhely
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-2 text-sm"
                    onClick={() => void addDomainRow("ssl")}
                  >
                    <Plus size={14} className="mr-1" /> Új SSL
                  </Button>
                </div>
              </div>

              {domainRows.some(
                (r) =>
                  r.expiry_date &&
                  r.expiry_date.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 &&
                  r.expiry_date.getTime() > Date.now(),
              ) && (
                <div className="p-3 bg-[var(--color-status-warning)]/10 border border-[var(--color-status-warning)]/30 rounded-md text-sm text-[var(--color-status-warning)] flex items-center gap-3">
                  <AlertTriangle size={16} />{" "}
                  <span>
                    Van 30 napon belül lejáró bejegyzés — ellenőrizd a táblázatot.
                  </span>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-[var(--color-text-muted)] uppercase bg-[var(--color-bg-secondary)]">
                    <tr>
                      <th className="px-4 py-2">Típus</th>
                      <th className="px-4 py-2">Megnevezés</th>
                      <th className="px-4 py-2">Szolgáltató</th>
                      <th className="px-4 py-2">Lejárat</th>
                      <th className="px-4 py-2 text-center">Auto-renew</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domainRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-[var(--color-text-muted)]"
                        >
                          Még nincs bejegyzés. Használd az „Új …” gombokat.
                        </td>
                      </tr>
                    ) : (
                      domainRows.map((row) => (
                        <tr
                          key={row._id}
                          className="border-b border-[var(--color-border-subtle)]"
                        >
                          <td className="px-4 py-2 font-medium capitalize">
                            {row.record_type}
                          </td>
                          <td className="px-4 py-2">{row.label}</td>
                          <td className="px-4 py-2 text-[var(--color-text-muted)]">
                            {row.provider ?? "—"}
                          </td>
                          <td className="px-4 py-2">{fmtDate(row.expiry_date)}</td>
                          <td className="px-4 py-2 text-center">
                            {row.auto_renew === true ? (
                              <Badge variant="success">Igen</Badge>
                            ) : row.auto_renew === false ? (
                              <Badge variant="error">Nem</Badge>
                            ) : (
                              <Badge variant="default">—</Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "inventory" && (
          <div className="space-y-6">
            <Card className="p-8 space-y-6 shadow-sm border border-[var(--color-border-subtle)]">
              <div className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-4">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <Server className="text-[var(--color-accent-primary)]" />
                  Rendszerelem Leltár
                </h3>
                <Button variant="primary" onClick={() => void addInventoryItem()}>
                  <Plus size={16} className="mr-2" /> Új eszköz
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-[var(--color-text-muted)] uppercase bg-[var(--color-bg-secondary)] rounded-t-lg">
                    <tr>
                      <th className="px-4 py-3 font-semibold rounded-tl-lg">
                        Eszköz Neve
                      </th>
                      <th className="px-4 py-3 font-semibold">Típus</th>
                      <th className="px-4 py-3 font-semibold">Sorozatszám (SN)</th>
                      <th className="px-4 py-3 font-semibold">Garancia lejár</th>
                      <th className="px-4 py-3 font-semibold rounded-tr-lg">Státusz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-[var(--color-text-muted)]"
                        >
                          Még nincs leltári tétel.
                        </td>
                      </tr>
                    ) : (
                      inventory.map((row) => (
                        <tr
                          key={row._id}
                          className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                        >
                          <td className="px-4 py-4 font-medium">{row.name}</td>
                          <td className="px-4 py-4 text-[var(--color-text-muted)]">
                            {row.category === "hardware"
                              ? "Hardver"
                              : row.category === "software"
                                ? "Szoftver"
                                : "Licenc"}
                          </td>
                          <td className="px-4 py-4 font-mono text-xs">
                            {row.serial_number ?? "—"}
                          </td>
                          <td className="px-4 py-4">{fmtDate(row.warranty_end)}</td>
                          <td className="px-4 py-4">
                            <Badge
                              variant={
                                row.status === "active"
                                  ? "success"
                                  : row.status === "maintenance"
                                    ? "warning"
                                    : "default"
                              }
                            >
                              {row.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "portal_permissions" && (
          <>
            <Card className="p-6 space-y-6 max-w-2xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
                Partner Portál Láthatóság
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Kapcsold be azokat a menüpontokat, amelyeket a szervezet felhasználói
                láthatnak a Partner Portálon.
              </p>

              <div className="space-y-4">
                {portalPerms &&
                  (Object.keys(PORTAL_PERM_LABELS) as (keyof PortalPermissions)[]).map(
                    (key) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-md"
                      >
                        <span className="text-sm font-medium">
                          {PORTAL_PERM_LABELS[key]}
                        </span>
                        <Checkbox
                          checked={portalPerms[key]}
                          onCheckedChange={(v) => {
                            setPortalPerms((prev) =>
                              prev ? { ...prev, [key]: v === true } : prev,
                            );
                          }}
                          aria-label={key}
                        />
                      </div>
                    ),
                  )}
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  variant="primary"
                  disabled={saving || !portalPerms}
                  onClick={() => void savePortal()}
                >
                  {saving ? "Mentés…" : "Jogosultságok mentése"}
                </Button>
              </div>
            </Card>

            <Card className="p-6 space-y-6 max-w-2xl mt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
                Hozzáférések / Felhasználók
              </h3>

              {portalUsers.length > 0 ? (
                <div className="space-y-3">
                  {portalUsers.map((pu) => (
                    <div
                      key={pu._id}
                      className="flex items-center gap-3 p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-md"
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--color-accent-badgeBg)] text-[var(--color-accent-primary)] flex items-center justify-center flex-shrink-0">
                        <User size={16} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white truncate">
                          {pu.display_name || "Névtelen felhasználó"}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)] truncate">
                          {pu.email}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)] italic">
                  Nincsenek portál felhasználók ehhez a partnerhez.
                </p>
              )}

              <div className="pt-4 border-t border-[var(--color-border-subtle)] space-y-4">
                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                  <UserPlus size={16} /> Új felhasználó meghívása
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Név"
                    placeholder="Kovács János"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                  <Input
                    label="E-mail cím *"
                    type="email"
                    placeholder="janos@ceg.hu"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <Input
                    label="Kezdeti jelszó *"
                    type="text"
                    placeholder="legalább 8 karakter"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    disabled={inviting || !inviteEmail || !invitePassword}
                    onClick={() => void invitePortalUser()}
                  >
                    {inviting ? "Létrehozás…" : "Hozzáférés létrehozása"}
                  </Button>
                </div>
              </div>
            </Card>
          </>
        )}

        {activeTab === "contracts" && (
          <div className="py-2">
            <ContactContractsTab contactId={contact._id} />
          </div>
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
              A {contact.name} számára létrehozott és látható bejegyzések.
            </p>
            <Button
              variant="secondary"
              className="mt-6"
              onClick={() => {
                const listPath =
                  activeTab === "certificates"
                    ? `/completion-certificates?contact_id=${contact._id}`
                    : `/${activeTab}?contact_id=${contact._id}`;
                router.push(listPath);
              }}
            >
              <Plus size={16} className="mr-2" /> Lista megnyitása
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
