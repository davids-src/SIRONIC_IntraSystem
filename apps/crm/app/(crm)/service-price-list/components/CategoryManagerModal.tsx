"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Card } from "@crm/ui";
import {
  Folder,
  Plus,
  X,
  Edit2,
  Trash2,
  FolderPlus,
  Grid,
  Check,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import type { ServiceCategory, ServiceSubCategory } from "@crm/types";

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CategoryManagerModal({
  isOpen,
  onClose,
}: CategoryManagerModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"categories" | "subcategories">(
    "categories",
  );

  // Edit / Form states
  const [catForm, setCatForm] = useState({
    id: "",
    name: "",
    sku_prefix: "",
    icon: "Folder",
    color: "#6366f1",
    sort_order: 0,
    description: "",
  });

  const [subForm, setSubForm] = useState({
    id: "",
    category_id: "",
    name: "",
    sort_order: 0,
  });

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);

  // Queries
  const { data: categories = [], isLoading: loadingCats } = useQuery<ServiceCategory[]>({
    queryKey: ["service-categories"],
    queryFn: async () => {
      const res = await fetch("/api/service-categories");
      if (!res.ok) throw new Error("Kategóriák betöltése sikertelen");
      return res.json();
    },
  });

  const { data: subcategories = [], isLoading: loadingSubs } = useQuery<
    ServiceSubCategory[]
  >({
    queryKey: ["service-subcategories"],
    queryFn: async () => {
      const res = await fetch("/api/service-subcategories");
      if (!res.ok) throw new Error("Alkategóriák betöltése sikertelen");
      return res.json();
    },
  });

  // Mutator for Category
  const catMutation = useMutation({
    mutationFn: async (values: typeof catForm) => {
      const isEdit = !!values.id;
      const url = isEdit
        ? `/api/service-categories/${values.id}`
        : "/api/service-categories";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          sku_prefix: values.sku_prefix,
          icon: values.icon,
          color: values.color,
          sort_order: Number(values.sort_order),
          description: values.description || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Művelet sikertelen");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-categories"] });
      toast.success("Kategória elmentve");
      resetCatForm();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Mutator for Subcategory
  const subMutation = useMutation({
    mutationFn: async (values: typeof subForm) => {
      const isEdit = !!values.id;
      const url = isEdit
        ? `/api/service-subcategories/${values.id}`
        : "/api/service-subcategories";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: values.category_id,
          name: values.name,
          sort_order: Number(values.sort_order),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Művelet sikertelen");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-subcategories"] });
      toast.success("Alkategória elmentve");
      resetSubForm();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Delete Mutators
  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/service-categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Kategória törlése sikertelen");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-categories"] });
      toast.success("Kategória archiválva");
    },
  });

  const deleteSubMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/service-subcategories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Alkategória törlése sikertelen");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-subcategories"] });
      toast.success("Alkategória archiválva");
    },
  });

  const resetCatForm = () => {
    setCatForm({
      id: "",
      name: "",
      sku_prefix: "",
      icon: "Folder",
      color: "#6366f1",
      sort_order: 0,
      description: "",
    });
    setEditingCatId(null);
  };

  const resetSubForm = () => {
    setSubForm({
      id: "",
      category_id: "",
      name: "",
      sort_order: 0,
    });
    setEditingSubId(null);
  };

  const handleEditCat = (cat: ServiceCategory) => {
    setCatForm({
      id: cat._id,
      name: cat.name,
      sku_prefix: cat.sku_prefix,
      icon: cat.icon,
      color: cat.color,
      sort_order: cat.sort_order,
      description: cat.description || "",
    });
    setEditingCatId(cat._id);
  };

  const handleEditSub = (sub: ServiceSubCategory) => {
    setSubForm({
      id: sub._id,
      category_id: sub.category_id,
      name: sub.name,
      sort_order: sub.sort_order,
    });
    setEditingSubId(sub._id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
        {/* Modal Fejléc */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <Grid className="text-primary" size={20} />
            <h2 className="text-lg font-bold text-foreground">
              Kategóriák és Alkategóriák Kezelése
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabok és Tartalom */}
        <div className="flex flex-1 overflow-hidden">
          {/* Bal oldalsáv tab váltáshoz */}
          <div className="w-56 border-r border-border bg-muted/30 p-4 flex flex-col gap-2">
            <button
              onClick={() => setActiveTab("categories")}
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "categories"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Folder size={16} />
              Kategóriák
            </button>
            <button
              onClick={() => setActiveTab("subcategories")}
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "subcategories"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <FolderPlus size={16} />
              Alkategóriák
            </button>
          </div>

          {/* Fő tartalom szekció */}
          <div className="flex flex-1 gap-6 p-6 overflow-hidden">
            {activeTab === "categories" ? (
              <>
                {/* Kategória lista */}
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Létező Kategóriák
                  </h3>
                  {loadingCats ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Betöltés...
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Nincs kategória.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {categories.map((cat) => (
                        <div
                          key={cat._id}
                          className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
                            !cat.is_active
                              ? "opacity-50 bg-muted/40 border-dashed"
                              : "bg-card hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                              style={{ backgroundColor: cat.color }}
                            >
                              <FolderOpen size={16} />
                            </span>
                            <div>
                              <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                                {cat.name}
                                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-medium text-muted-foreground">
                                  {cat.sku_prefix}
                                </span>
                              </div>
                              {cat.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {cat.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditCat(cat)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              title="Szerkesztés"
                            >
                              <Edit2 size={14} />
                            </button>
                            {cat.is_active && (
                              <button
                                onClick={() => {
                                  if (confirm("Biztosan archiválod ezt a kategóriát?")) {
                                    deleteCatMutation.mutate(cat._id);
                                  }
                                }}
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                                title="Archiválás"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Kategória Form */}
                <div className="w-80 border-l border-border pl-6 flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    {editingCatId ? "Kategória Szerkesztése" : "Új Kategória Hozzáadása"}
                  </h3>
                  <div className="flex flex-col gap-3">
                    <Input
                      label="Kategória név"
                      value={catForm.name}
                      onChange={(e) =>
                        setCatForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="pl. Biztonságtechnika"
                    />
                    <Input
                      label="Cikkszám prefix (2-5 karakter)"
                      value={catForm.sku_prefix}
                      onChange={(e) =>
                        setCatForm((prev) => ({
                          ...prev,
                          sku_prefix: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="pl. BT"
                      disabled={!!editingCatId} // Prefix lock ha már szerkesztünk
                    />
                    <Input
                      label="Szín (Hex kód)"
                      value={catForm.color}
                      onChange={(e) =>
                        setCatForm((prev) => ({ ...prev, color: e.target.value }))
                      }
                      placeholder="pl. #6366f1"
                    />
                    <Input
                      label="Sorrend (Szám)"
                      type="number"
                      value={catForm.sort_order}
                      onChange={(e) =>
                        setCatForm((prev) => ({
                          ...prev,
                          sort_order: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                    <Input
                      label="Leírás"
                      value={catForm.description}
                      onChange={(e) =>
                        setCatForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Opcionális leírás"
                    />

                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="primary"
                        className="flex-1"
                        disabled={catMutation.isPending}
                        onClick={() => catMutation.mutate(catForm)}
                      >
                        Mentés
                      </Button>
                      {editingCatId && (
                        <Button variant="secondary" onClick={resetCatForm}>
                          Mégse
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Alkategória lista */}
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Létező Alkategóriák
                  </h3>
                  {loadingSubs || loadingCats ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Betöltés...
                    </div>
                  ) : subcategories.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Nincs alkategória.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {subcategories.map((sub) => {
                        const parentCat = categories.find(
                          (c) => c._id === sub.category_id,
                        );
                        return (
                          <div
                            key={sub._id}
                            className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
                              !sub.is_active
                                ? "opacity-50 bg-muted/40 border-dashed"
                                : "bg-card hover:shadow-sm"
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-sm text-foreground">
                                {sub.name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: parentCat?.color ?? "#ccc" }}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {parentCat?.name ?? "Ismeretlen kategória"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditSub(sub)}
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                title="Szerkesztés"
                              >
                                <Edit2 size={14} />
                              </button>
                              {sub.is_active && (
                                <button
                                  onClick={() => {
                                    if (
                                      confirm("Biztosan archiválod ezt az alkategóriát?")
                                    ) {
                                      deleteSubMutation.mutate(sub._id);
                                    }
                                  }}
                                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                                  title="Archiválás"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Alkategória Form */}
                <div className="w-80 border-l border-border pl-6 flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    {editingSubId
                      ? "Alkategória Szerkesztése"
                      : "Új Alkategória Hozzáadása"}
                  </h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Szülő kategória
                      </label>
                      <select
                        value={subForm.category_id}
                        onChange={(e) =>
                          setSubForm((prev) => ({ ...prev, category_id: e.target.value }))
                        }
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Válassz kategóriát...</option>
                        {categories
                          .filter((c) => c.is_active)
                          .map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name} ({c.sku_prefix})
                            </option>
                          ))}
                      </select>
                    </div>

                    <Input
                      label="Alkategória név"
                      value={subForm.name}
                      onChange={(e) =>
                        setSubForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="pl. Riasztórendszerek"
                    />

                    <Input
                      label="Sorrend (Szám)"
                      type="number"
                      value={subForm.sort_order}
                      onChange={(e) =>
                        setSubForm((prev) => ({
                          ...prev,
                          sort_order: parseInt(e.target.value) || 0,
                        }))
                      }
                    />

                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="primary"
                        className="flex-1"
                        disabled={subMutation.isPending}
                        onClick={() => subMutation.mutate(subForm)}
                      >
                        Mentés
                      </Button>
                      {editingSubId && (
                        <Button variant="secondary" onClick={resetSubForm}>
                          Mégse
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
