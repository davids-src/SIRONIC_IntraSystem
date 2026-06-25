"use client";

import {
  PageHeader,
  Card,
  Button,
  Input,
  Textarea,
  Label,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2, GripVertical } from "lucide-react";
import type { Contact, PriceListItem } from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";

type CrmUserRow = {
  _id: string;
  display_name: string | null;
  email: string;
};

export default function NewProjectPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<CrmUserRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [contactId, setContactId] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [projectType, setProjectType] = useState("network");
  const [contractType, setContractType] = useState<string>("project");
  const [startDate, setStartDate] = useState(
    () => new Date().toISOString().split("T")[0] ?? "",
  );
  const [deadline, setDeadline] = useState("");
  const [budgetHours, setBudgetHours] = useState("");
  const [portalVisible, setPortalVisible] = useState(true);

  const [phases, setPhases] = useState<{ name: string; due_date: string }[]>([]);
  const [checklist, setChecklist] = useState<
    { label: string; category: string; required: boolean }[]
  >([]);
  const [priceList, setPriceList] = useState<PriceListItem[]>([]);
  const [requiredItems, setRequiredItems] = useState<
    {
      price_list_item_id: string;
      name: string;
      unit: string;
      required_quantity: number;
    }[]
  >([]);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [itemSearch, setItemSearch] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [cRows, uRows, pRows] = await Promise.all([
          apiJson<unknown[]>("/api/contacts", { signal: ac.signal }),
          apiJson<CrmUserRow[]>("/api/crm-users", { signal: ac.signal }),
          apiJson<PriceListItem[]>("/api/price-list", { signal: ac.signal }).catch(
            () => [],
          ),
        ]);
        const parsed = cRows.map((r) => {
          const x = r as Record<string, unknown>;
          return {
            ...(x as unknown as Contact),
            created_at: new Date(String(x["created_at"])),
            updated_at: new Date(String(x["updated_at"])),
          };
        });
        setContacts(parsed);
        setUsers(uRows);
        setPriceList(pRows.filter((p) => p.is_active && p.type === "product"));
      } catch {
        if (!ac.signal.aborted) {
          setLoadErr(
            "Nem sikerült betölteni az ügyfeleket, munkatársakat vagy az árlistát.",
          );
        }
      }
    })();
    return () => ac.abort();
  }, []);

  const applyTypePresets = (val: string) => {
    setProjectType(val);
    if (val === "web") {
      setPhases([
        { name: "Tervezés", due_date: "" },
        { name: "Design", due_date: "" },
        { name: "Fejlesztés", due_date: "" },
        { name: "Tesztelés", due_date: "" },
        { name: "Éles indítás", due_date: "" },
      ]);
      setChecklist([
        { label: "Logó HQ verzió", category: "assets", required: true },
        { label: "Főoldal szöveg", category: "content", required: true },
        { label: "Domain hozzáférés", category: "technical", required: true },
      ]);
    } else if (val === "security") {
      setPhases([
        { name: "Felmérés", due_date: "" },
        { name: "Tervezés", due_date: "" },
        { name: "Telepítés", due_date: "" },
        { name: "Beüzemelés", due_date: "" },
      ]);
      setChecklist([
        { label: "Helyszínrajz", category: "documents", required: true },
        { label: "Kamera elhelyezési igény", category: "technical", required: true },
      ]);
    } else {
      setPhases([
        { name: "Felmérés", due_date: "" },
        { name: "Tervezés", due_date: "" },
        { name: "Telepítés", due_date: "" },
        { name: "Tesztelés", due_date: "" },
        { name: "Átadás", due_date: "" },
      ]);
      setChecklist([
        { label: "Helyszínrajz / alaprajz", category: "documents", required: true },
        { label: "Eszközlista igény", category: "technical", required: true },
      ]);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !contactId) {
      setLoadErr("A projekt neve és az ügyfél kötelező.");
      return;
    }
    const staff = users.find((u) => u._id === staffId);
    const assigned_to = staff?.display_name?.trim() || staff?.email || null;
    const bh = budgetHours.trim() ? Number(budgetHours) : null;
    setSaving(true);
    setLoadErr(null);
    try {
      const phasesPayload = phases
        .map((p, i) => ({
          name: p.name.trim(),
          order: i,
          status: "pending" as const,
          due_date: p.due_date ? new Date(p.due_date) : null,
        }))
        .filter((p) => p.name.length > 0);
      const checklistPayload = checklist
        .filter((c) => c.label.trim().length > 0)
        .map((c) => ({
          label: c.label.trim(),
          category: c.category as
            | "content"
            | "assets"
            | "documents"
            | "technical"
            | "other",
          required: c.required,
        }));
      const body = {
        name: projectName.trim(),
        description: description.trim() || " ",
        contact_id: contactId,
        assigned_to,
        category: projectType,
        contract_type: contractType as "project" | "ongoing" | "mixed" | "one_time",
        start_date: startDate ? new Date(startDate) : null,
        deadline: deadline ? new Date(deadline) : null,
        budget_hours: bh !== null && !Number.isNaN(bh) ? bh : null,
        portal_visible: portalVisible,
        phases: phasesPayload,
        checklist: checklistPayload,
        required_items: requiredItems,
      };
      const created = await apiJsonBody<{ _id: string }>("/api/projects", "POST", body);
      router.push(`/projects/${created._id}`);
    } catch (err) {
      setLoadErr(err instanceof ApiError ? err.message : "Mentés sikertelen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Új projekt létrehozása"
        subtitle="Alapadatok, fázisok és ellenőrzőlisták beállítása"
        actions={
          <Button variant="secondary" onClick={() => router.push("/projects")}>
            Vissza
          </Button>
        }
      />

      {loadErr && (
        <p className="text-sm text-[var(--color-status-error)]" role="alert">
          {loadErr}
        </p>
      )}

      <form className="flex flex-col gap-6" onSubmit={(e) => void submit(e)}>
        <Card className="flex flex-col gap-4 p-6">
          <h3 className="border-b border-[var(--color-border-subtle)] pb-2 text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Alapadatok
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Projekt neve *"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Pl. Új irodaház hálózatépítés"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-org">Ügyfél (Szervezet) *</Label>
              <Select value={contactId || undefined} onValueChange={setContactId}>
                <SelectTrigger id="project-org" className="w-full">
                  <SelectValue placeholder="Válassz szervezetet" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-staff">Felelős munkatárs</Label>
              <Select value={staffId || undefined} onValueChange={setStaffId}>
                <SelectTrigger id="project-staff" className="w-full">
                  <SelectValue placeholder="Válassz munkatársat" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.display_name ?? u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-type">Típus *</Label>
              <Select value={projectType} onValueChange={applyTypePresets}>
                <SelectTrigger id="project-type" className="w-full">
                  <SelectValue placeholder="Válassz típust" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="network">Hálózatépítés</SelectItem>
                  <SelectItem value="web">Webfejlesztés</SelectItem>
                  <SelectItem value="security">Biztonságtechnika</SelectItem>
                  <SelectItem value="nis2">NIS2 megfelelőség</SelectItem>
                  <SelectItem value="it_support">IT üzemeltetés</SelectItem>
                  <SelectItem value="other">Egyéb</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-contract-type">Szerződés típusa *</Label>
              <Select value={contractType} onValueChange={setContractType}>
                <SelectTrigger id="project-contract-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Projekt alapú (egyszeri)</SelectItem>
                  <SelectItem value="ongoing">Folyamatos support</SelectItem>
                  <SelectItem value="mixed">Vegyes</SelectItem>
                  <SelectItem value="one_time">Egyszeri</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Textarea
                label="Leírás"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rövid összefoglaló a projektről..."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2">
              <Input
                type="date"
                label="Kezdés *"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                type="date"
                label="Határidő"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div>
              <Input
                type="number"
                label="Tervezett munkaórák (Budget)"
                placeholder="Pl. 120"
                value={budgetHours}
                onChange={(e) => setBudgetHours(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <div className="flex flex-row items-center gap-2">
                <Checkbox
                  id="portal_visible"
                  checked={portalVisible}
                  onCheckedChange={(v) => setPortalVisible(v === true)}
                />
                <Label htmlFor="portal_visible" className="cursor-pointer font-normal">
                  Látható a Partner Portálon
                </Label>
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <div className="flex flex-row items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Projekt fázisok
            </h3>
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-sm"
              onClick={() => setPhases([...phases, { name: "", due_date: "" }])}
            >
              <Plus size={14} className="mr-1" /> Új fázis
            </Button>
          </div>

          <p className="text-sm text-[var(--color-text-secondary)]">
            A választott típushoz tartozó sablon betöltődött. A fázisok szabadon
            szerkeszthetők, törölhetők vagy kiegészíthetők.
          </p>

          <div className="flex flex-col gap-2">
            {phases.map((phase, idx) => (
              <div
                key={idx}
                className="flex flex-row items-center gap-3 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] p-2"
              >
                <GripVertical
                  size={16}
                  className="cursor-grab text-[var(--color-text-muted)]"
                />
                <div className="min-w-0 flex-1">
                  <Input
                    value={phase.name}
                    onChange={(e) => {
                      const newP = [...phases];
                      const p = newP[idx];
                      if (p) p.name = e.target.value;
                      setPhases(newP);
                    }}
                    placeholder="Fázis neve"
                  />
                </div>
                <div className="w-40 shrink-0">
                  <Input
                    type="date"
                    value={phase.due_date}
                    onChange={(e) => {
                      const newP = [...phases];
                      const p = newP[idx];
                      if (p) p.due_date = e.target.value;
                      setPhases(newP);
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 p-0 text-[var(--color-status-error)]"
                  onClick={() => setPhases(phases.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <div className="flex flex-row items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Anyaggyűjtés checklist
            </h3>
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-sm"
              onClick={() =>
                setChecklist([
                  ...checklist,
                  { label: "", category: "other", required: false },
                ])
              }
            >
              <Plus size={14} className="mr-1" /> Új elem
            </Button>
          </div>

          <p className="text-sm text-[var(--color-text-secondary)]">
            A partner által feltöltendő anyagok (pl. logó, dokumentációk, hozzáférések).
          </p>

          <div className="flex flex-col gap-2">
            {checklist.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-row flex-wrap items-center gap-3 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] p-2"
              >
                <div className="min-w-0 flex-1 basis-[200px]">
                  <Input
                    value={item.label}
                    onChange={(e) => {
                      const newC = [...checklist];
                      const c = newC[idx];
                      if (c) c.label = e.target.value;
                      setChecklist(newC);
                    }}
                    placeholder="Anyag / információ megnevezése"
                  />
                </div>
                <div className="w-40 shrink-0">
                  <Select
                    value={item.category}
                    onValueChange={(v) => {
                      const newC = [...checklist];
                      const c = newC[idx];
                      if (c) c.category = v;
                      setChecklist(newC);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="content">Szöveg</SelectItem>
                      <SelectItem value="assets">Kép/Logó</SelectItem>
                      <SelectItem value="documents">Dokumentum</SelectItem>
                      <SelectItem value="technical">Technikai / Hozzáférés</SelectItem>
                      <SelectItem value="other">Egyéb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-28 shrink-0 flex-row items-center gap-2">
                  <Checkbox
                    id={`req_${idx}`}
                    checked={item.required}
                    onCheckedChange={(v) => {
                      const newC = [...checklist];
                      const c = newC[idx];
                      if (c) c.required = v === true;
                      setChecklist(newC);
                    }}
                  />
                  <Label
                    htmlFor={`req_${idx}`}
                    className="cursor-pointer text-xs font-normal"
                  >
                    Kötelező
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 p-0 text-[var(--color-status-error)]"
                  onClick={() => setChecklist(checklist.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <div className="flex flex-row items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Bevásárlólista / Szükséges anyagok
            </h3>
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-sm"
              onClick={() => setShowItemPicker(true)}
            >
              <Plus size={14} className="mr-1" /> Termék hozzáadása
            </Button>
          </div>

          <p className="text-sm text-[var(--color-text-secondary)]">
            Válasszon ki termékeket az árlistából és adja meg a tervezett mennyiséget.
          </p>

          <div className="flex flex-col gap-2">
            {requiredItems.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-row items-center gap-3 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] p-2"
              >
                <div className="min-w-0 flex-1 text-sm font-medium text-white px-2">
                  {item.name} ({item.unit})
                </div>
                <div className="w-32 shrink-0">
                  <Input
                    type="number"
                    min={0.01}
                    step="any"
                    value={item.required_quantity || ""}
                    onChange={(e) => {
                      const newItems = [...requiredItems];
                      const current = newItems[idx];
                      if (current)
                        current.required_quantity = Number(e.target.value) || 0;
                      setRequiredItems(newItems);
                    }}
                    placeholder="Mennyiség"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 p-0 text-[var(--color-status-error)]"
                  onClick={() =>
                    setRequiredItems(requiredItems.filter((_, i) => i !== idx))
                  }
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}

            {requiredItems.length === 0 && (
              <p className="text-sm text-gray-500 italic text-center py-4">
                Még nincsenek tételek hozzáadva.
              </p>
            )}
          </div>
        </Card>

        <div className="sticky bottom-4 z-10 flex flex-row items-center justify-end gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] p-4 shadow-xl">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Mégse
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            <Save size={16} className="mr-2" />
            {saving ? "Mentés…" : "Projekt mentése"}
          </Button>
        </div>
      </form>

      {showItemPicker && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 100,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "16px",
          }}
        >
          <Card className="p-6 w-full max-w-lg flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">Hozzáadás árlistából</h2>
              <Button variant="ghost" onClick={() => setShowItemPicker(false)}>
                Bezár
              </Button>
            </div>

            <Input
              placeholder="Keresés név vagy cikkszám alapján..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
            />

            <div className="mt-4 overflow-y-auto flex-1 flex flex-col gap-2">
              {priceList
                .filter(
                  (p) =>
                    p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                    (p.item_number &&
                      p.item_number.toLowerCase().includes(itemSearch.toLowerCase())),
                )
                .map((p) => {
                  const alreadyAdded = requiredItems.some(
                    (ri) => ri.price_list_item_id === p._id,
                  );
                  return (
                    <div
                      key={p._id}
                      className="flex justify-between items-center p-3 border border-[var(--color-border-subtle)] rounded-lg"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-semibold text-white truncate">{p.name}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {p.item_number} •{" "}
                          {new Intl.NumberFormat("hu-HU", {
                            style: "currency",
                            currency: "HUF",
                            maximumFractionDigits: 0,
                          }).format(p.net_price)}{" "}
                          / {p.unit}
                        </div>
                      </div>
                      <Button
                        variant={alreadyAdded ? "ghost" : "secondary"}
                        disabled={alreadyAdded}
                        onClick={() => {
                          setRequiredItems([
                            ...requiredItems,
                            {
                              price_list_item_id: p._id,
                              name: p.name,
                              unit: p.unit,
                              required_quantity: 1,
                            },
                          ]);
                          setShowItemPicker(false);
                          setItemSearch("");
                        }}
                      >
                        {alreadyAdded ? "Hozzáadva" : "Kiválaszt"}
                      </Button>
                    </div>
                  );
                })}
              {priceList.length === 0 && (
                <div className="text-gray-500 text-center py-4">Nincs találat.</div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
