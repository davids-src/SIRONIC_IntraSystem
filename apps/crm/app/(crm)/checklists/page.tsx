"use client";

import { useState, useEffect } from "react";
import { Card, Button, Input, Textarea, Label, Badge } from "@crm/ui";
import { ChecklistTemplate, ChecklistTemplateItem } from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import { Plus, Trash2, Edit, Save, ArrowLeft, CheckCircle2 } from "lucide-react";

const generateId = () => Math.random().toString(36).substring(2, 11);

export default function ChecklistTemplatesPage() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit / Create State
  const [editingTemplate, setEditingTemplate] =
    useState<Partial<ChecklistTemplate> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await apiJson<ChecklistTemplate[]>("/api/checklists");
      setTemplates(data);
    } catch (e) {
      setError("Nem sikerült betölteni a checklist sablonokat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateNew = () => {
    setEditingTemplate({
      name: "",
      description: "",
      category: "Karbantartás",
      items: [{ item_id: generateId(), text: "", is_required: false, order: 0 }],
      is_active: true,
    });
  };

  const handleEdit = (tmpl: ChecklistTemplate) => {
    setEditingTemplate({ ...tmpl });
  };

  const handleAddItem = () => {
    if (!editingTemplate) return;
    const items = [...(editingTemplate.items || [])];
    items.push({
      item_id: generateId(),
      text: "",
      is_required: false,
      order: items.length,
    });
    setEditingTemplate({ ...editingTemplate, items });
  };

  const handleRemoveItem = (idx: number) => {
    if (!editingTemplate) return;
    const items = (editingTemplate.items || []).filter((_, i) => i !== idx);
    setEditingTemplate({ ...editingTemplate, items });
  };

  const handleItemChange = (
    idx: number,
    field: keyof ChecklistTemplateItem,
    val: any,
  ) => {
    if (!editingTemplate) return;
    const items = (editingTemplate.items || []).map((item, i) => {
      if (i === idx) {
        return { ...item, [field]: val };
      }
      return item;
    });
    setEditingTemplate({ ...editingTemplate, items });
  };

  const handleSave = async () => {
    if (!editingTemplate || !editingTemplate.name?.trim()) {
      alert("A név megadása kötelező.");
      return;
    }
    setIsSaving(true);
    try {
      const cleanedItems = (editingTemplate.items || [])
        .filter((it) => it.text.trim())
        .map((it, i) => ({ ...it, order: i }));

      const payload = {
        name: editingTemplate.name,
        description: editingTemplate.description,
        category: editingTemplate.category,
        items: cleanedItems,
      };

      if (editingTemplate._id) {
        await apiJsonBody(`/api/checklists/${editingTemplate._id}`, "PATCH", payload);
      } else {
        await apiJsonBody("/api/checklists", "POST", payload);
      }
      setEditingTemplate(null);
      fetchTemplates();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Sikertelen mentés.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Biztosan deaktiválod ezt a sablont?")) return;
    try {
      await apiJsonBody(`/api/checklists/${id}`, "DELETE", {});
      fetchTemplates();
    } catch (e) {
      alert("Hiba történt a törlés során.");
    }
  };

  if (editingTemplate) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setEditingTemplate(null)}
            className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] bg-transparent border-none cursor-pointer p-0 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            Mégse és vissza
          </button>
          <h1 className="text-xl font-bold text-white">
            {editingTemplate._id ? "Sablon szerkesztése" : "Új checklist sablon"}
          </h1>
        </div>

        <Card className="p-6 flex flex-col gap-4 bg-[var(--color-bg-card)] border-[var(--color-border-subtle)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tmpl-name">Sablon neve *</Label>
              <Input
                id="tmpl-name"
                value={editingTemplate.name || ""}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, name: e.target.value })
                }
                placeholder="Pl. Kamera felszerelési checklist"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tmpl-category">Kategória</Label>
              <Input
                id="tmpl-category"
                value={editingTemplate.category || ""}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, category: e.target.value })
                }
                placeholder="Pl. Telepítés, IT support"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tmpl-desc">Leírás (opcionális)</Label>
            <Textarea
              id="tmpl-desc"
              value={editingTemplate.description || ""}
              onChange={(e) =>
                setEditingTemplate({ ...editingTemplate, description: e.target.value })
              }
              placeholder="Rövid leírás a technikusoknak..."
              rows={2}
            />
          </div>

          <div className="border-t border-[var(--color-border-subtle)] pt-4 mt-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-sm text-[var(--color-text-muted)] uppercase tracking-wider">
                Ellenőrzőlista tételek
              </h3>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddItem}
                className="text-xs py-1 px-3"
              >
                <Plus size={14} className="mr-1" /> Új tétel
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {(editingTemplate.items || []).map((item, idx) => (
                <div
                  key={item.item_id || idx}
                  className="flex items-center gap-3 bg-[var(--color-bg-secondary)] p-3 rounded-lg border border-[var(--color-border-subtle)]"
                >
                  <span className="text-xs text-[var(--color-text-muted)] font-mono w-6">
                    #{idx + 1}
                  </span>
                  <Input
                    className="flex-1"
                    value={item.text}
                    onChange={(e) => handleItemChange(idx, "text", e.target.value)}
                    placeholder="Ellenőrző feladat leírása..."
                  />
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-primary)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={item.is_required}
                      onChange={(e) =>
                        handleItemChange(idx, "is_required", e.target.checked)
                      }
                      className="rounded border-[var(--color-border-default)] text-[var(--color-accent-primary)] focus:ring-0"
                    />
                    Kötelező
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleRemoveItem(idx)}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              ))}
              {(editingTemplate.items || []).length === 0 && (
                <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
                  Nincs még tétel hozzáadva.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-[var(--color-border-subtle)] pt-4 mt-4">
            <Button variant="ghost" onClick={() => setEditingTemplate(null)}>
              Mégse
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
              <Save size={15} className="mr-1" /> Mentés
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Checklist sablonok</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Munkalapokhoz rendelhető minőségbiztosítási és ellenőrző listák kezelése.
          </p>
        </div>
        <Button variant="primary" onClick={handleCreateNew}>
          <Plus size={16} className="mr-1.5" /> Új sablon
        </Button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {loading ? (
        <div className="text-center py-10 text-[var(--color-text-muted)]">
          Betöltés...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tmpl) => (
            <Card
              key={tmpl._id}
              className="p-5 flex flex-col justify-between bg-[var(--color-bg-card)] border-[var(--color-border-subtle)] hover:border-[var(--color-accent-primary)]/40 transition-colors"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <Badge variant="info">{tmpl.category || "Egyéb"}</Badge>
                  {!tmpl.is_active && <Badge variant="warning">Inaktív</Badge>}
                </div>
                <h3 className="text-lg font-semibold text-white mb-1.5 truncate">
                  {tmpl.name}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mb-4">
                  {tmpl.description || "Nincs leírás megadva."}
                </p>

                <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] mb-4">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>{tmpl.items?.length || 0} ellenőrző lépés</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-3 mt-2">
                <Button
                  variant="ghost"
                  onClick={() => handleEdit(tmpl)}
                  className="text-xs py-1 px-2.5"
                >
                  <Edit size={13} className="mr-1" /> Szerkesztés
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleDelete(tmpl._id)}
                  className="text-xs py-1 px-2.5 text-red-400 hover:text-red-300"
                >
                  <Trash2 size={13} className="mr-1" /> Deaktiválás
                </Button>
              </div>
            </Card>
          ))}
          {templates.length === 0 && (
            <div className="col-span-full text-center py-12 border-2 border-dashed border-[var(--color-border-default)] rounded-xl text-[var(--color-text-muted)]">
              Nincsenek aktív checklist sablonok. Kattints az "Új sablon" gombra a
              kezdéshez.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
