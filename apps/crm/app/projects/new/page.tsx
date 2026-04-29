"use client";

import { PageHeader, Card, Button, Input } from "@crm/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save, Plus, Trash2, GripVertical } from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();

  // State for dynamic sections
  const [projectType, setProjectType] = useState("network");
  const [phases, setPhases] = useState([
    { name: "Felmérés", due_date: "" },
    { name: "Tervezés", due_date: "" },
    { name: "Telepítés", due_date: "" },
    { name: "Tesztelés", due_date: "" },
    { name: "Átadás", due_date: "" },
  ]);
  const [checklist, setChecklist] = useState([
    { label: "Helyszínrajz / alaprajz", category: "documents", required: true },
    { label: "Eszközlista igény", category: "technical", required: true },
  ]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setProjectType(val);

    // Apply presets
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
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Új projekt létrehozása"
        subtitle="Alapadatok, fázisok és ellenőrzőlisták beállítása"
        actions={
          <Button variant="secondary" onClick={() => router.push("/projects")}>
            Vissza
          </Button>
        }
      />

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          router.push("/projects");
        }}
      >
        {/* Basic Information */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
            Alapadatok
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <Input
                label="Projekt neve *"
                required
                placeholder="Pl. Új irodaház hálózatépítés"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                Ügyfél (Szervezet) *
              </label>
              <select
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                required
              >
                <option value="org1">Acme Kft.</option>
                <option value="org2">GlobalTech Zrt.</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                Felelős munkatárs
              </label>
              <select className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)] transition-colors">
                <option value="staff1">Kovács János</option>
                <option value="staff2">Nagy Péter</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                Típus *
              </label>
              <select
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                required
                value={projectType}
                onChange={handleTypeChange}
              >
                <option value="network">Hálózatépítés</option>
                <option value="web">Webfejlesztés</option>
                <option value="security">Biztonságtechnika</option>
                <option value="nis2">NIS2 megfelelőség</option>
                <option value="it_support">IT üzemeltetés</option>
                <option value="other">Egyéb</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                Szerződés típusa *
              </label>
              <select
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                required
              >
                <option value="project">Projekt alapú (egyszeri)</option>
                <option value="ongoing">Folyamatos support</option>
              </select>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                Leírás
              </label>
              <textarea
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)] transition-colors min-h-[80px]"
                placeholder="Rövid összefoglaló a projektről..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                label="Kezdés *"
                required
                defaultValue={new Date().toISOString().split("T")[0]}
              />
              <Input type="date" label="Határidő" />
            </div>

            <div>
              <Input
                type="number"
                label="Tervezett munkaórák (Budget)"
                placeholder="Pl. 120"
              />
            </div>

            <div className="col-span-1 md:col-span-2 flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="portal_visible"
                defaultChecked
                className="w-4 h-4 rounded border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]"
              />
              <label
                htmlFor="portal_visible"
                className="text-sm font-medium text-[var(--color-text-primary)]"
              >
                Látható a Partner Portálon
              </label>
            </div>
          </div>
        </Card>

        {/* Phases */}
        <Card className="p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Projekt fázisok
            </h3>
            <Button
              type="button"
              variant="ghost"
              className="text-sm h-8 px-2"
              onClick={() => setPhases([...phases, { name: "", due_date: "" }])}
            >
              <Plus size={14} className="mr-1" /> Új fázis
            </Button>
          </div>

          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            A választott típushoz tartozó sablon betöltődött. A fázisok szabadon
            szerkeszthetők, törölhetők vagy kiegészíthetők.
          </p>

          <div className="space-y-2">
            {phases.map((phase, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 bg-[var(--color-bg-secondary)] p-2 rounded-md border border-[var(--color-border-subtle)]"
              >
                <GripVertical
                  size={16}
                  className="text-[var(--color-text-muted)] cursor-grab"
                />
                <div className="flex-1">
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
                <div className="w-40">
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
                  className="h-9 w-9 text-[var(--color-status-error)] p-0"
                  onClick={() => setPhases(phases.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Checklist */}
        <Card className="p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Anyaggyűjtés checklist
            </h3>
            <Button
              type="button"
              variant="ghost"
              className="text-sm h-8 px-2"
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

          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            A partner által feltöltendő anyagok (pl. logó, dokumentációk, hozzáférések).
          </p>

          <div className="space-y-2">
            {checklist.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 bg-[var(--color-bg-secondary)] p-2 rounded-md border border-[var(--color-border-subtle)]"
              >
                <div className="flex-1">
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
                <div className="w-40">
                  <select
                    className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border-default)] rounded-md px-3 py-[9px] text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                    value={item.category}
                    onChange={(e) => {
                      const newC = [...checklist];
                      const c = newC[idx];
                      if (c) c.category = e.target.value;
                      setChecklist(newC);
                    }}
                  >
                    <option value="content">Szöveg</option>
                    <option value="assets">Kép/Logó</option>
                    <option value="documents">Dokumentum</option>
                    <option value="technical">Technikai / Hozzáférés</option>
                    <option value="other">Egyéb</option>
                  </select>
                </div>
                <div className="flex items-center gap-1 w-24">
                  <input
                    type="checkbox"
                    id={`req_${idx}`}
                    checked={item.required}
                    onChange={(e) => {
                      const newC = [...checklist];
                      const c = newC[idx];
                      if (c) c.required = e.target.checked;
                      setChecklist(newC);
                    }}
                    className="w-4 h-4 rounded border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]"
                  />
                  <label
                    htmlFor={`req_${idx}`}
                    className="text-xs font-medium text-[var(--color-text-primary)] cursor-pointer"
                  >
                    Kötelező
                  </label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-9 text-[var(--color-status-error)] p-0"
                  onClick={() => setChecklist(checklist.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 sticky bottom-4 bg-[var(--color-bg-card)] p-4 rounded-xl border border-[var(--color-border-subtle)] shadow-xl z-10">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Mégse
          </Button>
          <Button type="submit" variant="primary">
            <Save size={16} className="mr-2" />
            Projekt Mentése
          </Button>
        </div>
      </form>
    </div>
  );
}
