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
import { useState } from "react";
import { Save, Plus, Trash2, GripVertical } from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();

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

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          router.push("/projects");
        }}
      >
        <Card className="flex flex-col gap-4 p-6">
          <h3 className="border-b border-[var(--color-border-subtle)] pb-2 text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Alapadatok
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Projekt neve *"
                required
                placeholder="Pl. Új irodaház hálózatépítés"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-org">Ügyfél (Szervezet) *</Label>
              <Select defaultValue="org1">
                <SelectTrigger id="project-org" className="w-full">
                  <SelectValue placeholder="Válassz szervezetet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="org1">Acme Kft.</SelectItem>
                  <SelectItem value="org2">GlobalTech Zrt.</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-staff">Felelős munkatárs</Label>
              <Select defaultValue="staff1">
                <SelectTrigger id="project-staff" className="w-full">
                  <SelectValue placeholder="Válassz munkatársat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff1">Kovács János</SelectItem>
                  <SelectItem value="staff2">Nagy Péter</SelectItem>
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
              <Select defaultValue="project">
                <SelectTrigger id="project-contract-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Projekt alapú (egyszeri)</SelectItem>
                  <SelectItem value="ongoing">Folyamatos support</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Textarea label="Leírás" placeholder="Rövid összefoglaló a projektről..." />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2">
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

            <div className="flex flex-col gap-2 md:col-span-2">
              <CheckboxFieldRow
                id="portal_visible"
                defaultChecked
                label="Látható a Partner Portálon"
              />
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

        <div className="sticky bottom-4 z-10 flex flex-row items-center justify-end gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] p-4 shadow-xl">
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

function CheckboxFieldRow({
  id,
  label,
  defaultChecked,
}: {
  id: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex flex-row items-center gap-2">
      <Checkbox id={id} defaultChecked={defaultChecked} />
      <Label htmlFor={id} className="cursor-pointer font-normal">
        {label}
      </Label>
    </div>
  );
}
