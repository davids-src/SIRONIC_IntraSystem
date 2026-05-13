"use client";

import {
  Card,
  Button,
  Badge,
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  InputControl,
} from "@crm/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, use, Suspense } from "react";
import {
  Save,
  FileSignature,
  CheckCircle2,
  Plus,
  Trash2,
  Download,
  ArrowLeft,
} from "lucide-react";

const WORK_CATEGORIES = [
  "IT Támogatás",
  "Hálózatépítés",
  "Biztonságtechnika",
  "Karbantartás",
  "Egyéb",
];
const mockContacts = [
  { _id: "org1", name: "Acme Kft." },
  { _id: "org2", name: "Alpha Épület Zrt." },
  { _id: "org3", name: "Beta Logisztika Kft." },
];
const mockTechnicians = ["Kovács János", "Nagy Péter", "Szabó Anna"];

const sectionHeaderCls = "text-xs font-semibold uppercase tracking-wider pb-2 border-b";

function WorklogFormContent({ id }: { id: string }) {
  const router = useRouter();
  const isNew = id === "new";
  const [status, setStatus] = useState("draft");

  // Form fields
  const [contactId, setContactId] = useState(isNew ? "" : "org1");
  const [category, setCategory] = useState(isNew ? "" : "IT Támogatás");
  const [technician, setTechnician] = useState(isNew ? "" : "Kovács János");
  const [workDate, setWorkDate] = useState(new Date().toISOString().split("T")[0]);
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("16:00");
  const [siteAddress, setSiteAddress] = useState(isNew ? "" : "Központi iroda, Budapest");
  const [description, setDescription] = useState(
    isNew ? "" : "Szerver hiba elhárítása, hálózati switch újraindítása.",
  );
  const [travelKm, setTravelKm] = useState(isNew ? "" : "15");
  const [notes, setNotes] = useState(
    isNew ? "" : "A switch egyik portja kontakthibás volt.",
  );
  const [technicianName, setTechnicianName] = useState(isNew ? "" : "Kovács János");
  const [clientName, setClientName] = useState(isNew ? "" : "Nagy Péter");

  const disabled = status !== "draft";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/worklogs");
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <div
      className={sectionHeaderCls}
      style={{
        color: "var(--color-text-muted)",
        borderColor: "var(--color-border-subtle)",
      }}
    >
      {title}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <button
            onClick={() => router.push("/worklogs")}
            className="flex items-center gap-1.5 text-sm mb-1 w-fit"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              padding: 0,
            }}
          >
            <ArrowLeft size={14} />
            Vissza a munkalapokhoz
          </button>
          <h1 className="text-2xl font-bold text-white truncate">
            {isNew
              ? "Új munkalap rögzítése"
              : `Munkalap: WL-${id.slice(-6).padStart(6, "0")}`}
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Részletes adminisztráció és anyagfelhasználás
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {!isNew && (
            <Badge variant={status === "draft" ? "default" : "success"}>
              {status === "draft" ? "Piszkozat" : "Véglegesített"}
            </Badge>
          )}
          {status === "finalized" && (
            <Button
              variant="secondary"
              onClick={() => window.open(`/worklogs/${id}/print`, "_blank")}
            >
              <Download size={15} style={{ marginRight: "6px" }} />
              PDF
            </Button>
          )}
          {status === "draft" && !isNew && (
            <Button variant="primary" onClick={() => setStatus("finalized")}>
              <CheckCircle2 size={15} style={{ marginRight: "6px" }} />
              Véglegesítés
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Section 1: Alapadatok */}
        <div
          className="rounded-xl border p-6 flex flex-col gap-4"
          style={{
            background: "var(--color-bg-card)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <SectionHeader title="Alapadatok" />

          {/* Row 1: Szervezet | Munkavégzés típusa | Technikus */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="wl-contact">Szervezet *</Label>
              <Select
                value={contactId || "__empty__"}
                onValueChange={(v) => setContactId(v === "__empty__" ? "" : v)}
                disabled={disabled}
              >
                <SelectTrigger id="wl-contact" className="w-full">
                  <SelectValue placeholder="-- Szervezet --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">-- Szervezet --</SelectItem>
                  {mockContacts.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="wl-category">Munkavégzés típusa *</Label>
              <Select
                value={category || "__empty__"}
                onValueChange={(v) => setCategory(v === "__empty__" ? "" : v)}
                disabled={disabled}
              >
                <SelectTrigger id="wl-category" className="w-full">
                  <SelectValue placeholder="-- Típus --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">-- Típus --</SelectItem>
                  {WORK_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="wl-technician">Technikus</Label>
              <Select
                value={technician || "__empty__"}
                onValueChange={(v) => setTechnician(v === "__empty__" ? "" : v)}
                disabled={disabled}
              >
                <SelectTrigger id="wl-technician" className="w-full">
                  <SelectValue placeholder="-- Technikus --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">-- Technikus --</SelectItem>
                  {mockTechnicians.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Dátum | Kezdés | Befejezés */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Input
              type="date"
              label="Dátum *"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              required
              disabled={disabled}
            />
            <Input
              type="time"
              label="Kezdés *"
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
              required
              disabled={disabled}
            />
            <Input
              type="time"
              label="Befejezés *"
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
              required
              disabled={disabled}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Input
              label="Helyszín / Cím"
              type="text"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="Pl. Központi iroda, Budapest"
              disabled={disabled}
            />
          </div>
        </div>

        {/* Section 2: Részletek */}
        <div
          className="rounded-xl border p-6 flex flex-col gap-4"
          style={{
            background: "var(--color-bg-card)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <SectionHeader title="Részletek" />

          <Textarea
            label="Elvégzett munka részletes leírása *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            disabled={disabled}
            placeholder="Részletes leírás..."
            rows={4}
            className="min-h-[120px] resize-y"
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Input
              type="number"
              label="Kiszállás / Útiköltség (km)"
              value={travelKm}
              onChange={(e) => setTravelKm(e.target.value)}
              placeholder="Pl. 15"
              disabled={disabled}
              min={0}
            />
            <Textarea
              label="Belső megjegyzés (ügyfél nem látja)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={disabled}
              placeholder="Belső feljegyzések..."
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        {/* Section 3: Szervizelt eszközök */}
        <div
          className="rounded-xl border p-6 flex flex-col gap-4"
          style={{
            background: "var(--color-bg-card)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <div className="flex items-center justify-between">
            <div
              className={sectionHeaderCls + " flex-1"}
              style={{
                color: "var(--color-text-muted)",
                borderColor: "var(--color-border-subtle)",
              }}
            >
              Szervizelt Eszközök
            </div>
            {!disabled && (
              <button
                type="button"
                className="text-xs flex items-center gap-1 px-2 py-1 rounded-md ml-3"
                style={{
                  background: "var(--color-bg-secondary)",
                  color: "var(--color-accent-primary)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Plus size={13} /> Új eszköz
              </button>
            )}
          </div>
          <div
            className="overflow-x-auto rounded-lg border"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            <table className="w-full min-w-[640px]">
              <thead>
                <tr
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderBottom: "1px solid var(--color-border-subtle)",
                  }}
                >
                  {["Eszköz neve", "Típus", "Sorozatszám", "Elvégzett feladat", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 whitespace-nowrap"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                  {["SRV-01", "Szerver", "SN-123", "Újraindítás"].map((val, i) => (
                    <td key={i} className="p-2">
                      <InputControl
                        defaultValue={!isNew ? val : ""}
                        placeholder={
                          ["Eszköz neve", "Típus", "SN...", "Elvégzett feladat"][i]
                        }
                        disabled={disabled}
                        type={i === 2 ? "number" : "text"}
                        className="h-9 w-full min-w-[100px] text-sm md:min-w-[120px]"
                        style={{
                          minWidth: i === 3 ? "200px" : i === 2 ? "140px" : "120px",
                        }}
                      />
                    </td>
                  ))}
                  <td className="p-2 text-center">
                    {!disabled && (
                      <button
                        type="button"
                        className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                        style={{
                          border: "none",
                          cursor: "pointer",
                          background: "transparent",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Felhasznált anyagok */}
        <div
          className="rounded-xl border p-6 flex flex-col gap-4"
          style={{
            background: "var(--color-bg-card)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <div className="flex items-center justify-between">
            <div
              className={sectionHeaderCls + " flex-1"}
              style={{
                color: "var(--color-text-muted)",
                borderColor: "var(--color-border-subtle)",
              }}
            >
              Felhasznált Anyagok
            </div>
            {!disabled && (
              <button
                type="button"
                className="text-xs flex items-center gap-1 px-2 py-1 rounded-md ml-3"
                style={{
                  background: "var(--color-bg-secondary)",
                  color: "var(--color-accent-primary)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Plus size={13} /> Új anyag
              </button>
            )}
          </div>
          <div
            className="overflow-x-auto rounded-lg border"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            <table className="w-full min-w-[580px]">
              <thead>
                <tr
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderBottom: "1px solid var(--color-border-subtle)",
                  }}
                >
                  {["Megnevezés", "Cikkszám", "Mennyiség", "Egység", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 whitespace-nowrap"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                  {["CAT6 Patch kábel 2m", "CAB-001", "1", "db"].map((val, i) => (
                    <td key={i} className="p-2">
                      <InputControl
                        defaultValue={!isNew ? val : ""}
                        placeholder={["Anyag neve", "Opcionális", "0", "db, m..."][i]}
                        type={i === 2 ? "number" : "text"}
                        disabled={disabled}
                        className="h-9 w-full min-w-[100px] text-sm"
                        style={{ minWidth: i === 0 ? "200px" : "100px" }}
                      />
                    </td>
                  ))}
                  <td className="p-2 text-center">
                    {!disabled && (
                      <button
                        type="button"
                        className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                        style={{
                          border: "none",
                          cursor: "pointer",
                          background: "transparent",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 5: Aláírások */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: "Technikus aláírása",
              nameLabel: "Technikus neve *",
              nameValue: technicianName,
              setName: setTechnicianName,
            },
            {
              title: "Ügyfél aláírása",
              nameLabel: "Ügyfél neve (opcionális)",
              nameValue: clientName,
              setName: setClientName,
            },
          ].map((sig) => (
            <div
              key={sig.title}
              className="rounded-xl border p-6 flex flex-col gap-4"
              style={{
                background: "var(--color-bg-card)",
                borderColor: "var(--color-border-subtle)",
              }}
            >
              <div
                className={sectionHeaderCls + " flex items-center gap-2"}
                style={{
                  color: "var(--color-text-muted)",
                  borderColor: "var(--color-border-subtle)",
                }}
              >
                <FileSignature size={14} /> {sig.title}
              </div>
              <Input
                label={sig.nameLabel}
                type="text"
                value={sig.nameValue}
                onChange={(e) => sig.setName(e.target.value)}
                disabled={disabled}
              />
              <div
                className="h-32 rounded-lg flex items-center justify-center border-dashed border-2 text-sm"
                style={{
                  borderColor: "var(--color-border-default)",
                  color: "var(--color-text-muted)",
                }}
              >
                Aláírás pad helye
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        {!disabled && (
          <div
            className="flex items-center justify-between gap-4 pt-6 border-t"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            <div>
              <Badge variant="default">Piszkozat</Badge>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Mégse
              </Button>
              <Button type="submit" variant="primary">
                <Save size={15} style={{ marginRight: "6px" }} />
                Mentés piszkozatként
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default function WorklogFormPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={<div className="p-6 text-white">Betöltés...</div>}>
      <WorklogFormContent id={resolvedParams.id} />
    </Suspense>
  );
}
