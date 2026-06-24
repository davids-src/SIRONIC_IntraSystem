"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  Button,
  Input,
  Label,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/ui";
import type { Floorplan, FloorplanMarker, MarkerType, Contact } from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import { Plus, Trash2, ArrowLeft, Save, Map, Crosshair, Upload } from "lucide-react";

const MARKER_TYPES: { value: MarkerType; label: string; color: string; emoji: string }[] =
  [
    { value: "camera", label: "Kamera", color: "#ef4444", emoji: "📷" },
    { value: "ap", label: "Access Point", color: "#3b82f6", emoji: "📡" },
    { value: "switch", label: "Switch", color: "#8b5cf6", emoji: "🔌" },
    { value: "rack", label: "Rack szekrény", color: "#f59e0b", emoji: "🗄️" },
    { value: "socket", label: "Fali csatlakozó", color: "#10b981", emoji: "🔧" },
    { value: "sensor", label: "Szenzor", color: "#06b6d4", emoji: "📊" },
    { value: "router", label: "Router", color: "#6366f1", emoji: "🌐" },
    { value: "server", label: "Szerver", color: "#84cc16", emoji: "💻" },
    { value: "other", label: "Egyéb", color: "#6b7280", emoji: "📌" },
  ];

const getMarkerInfo = (type: MarkerType) =>
  MARKER_TYPES.find((m) => m.value === type) ?? MARKER_TYPES[MARKER_TYPES.length - 1]!;

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

export default function FloorplansPage() {
  const [floorplans, setFloorplans] = useState<Floorplan[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor state
  const [editing, setEditing] = useState<Floorplan | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContactId, setNewContactId] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  // Marker placement mode
  const [placingMarkerType, setPlacingMarkerType] = useState<MarkerType | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<FloorplanMarker | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [fps, cs] = await Promise.all([
          apiJson<Floorplan[]>("/api/floorplans"),
          apiJson<Contact[]>("/api/contacts"),
        ]);
        setFloorplans(fps);
        setContacts(cs);
      } catch {
        setError("Nem sikerült betölteni az alaprajzokat.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreateNew = async () => {
    if (!newName.trim() || !newContactId || !newImageUrl.trim()) {
      alert("Minden mező kitöltése kötelező.");
      return;
    }
    setIsSaving(true);
    try {
      const created = await apiJsonBody<Floorplan>("/api/floorplans", "POST", {
        name: newName.trim(),
        contact_id: newContactId,
        image_url: newImageUrl.trim(),
        markers: [],
      });
      setFloorplans((prev) => [...prev, created]);
      setEditing(created);
      setCreating(false);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Sikertelen létrehozás.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editing || !placingMarkerType || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newMarker: FloorplanMarker = {
      marker_id: generateId(),
      x_percent: Math.round(x * 10) / 10,
      y_percent: Math.round(y * 10) / 10,
      marker_type: placingMarkerType,
      label: "",
      description: "",
      ticket_id: null,
      asset_id: null,
    };
    setEditing({ ...editing, markers: [...editing.markers, newMarker] });
    setSelectedMarker(newMarker);
    setPlacingMarkerType(null);
  };

  const handleMarkerUpdate = (field: keyof FloorplanMarker, value: string) => {
    if (!editing || !selectedMarker) return;
    const updated = editing.markers.map((m) =>
      m.marker_id === selectedMarker.marker_id ? { ...m, [field]: value } : m,
    );
    const updatedMarker = updated.find((m) => m.marker_id === selectedMarker.marker_id)!;
    setEditing({ ...editing, markers: updated });
    setSelectedMarker(updatedMarker);
  };

  const handleMarkerDelete = () => {
    if (!editing || !selectedMarker) return;
    setEditing({
      ...editing,
      markers: editing.markers.filter((m) => m.marker_id !== selectedMarker.marker_id),
    });
    setSelectedMarker(null);
  };

  const handleSaveFloorplan = async () => {
    if (!editing) return;
    setIsSaving(true);
    try {
      const saved = await apiJsonBody<Floorplan>(
        `/api/floorplans/${editing._id}`,
        "PATCH",
        {
          markers: editing.markers,
          name: editing.name,
        },
      );
      setFloorplans((prev) => prev.map((fp) => (fp._id === saved._id ? saved : fp)));
      alert("Alaprajz mentve!");
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Mentési hiba.");
    } finally {
      setIsSaving(false);
    }
  };

  const getContactName = (id: string) => contacts.find((c) => c._id === id)?.name ?? id;

  // ── EDITOR VIEW ────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-6 h-full">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setEditing(null);
              setSelectedMarker(null);
              setPlacingMarkerType(null);
            }}
            className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] bg-transparent border-none cursor-pointer p-0 hover:text-white"
          >
            <ArrowLeft size={14} /> Vissza
          </button>
          <span className="text-white font-semibold text-lg">{editing.name}</span>
          <span className="text-xs text-[var(--color-text-muted)]">
            • {getContactName(editing.contact_id)}
          </span>
          <div className="flex-1" />
          <Button variant="primary" onClick={handleSaveFloorplan} disabled={isSaving}>
            <Save size={14} style={{ marginRight: 6 }} /> Mentés
          </Button>
        </div>

        {/* Marker type selector */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-[var(--color-text-muted)] self-center mr-1">
            Elem elhelyezése:
          </span>
          {MARKER_TYPES.map((mt) => (
            <button
              key={mt.value}
              onClick={() =>
                setPlacingMarkerType(placingMarkerType === mt.value ? null : mt.value)
              }
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border transition-all"
              style={{
                background:
                  placingMarkerType === mt.value
                    ? mt.color + "30"
                    : "var(--color-bg-secondary)",
                borderColor:
                  placingMarkerType === mt.value
                    ? mt.color
                    : "var(--color-border-default)",
                color:
                  placingMarkerType === mt.value ? mt.color : "var(--color-text-muted)",
                cursor: "pointer",
              }}
            >
              {mt.emoji} {mt.label}
            </button>
          ))}
          {placingMarkerType && (
            <div className="flex items-center gap-1 text-xs text-amber-400 animate-pulse">
              <Crosshair size={13} /> Kattints az alaprajzra az elem elhelyezéséhez
            </div>
          )}
        </div>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Canvas */}
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="relative flex-1 rounded-xl overflow-hidden border"
            style={{
              borderColor: placingMarkerType ? "#f59e0b" : "var(--color-border-subtle)",
              cursor: placingMarkerType ? "crosshair" : "default",
              minHeight: 400,
              background: "#0a0a0a",
            }}
          >
            {editing.image_url && (
              <img
                src={editing.image_url}
                alt={editing.name}
                className="w-full h-full object-contain select-none pointer-events-none"
                draggable={false}
              />
            )}
            {/* Markers */}
            {editing.markers.map((m) => {
              const info = getMarkerInfo(m.marker_type);
              const isSelected = selectedMarker?.marker_id === m.marker_id;
              return (
                <div
                  key={m.marker_id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!placingMarkerType) setSelectedMarker(m);
                  }}
                  style={{
                    position: "absolute",
                    left: `${m.x_percent}%`,
                    top: `${m.y_percent}%`,
                    transform: "translate(-50%, -50%)",
                    cursor: placingMarkerType ? "crosshair" : "pointer",
                    zIndex: 10,
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-lg border-2 transition-all"
                    style={{
                      background: info.color + "cc",
                      borderColor: isSelected ? "white" : info.color,
                      transform: isSelected ? "scale(1.3)" : "scale(1)",
                    }}
                    title={m.label || info.label}
                  >
                    {info.emoji}
                  </div>
                  {m.label && (
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 text-[10px] text-white bg-black/80 px-1.5 py-0.5 rounded whitespace-nowrap">
                      {m.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Marker properties panel */}
          {selectedMarker && (
            <div
              className="w-60 flex-shrink-0 rounded-xl border p-4 flex flex-col gap-3"
              style={{
                background: "var(--color-bg-card)",
                borderColor: "var(--color-border-subtle)",
              }}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-white">
                  {getMarkerInfo(selectedMarker.marker_type).emoji}{" "}
                  {getMarkerInfo(selectedMarker.marker_type).label}
                </span>
                <button
                  onClick={handleMarkerDelete}
                  className="text-red-400 hover:text-red-300 transition-colors bg-transparent border-none cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="m-label" className="text-xs">
                  Felirat
                </Label>
                <Input
                  id="m-label"
                  value={selectedMarker.label || ""}
                  onChange={(e) => handleMarkerUpdate("label", e.target.value)}
                  placeholder="Pl. IP kamera 01"
                  className="text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="m-desc" className="text-xs">
                  Leírás
                </Label>
                <Input
                  id="m-desc"
                  value={selectedMarker.description || ""}
                  onChange={(e) => handleMarkerUpdate("description", e.target.value)}
                  placeholder="Részletek..."
                  className="text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="m-asset" className="text-xs">
                  Eszköz ID (opcionális)
                </Label>
                <Input
                  id="m-asset"
                  value={selectedMarker.asset_id || ""}
                  onChange={(e) => handleMarkerUpdate("asset_id", e.target.value)}
                  placeholder="Eszköz azonosítója"
                  className="text-xs"
                />
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mt-auto">
                Pozíció: {selectedMarker.x_percent.toFixed(1)}% /{" "}
                {selectedMarker.y_percent.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Map size={22} className="text-[var(--color-accent-primary)]" />
            Alaprajzok & Hálózati térkép
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            BIM-stílusú vizuális eszközleltár és hálózati kiosztás
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus size={16} style={{ marginRight: 6 }} /> Új alaprajz
        </Button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Create form */}
      {creating && (
        <Card
          className="p-5 flex flex-col gap-4 border-[var(--color-accent-primary)]/30"
          style={{ background: "var(--color-bg-card)" }}
        >
          <h3 className="font-semibold text-white text-sm">Új alaprajz feltöltése</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="fp-name">Megnevezés *</Label>
              <Input
                id="fp-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Pl. 1. emelet — Szerviz szoba"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="fp-contact">Partner *</Label>
              <Select
                value={newContactId || "__empty__"}
                onValueChange={(v) => setNewContactId(v === "__empty__" ? "" : v)}
              >
                <SelectTrigger id="fp-contact" className="w-full">
                  <SelectValue placeholder="-- Partner --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">-- Partner --</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="fp-url">Alaprajz kép URL *</Label>
              <Input
                id="fp-url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            💡 Tipp: Tölts fel alaprajzképet valamelyik külső tárhely szolgáltatásba (pl.
            Google Drive, Imgur), majd add meg a közvetlen URL-t.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Mégse
            </Button>
            <Button variant="primary" onClick={handleCreateNew} disabled={isSaving}>
              <Upload size={14} style={{ marginRight: 6 }} /> Létrehozás
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-10 text-[var(--color-text-muted)]">
          Betöltés...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {floorplans.map((fp) => (
            <Card
              key={fp._id}
              className="overflow-hidden flex flex-col hover:border-[var(--color-accent-primary)]/40 transition-colors cursor-pointer"
              style={{
                background: "var(--color-bg-card)",
                borderColor: "var(--color-border-subtle)",
              }}
              onClick={() => setEditing(fp)}
            >
              <div className="h-36 bg-[var(--color-bg-secondary)] relative overflow-hidden">
                {fp.image_url ? (
                  <img
                    src={fp.image_url}
                    alt={fp.name}
                    className="w-full h-full object-cover opacity-70"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
                    <Map size={40} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 left-3 text-white font-semibold text-sm">
                  {fp.name}
                </div>
                <div className="absolute top-2 right-2">
                  <Badge variant="info" style={{ fontSize: "10px", padding: "2px 8px" }}>
                    {fp.markers?.length ?? 0} elem
                  </Badge>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs text-[var(--color-text-muted)]">
                  {getContactName(fp.contact_id)}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(
                    (fp.markers ?? []).reduce((acc: Record<string, number>, m) => {
                      acc[m.marker_type] = (acc[m.marker_type] ?? 0) + 1;
                      return acc;
                    }, {}),
                  )
                    .slice(0, 4)
                    .map(([type, count]) => {
                      const info = getMarkerInfo(type as MarkerType);
                      return (
                        <span
                          key={type}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: info.color + "20", color: info.color }}
                        >
                          {info.emoji} {count}x {info.label}
                        </span>
                      );
                    })}
                </div>
              </div>
            </Card>
          ))}
          {floorplans.length === 0 && (
            <div className="col-span-full text-center py-16 border-2 border-dashed border-[var(--color-border-default)] rounded-xl text-[var(--color-text-muted)]">
              <Map size={40} className="mx-auto mb-3 opacity-30" />
              Nincsenek alaprajzok. Kattints az "Új alaprajz" gombra.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
