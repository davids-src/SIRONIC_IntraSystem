"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Button, Input, StatCard, PageHeader } from "@crm/ui";
import {
  Wrench,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  History,
  ArrowRightLeft,
  Edit2,
  Trash2,
  User,
} from "lucide-react";
import { apiJson, apiJsonBody } from "@/lib/api-client";
import type { Tool as ToolType, ToolStatus, ToolCondition } from "@crm/types";

interface CrmUser {
  _id: string;
  email: string;
  display_name: string | null;
  roleKeys: string[];
}

interface ToolWithTransactions extends ToolType {
  transactions?: any[];
}

export default function ToolsPage() {
  const [tools, setTools] = useState<ToolWithTransactions[]>([]);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolWithTransactions | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolWithTransactions | null>(null);

  // Form states
  const [toolName, setToolName] = useState("");
  const [toolBrand, setToolBrand] = useState("");
  const [toolModel, setToolModel] = useState("");
  const [toolSerial, setToolSerial] = useState("");
  const [toolCondition, setToolCondition] = useState<ToolCondition>("good");
  const [toolNotes, setToolNotes] = useState("");

  const [checkoutUser, setCheckoutUser] = useState("");
  const [transactionNotes, setTransactionNotes] = useState("");
  const [checkinCondition, setCheckinCondition] = useState<ToolCondition>("good");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ts, us] = await Promise.all([
        apiJson<ToolType[]>("/api/tools"),
        apiJson<CrmUser[]>("/api/users"),
      ]);
      setTools(ts);
      setUsers(us);
    } catch (e) {
      console.error(e);
      setError("Nem sikerült betölteni az adatokat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const openAddModal = () => {
    setEditingTool(null);
    setToolName("");
    setToolBrand("");
    setToolModel("");
    setToolSerial("");
    setToolCondition("good");
    setToolNotes("");
    setError(null);
    setShowAddEditModal(true);
  };

  const openEditModal = (tool: ToolWithTransactions) => {
    setEditingTool(tool);
    setToolName(tool.name);
    setToolBrand(tool.brand || "");
    setToolModel(tool.model_number || "");
    setToolSerial(tool.serial_number || "");
    setToolCondition(tool.condition);
    setToolNotes(tool.notes || "");
    setError(null);
    setShowAddEditModal(true);
  };

  const openCheckoutModal = (tool: ToolWithTransactions) => {
    setSelectedTool(tool);
    setCheckoutUser("");
    setTransactionNotes("");
    setError(null);
    setShowCheckoutModal(true);
  };

  const openCheckinModal = (tool: ToolWithTransactions) => {
    setSelectedTool(tool);
    setCheckinCondition(tool.condition);
    setTransactionNotes("");
    setError(null);
    setShowCheckinModal(true);
  };

  const openHistoryModal = async (tool: ToolWithTransactions) => {
    setSelectedTool(tool);
    setShowHistoryModal(true);
    try {
      const details = await apiJson<any>(`/api/tools/${tool._id}`);
      setSelectedTool(details);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: toolName,
        brand: toolBrand || null,
        model_number: toolModel || null,
        serial_number: toolSerial || null,
        condition: toolCondition,
        notes: toolNotes || null,
      };

      if (editingTool) {
        await apiJsonBody(`/api/tools/${editingTool._id}`, "PATCH", payload);
      } else {
        await apiJsonBody("/api/tools", "POST", payload);
      }

      setShowAddEditModal(false);
      void fetchData();
    } catch (err: any) {
      setError(err.message || "Hiba történt mentés közben.");
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTool || !checkoutUser) return;
    setSaving(true);
    setError(null);
    try {
      await apiJsonBody(`/api/tools/${selectedTool._id}`, "PATCH", {
        assigned_to: checkoutUser,
        transactionNotes: transactionNotes || null,
      });
      setShowCheckoutModal(false);
      void fetchData();
    } catch (err: any) {
      setError(err.message || "Hiba történt a kiadás során.");
    } finally {
      setSaving(false);
    }
  };

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTool) return;
    setSaving(true);
    setError(null);
    try {
      await apiJsonBody(`/api/tools/${selectedTool._id}`, "PATCH", {
        assigned_to: null,
        condition: checkinCondition,
        transactionNotes: transactionNotes || null,
      });
      setShowCheckinModal(false);
      void fetchData();
    } catch (err: any) {
      setError(err.message || "Hiba történt a visszavétel során.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTool = async (toolId: string) => {
    if (
      !confirm(
        "Biztosan törölni szeretnéd ezt az eszközt? A tranzakciós naplója is törlődik.",
      )
    )
      return;
    try {
      await apiJson(`/api/tools/${toolId}`, { method: "DELETE" });
      void fetchData();
    } catch (err: any) {
      alert(err.message || "Hiba történt a törlés során.");
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId) return "—";
    const found = users.find((u) => u._id === userId);
    return found ? found.display_name || found.email : userId;
  };

  const getStatusBadge = (status: ToolStatus) => {
    switch (status) {
      case "in_warehouse":
        return (
          <Badge variant="success">
            <CheckCircle size={10} className="mr-1" /> Raktárban
          </Badge>
        );
      case "checked_out":
        return (
          <Badge variant="info">
            <User size={10} className="mr-1" /> Kiadva
          </Badge>
        );
      case "maintenance":
        return (
          <Badge variant="warning">
            <Clock size={10} className="mr-1" /> Szervizben
          </Badge>
        );
      case "lost":
        return (
          <Badge variant="error">
            <AlertTriangle size={10} className="mr-1" /> Elveszett
          </Badge>
        );
      case "retired":
        return (
          <Badge variant="default">
            <XCircle size={10} className="mr-1" /> Selejtezve
          </Badge>
        );
    }
  };

  const getConditionBadge = (cond: ToolCondition) => {
    switch (cond) {
      case "new":
        return <Badge variant="success">Új</Badge>;
      case "good":
        return <Badge variant="info">Jó</Badge>;
      case "fair":
        return <Badge variant="warning">Közepes</Badge>;
      case "poor":
        return <Badge variant="error">Rossz</Badge>;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case "check_out":
        return <span className="text-blue-500 font-semibold">Kiadva</span>;
      case "check_in":
        return <span className="text-green-500 font-semibold">Visszavéve</span>;
      case "maintenance_start":
        return <span className="text-yellow-600 font-semibold">Szerviz indítva</span>;
      case "maintenance_end":
        return <span className="text-emerald-600 font-semibold">Szerviz befejezve</span>;
      case "mark_lost":
        return <span className="text-red-500 font-semibold">Elveszettnek jelölve</span>;
      case "retire":
        return <span className="text-gray-500 font-semibold">Kiselejtezve</span>;
      default:
        return type;
    }
  };

  // Filter tools
  const filtered = tools.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (conditionFilter && t.condition !== conditionFilter) return false;
    if (!q.trim()) return true;
    const lower = q.toLowerCase();
    return (
      t.name.toLowerCase().includes(lower) ||
      (t.brand || "").toLowerCase().includes(lower) ||
      (t.model_number || "").toLowerCase().includes(lower) ||
      (t.serial_number || "").toLowerCase().includes(lower) ||
      getUserName(t.assigned_to).toLowerCase().includes(lower)
    );
  });

  // Calculate stats
  const totalCount = tools.length;
  const checkedOutCount = tools.filter((t) => t.status === "checked_out").length;
  const maintenanceCount = tools.filter((t) => t.status === "maintenance").length;
  const lostCount = tools.filter((t) => t.status === "lost").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Szerszám- és Gépkövetés"
        subtitle="Nagyértékű eszközök, gépek, szerszámok nyilvántartása és kiadása a munkatársaknak."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Összes eszköz"
          value={totalCount}
          icon={<Wrench className="text-blue-500" />}
        />
        <StatCard
          label="Munkatársnál"
          value={checkedOutCount}
          icon={<User className="text-emerald-500" />}
        />
        <StatCard
          label="Szervizben"
          value={maintenanceCount}
          icon={<Clock className="text-amber-500" />}
        />
        <StatCard
          label="Elveszett"
          value={lostCount}
          icon={<AlertTriangle className="text-red-500" />}
        />
      </div>

      {/* Action / Filter bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <input
                className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] text-[var(--color-text-primary)]"
                placeholder="Keresés név, márka, gyári szám, munkatárs szerint…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] text-[var(--color-text-primary)]"
            >
              <option value="">Összes státusz</option>
              <option value="in_warehouse">Raktárban</option>
              <option value="checked_out">Kiadva</option>
              <option value="maintenance">Szervizben</option>
              <option value="lost">Elveszett</option>
              <option value="retired">Selejtezve</option>
            </select>
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] text-[var(--color-text-primary)]"
            >
              <option value="">Összes állapot</option>
              <option value="new">Új</option>
              <option value="good">Jó</option>
              <option value="fair">Közepes</option>
              <option value="poor">Rossz</option>
            </select>
          </div>
          <Button variant="primary" onClick={openAddModal}>
            <Plus size={16} className="mr-2" /> Új eszköz felvétele
          </Button>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[var(--color-text-muted)]">Betöltés…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-muted)] space-y-3">
            <Wrench size={40} className="mx-auto opacity-30" />
            <p className="text-sm">Nincsenek a keresésnek megfelelő eszközök.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[var(--color-text-muted)] uppercase bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-subtle)]">
                <tr>
                  <th className="px-5 py-3">Eszköz megnevezése</th>
                  <th className="px-5 py-3">Márka / Típus</th>
                  <th className="px-5 py-3">Gyári szám</th>
                  <th className="px-5 py-3">Státusz</th>
                  <th className="px-5 py-3">Állapot</th>
                  <th className="px-5 py-3">Birtokos</th>
                  <th className="px-5 py-3 text-right">Műveletek</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr
                    key={t._id}
                    className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                  >
                    <td className="px-5 py-4 font-semibold text-[var(--color-text-primary)]">
                      {t.name}
                    </td>
                    <td className="px-5 py-4 text-[var(--color-text-muted)]">
                      {t.brand || t.model_number
                        ? `${t.brand ?? ""} ${t.model_number ?? ""}`
                        : "—"}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-[var(--color-text-muted)]">
                      {t.serial_number ?? "—"}
                    </td>
                    <td className="px-5 py-4">{getStatusBadge(t.status)}</td>
                    <td className="px-5 py-4">{getConditionBadge(t.condition)}</td>
                    <td className="px-5 py-4 font-medium">
                      {t.assigned_to ? (
                        <span className="inline-flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <User size={12} /> {getUserName(t.assigned_to)}
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right space-x-1">
                      {t.status === "in_warehouse" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openCheckoutModal(t)}
                        >
                          Kiadás
                        </Button>
                      ) : t.status === "checked_out" ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openCheckinModal(t)}
                        >
                          Visszavétel
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openHistoryModal(t)}
                        title="Napló"
                      >
                        <History size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(t)}
                        title="Szerkesztés"
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDeleteTool(t._id)}
                        title="Törlés"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* MODAL 1: Új / Szerkesztés Eszköz */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="p-6 max-w-lg w-full flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              {editingTool ? "Eszköz adatainak módosítása" : "Új eszköz felvétele"}
            </h2>
            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-2.5 border border-red-200 rounded">
                {error}
              </div>
            )}
            <form onSubmit={handleSaveTool} className="flex flex-col gap-4">
              <Input
                label="Eszköz megnevezése *"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Márka"
                  value={toolBrand}
                  onChange={(e) => setToolBrand(e.target.value)}
                />
                <Input
                  label="Típusszám / Modell"
                  value={toolModel}
                  onChange={(e) => setToolModel(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Sorozat / Gyári szám"
                  value={toolSerial}
                  onChange={(e) => setToolSerial(e.target.value)}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                    Állapot
                  </label>
                  <select
                    value={toolCondition}
                    onChange={(e) => setToolCondition(e.target.value as ToolCondition)}
                    className="px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] text-[var(--color-text-primary)] h-[38px]"
                  >
                    <option value="new">Új</option>
                    <option value="good">Jó</option>
                    <option value="fair">Közepes</option>
                    <option value="poor">Rossz</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                  Megjegyzés
                </label>
                <textarea
                  value={toolNotes}
                  onChange={(e) => setToolNotes(e.target.value)}
                  className="w-full p-3 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] text-[var(--color-text-primary)]"
                  rows={3}
                  placeholder="Kiegészítő információk az eszközről…"
                />
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowAddEditModal(false)}
                  type="button"
                >
                  Mégse
                </Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? "Mentés…" : "Mentés"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 2: Checkout (Kiadás) */}
      {showCheckoutModal && selectedTool && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="p-6 max-w-md w-full flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <ArrowRightLeft size={20} className="text-blue-500" />
              Eszköz kiadása
            </h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Kiválasztott eszköz:{" "}
              <strong className="text-[var(--color-text-primary)]">
                {selectedTool.name}
              </strong>{" "}
              ({selectedTool.brand ?? ""} {selectedTool.model_number ?? ""})
            </p>
            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-2.5 border border-red-200 rounded">
                {error}
              </div>
            )}
            <form onSubmit={handleCheckout} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                  Munkatárs *
                </label>
                <select
                  value={checkoutUser}
                  onChange={(e) => setCheckoutUser(e.target.value)}
                  required
                  className="px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] text-[var(--color-text-primary)] h-[38px]"
                >
                  <option value="">Válassz munkatársat…</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.display_name || u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                  Kiadási jegyzet / Megjegyzés
                </label>
                <textarea
                  value={transactionNotes}
                  onChange={(e) => setTransactionNotes(e.target.value)}
                  className="w-full p-3 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] text-[var(--color-text-primary)]"
                  rows={2}
                  placeholder="Pl: 'Projekt X helyszíni munkához kivéve'"
                />
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowCheckoutModal(false)}
                  type="button"
                >
                  Mégse
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={saving || !checkoutUser}
                >
                  {saving ? "Kiadás folyamatban…" : "Eszköz kiadása"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 3: Checkin (Visszavétel) */}
      {showCheckinModal && selectedTool && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="p-6 max-w-md w-full flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <ArrowRightLeft size={20} className="text-green-500" />
              Eszköz visszavétele
            </h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Visszaveendő eszköz:{" "}
              <strong className="text-[var(--color-text-primary)]">
                {selectedTool.name}
              </strong>
              <br />
              Jelenlegi birtokos: <strong>{getUserName(selectedTool.assigned_to)}</strong>
            </p>
            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-2.5 border border-red-200 rounded">
                {error}
              </div>
            )}
            <form onSubmit={handleCheckin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                  Visszahozott állapot
                </label>
                <select
                  value={checkinCondition}
                  onChange={(e) => setCheckinCondition(e.target.value as ToolCondition)}
                  className="px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] text-[var(--color-text-primary)] h-[38px]"
                >
                  <option value="new">Új (változatlan)</option>
                  <option value="good">Jó</option>
                  <option value="fair">Közepes</option>
                  <option value="poor">Rossz (pl: sérült, szervizelést igényel)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                  Visszavételi jegyzet
                </label>
                <textarea
                  value={transactionNotes}
                  onChange={(e) => setTransactionNotes(e.target.value)}
                  className="w-full p-3 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] text-[var(--color-text-primary)]"
                  rows={2}
                  placeholder="Pl: 'Sértetlenül visszahozva a raktárba'"
                />
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowCheckinModal(false)}
                  type="button"
                >
                  Mégse
                </Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? "Visszavétel…" : "Visszavétel"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 4: Tranzakciós napló (History) */}
      {showHistoryModal && selectedTool && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="p-6 max-w-2xl w-full flex flex-col gap-4 max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <History size={20} className="text-blue-500" />
                  Eszköz életút és tranzakciós napló
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                  Eszköz: <strong>{selectedTool.name}</strong> · Gyári szám:{" "}
                  <strong>{selectedTool.serial_number ?? "—"}</strong>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistoryModal(false)}
              >
                Bezárás
              </Button>
            </div>

            <div className="overflow-y-auto pr-1 flex-1 space-y-4">
              {!selectedTool.transactions || selectedTool.transactions.length === 0 ? (
                <p className="text-center text-sm text-[var(--color-text-muted)] py-8">
                  Nincsenek korábbi tranzakciók ehhez az eszközhöz.
                </p>
              ) : (
                <div className="relative border-l-2 border-gray-200 ml-4 my-2 pl-6 space-y-6">
                  {selectedTool.transactions.map((t: any) => (
                    <div key={t._id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1 bg-white border-2 border-blue-500 rounded-full w-4 h-4 flex items-center justify-center">
                        <span className="bg-blue-500 rounded-full w-1.5 h-1.5" />
                      </span>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {new Intl.DateTimeFormat("hu-HU", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(t.created_at))}
                      </div>
                      <div className="text-sm font-semibold text-[var(--color-text-primary)] mt-1 flex items-center gap-2">
                        {getTransactionTypeLabel(t.type)}
                        {t.target_user_id && (
                          <span className="text-xs font-normal text-[var(--color-text-muted)]">
                            → {getUserName(t.target_user_id)} részére
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        Végezte: {getUserName(t.actor_id)}
                      </div>
                      {t.notes && (
                        <div className="mt-1 text-sm bg-gray-50 border border-gray-100 rounded px-2.5 py-1.5 text-gray-600 italic">
                          "{t.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
