"use client";

import * as React from "react";
import Link from "next/link";
import { PageHeader, Card, Button, Input, Textarea, Badge, colors } from "@crm/ui";
import {
  Plus,
  Kanban,
  List,
  Search,
  Building,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  ArrowRight,
  Clock,
  MessageSquare,
  PhoneCall,
  Video,
  FileCheck,
  AlertTriangle,
  Sparkles,
  Layers,
  X,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import type { Lead, LeadStatus, LeadActivityType } from "@crm/types";

const LEAD_STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; color: "default" | "success" | "warning" | "error" | "info" }
> = {
  target: { label: "Célpiac", color: "default" },
  contacted: { label: "Megkeresve", color: "info" },
  replied: { label: "Válaszolt", color: "info" },
  meeting: { label: "Meeting", color: "warning" },
  quotation_needed: { label: "Ajánlatkészítés", color: "warning" },
  quotation_sent: { label: "Ajánlat kiküldve", color: "info" },
  follow_up: { label: "Utánkövetés", color: "warning" },
  negotiation: { label: "Egyeztetés", color: "warning" },
  won: { label: "Nyert (Megrendelve)", color: "success" },
  lost: { label: "Elvesztett", color: "error" },
  no_response: { label: "Nincs válasz", color: "default" },
  later: { label: "Későbbre ütemezve", color: "default" },
  not_relevant: { label: "Nem releváns", color: "default" },
};

const KANBAN_STAGES: LeadStatus[] = [
  "target",
  "contacted",
  "meeting",
  "quotation_needed",
  "quotation_sent",
  "follow_up",
  "won",
  "lost",
];

export default function LeadsPage() {
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<"kanban" | "list">("kanban");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [newActivityText, setNewActivityText] = React.useState("");
  const [newActivityType, setNewActivityType] = React.useState<LeadActivityType>("note");
  const [newNextAction, setNewNextAction] = React.useState("");
  const [newNextActionDate, setNewNextActionDate] = React.useState("");

  // Create form state
  const [newCompanyName, setNewCompanyName] = React.useState("");
  const [newContactName, setNewContactName] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newEstValue, setNewEstValue] = React.useState("");
  const [newCategory, setNewCategory] = React.useState("");
  const [newSource, setNewSource] = React.useState("Hideg megkeresés");
  const [newStatus, setNewStatus] = React.useState<LeadStatus>("target");
  const [newNotes, setNewNotes] = React.useState("");

  const fetchLeads = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/leads");
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: newCompanyName,
          contact_name: newContactName || null,
          email: newEmail || null,
          phone: newPhone || null,
          estimated_value: newEstValue ? Number(newEstValue) : null,
          category: newCategory || null,
          source: newSource || null,
          status: newStatus,
          notes: newNotes || null,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewCompanyName("");
        setNewContactName("");
        setNewEmail("");
        setNewPhone("");
        setNewEstValue("");
        setNewNotes("");
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (leadId: string, status: LeadStatus) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLeads((prev) => prev.map((l) => (l._id === leadId ? updated : l)));
        if (selectedLead?._id === leadId) setSelectedLead(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !newActivityText.trim()) return;

    try {
      const res = await fetch(`/api/leads/${selectedLead._id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newActivityType,
          text: newActivityText,
          next_action: newNextAction || undefined,
          next_action_at: newNextActionDate ? new Date(newNextActionDate) : undefined,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setLeads((prev) => prev.map((l) => (l._id === selectedLead._id ? updated : l)));
        setSelectedLead(updated);
        setNewActivityText("");
        setNewNextAction("");
        setNewNextActionDate("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertToPartner = async (createOffer: boolean) => {
    if (!selectedLead) return;
    try {
      const res = await fetch(`/api/leads/${selectedLead._id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ create_offer: createOffer }),
      });
      if (res.ok) {
        const data = await res.json();
        fetchLeads();
        if (createOffer && data.offer_id) {
          window.location.href = `/offers/${data.offer_id}`;
        } else if (data.contact_id) {
          window.location.href = `/partners/${data.contact_id}`;
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLeads = leads.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.company_name.toLowerCase().includes(q) ||
      (l.contact_name && l.contact_name.toLowerCase().includes(q)) ||
      (l.email && l.email.toLowerCase().includes(q)) ||
      l.lead_number.toLowerCase().includes(q)
    );
  });

  const totalPipelineValue = leads
    .filter((l) => l.status !== "lost" && l.status !== "not_relevant")
    .reduce((sum, l) => sum + (l.estimated_value || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Értékesítés / Megkeresések (Leads)"
        subtitle="Hideg és meleg értékesítési lehetőségek, pipeline és kapcsolatfelvételi napló."
        actions={
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "kanban"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Kanban size={14} />
                <span>Pipeline</span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <List size={14} />
                <span>Lista</span>
              </button>
            </div>
            <Link href="/sales/dashboard">
              <Button variant="secondary" size="sm">
                Sales Dashboard
              </Button>
            </Link>
            <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} className="mr-1" />
              Új megkeresés
            </Button>
          </div>
        }
      />

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900 border-slate-800">
          <div className="text-xs font-medium text-slate-400">Aktív lehetőségek</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">
            {leads.filter((l) => l.status !== "won" && l.status !== "lost").length} db
          </div>
        </Card>
        <Card className="p-4 bg-slate-900 border-slate-800">
          <div className="text-xs font-medium text-slate-400">Pipeline becsült érték</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {totalPipelineValue.toLocaleString("hu-HU")} Ft
          </div>
        </Card>
        <Card className="p-4 bg-slate-900 border-slate-800">
          <div className="text-xs font-medium text-slate-400">Közelgő / Mai teendők</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {leads.filter((l) => Boolean(l.next_action)).length} db
          </div>
        </Card>
        <Card className="p-4 bg-slate-900 border-slate-800">
          <div className="text-xs font-medium text-slate-400">Megnyert üzletek</div>
          <div className="text-2xl font-bold text-red-400 mt-1">
            {leads.filter((l) => l.status === "won").length} db
          </div>
        </Card>
      </div>

      {/* Search & Filter Header */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Keresés cégnév, kapcsolattartó, azonosító..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Main View: Kanban or List */}
      {viewMode === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-2">
          {KANBAN_STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.status === stage);
            const stageTotal = stageLeads.reduce(
              (acc, l) => acc + (l.estimated_value || 0),
              0,
            );
            const cfg = LEAD_STATUS_CONFIG[stage];

            return (
              <div
                key={stage}
                className="w-72 flex-shrink-0 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col max-h-[calc(100vh-280px)]"
              >
                {/* Column Header */}
                <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-200 uppercase tracking-wide">
                      {cfg.label}
                    </span>
                    <span className="bg-slate-800 text-slate-300 text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                      {stageLeads.length}
                    </span>
                  </div>
                  {stageTotal > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-400">
                      {(stageTotal / 1000).toFixed(0)}k Ft
                    </span>
                  )}
                </div>

                {/* Lead Cards in Stage */}
                <div className="p-2 space-y-2 overflow-y-auto flex-1">
                  {stageLeads.length === 0 ? (
                    <div className="text-center py-6 text-slate-600 text-xs italic">
                      Nincs tétel
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead._id}
                        onClick={() => setSelectedLead(lead)}
                        className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg cursor-pointer transition-all hover:border-slate-600 shadow-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-semibold text-sm text-slate-100 line-clamp-1">
                            {lead.company_name}
                          </span>
                        </div>
                        {lead.contact_name && (
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <User size={12} className="text-slate-500" />
                            <span className="truncate">{lead.contact_name}</span>
                          </div>
                        )}
                        {lead.estimated_value ? (
                          <div className="text-xs font-semibold text-emerald-400">
                            {lead.estimated_value.toLocaleString("hu-HU")} Ft
                          </div>
                        ) : null}
                        {lead.next_action && (
                          <div className="pt-1 border-t border-slate-700/40 text-[11px] text-amber-400 flex items-center gap-1">
                            <Clock size={11} className="shrink-0" />
                            <span className="truncate">{lead.next_action}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card className="overflow-hidden bg-slate-900 border-slate-800">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Azonosító / Cég</th>
                <th className="p-3">Kapcsolattartó</th>
                <th className="p-3">Státusz</th>
                <th className="p-3">Becsült érték</th>
                <th className="p-3">Következő teendő</th>
                <th className="p-3 text-right">Művelet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Nincs találat a megadott feltételekre.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead._id}
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="p-3">
                      <div className="font-semibold text-slate-100">
                        {lead.company_name}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {lead.lead_number}
                      </div>
                    </td>
                    <td className="p-3 text-xs">
                      <div>{lead.contact_name || "—"}</div>
                      <div className="text-slate-500">
                        {lead.email || lead.phone || ""}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={LEAD_STATUS_CONFIG[lead.status]?.color || "default"}
                      >
                        {LEAD_STATUS_CONFIG[lead.status]?.label || lead.status}
                      </Badge>
                    </td>
                    <td className="p-3 font-semibold text-emerald-400">
                      {lead.estimated_value
                        ? `${lead.estimated_value.toLocaleString("hu-HU")} Ft`
                        : "—"}
                    </td>
                    <td className="p-3 text-xs text-amber-400">
                      {lead.next_action ? (
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{lead.next_action}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLead(lead);
                        }}
                      >
                        Megtekintés
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* Lead Detail / Activity Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setSelectedLead(null)}
          />
          <div className="relative z-50 w-[540px] max-w-[95vw] h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-900/90">
              <div>
                <span className="text-xs font-mono text-red-400 font-bold uppercase tracking-wider">
                  {selectedLead.lead_number}
                </span>
                <h2 className="text-xl font-bold text-slate-100 mt-0.5">
                  {selectedLead.company_name}
                </h2>
                {selectedLead.category && (
                  <span className="text-xs text-slate-400">
                    Kategória: {selectedLead.category}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Status Selector & Value */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-800/60 rounded-xl border border-slate-800">
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">
                    Státusz
                  </label>
                  <select
                    value={selectedLead.status}
                    onChange={(e) =>
                      handleStatusChange(selectedLead._id, e.target.value as LeadStatus)
                    }
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5"
                  >
                    {Object.entries(LEAD_STATUS_CONFIG).map(([st, cfg]) => (
                      <option key={st} value={st}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">
                    Becsült érték (Ft)
                  </label>
                  <div className="text-sm font-bold text-emerald-400 py-1.5">
                    {selectedLead.estimated_value
                      ? `${selectedLead.estimated_value.toLocaleString("hu-HU")} Ft`
                      : "Nincs megadva"}
                  </div>
                </div>
              </div>

              {/* Conversion / Actions Bar */}
              <div className="flex items-center gap-2">
                {!selectedLead.contact_id ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleConvertToPartner(false)}
                  >
                    <Building size={14} className="mr-1.5" />
                    Partnerként rögzítés
                  </Button>
                ) : (
                  <Link
                    href={`/partners/${selectedLead.contact_id}`}
                    className="flex-1 text-center py-1.5 px-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5"
                  >
                    <Building size={14} className="text-blue-400" />
                    Partner adatlap megnyitása
                    <ExternalLink size={12} />
                  </Link>
                )}

                {!selectedLead.offer_id ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleConvertToPartner(true)}
                  >
                    <FileCheck size={14} className="mr-1.5" />
                    Ajánlat készítése
                  </Button>
                ) : (
                  <Link
                    href={`/offers/${selectedLead.offer_id}`}
                    className="flex-1 text-center py-1.5 px-3 bg-red-950/40 hover:bg-red-900/50 rounded-lg text-xs font-semibold text-red-300 border border-red-800/60 flex items-center justify-center gap-1.5"
                  >
                    <FileCheck size={14} />
                    Ajánlat megnyitása
                    <ExternalLink size={12} />
                  </Link>
                )}
              </div>

              {/* Contact Details */}
              <div className="space-y-2 text-xs">
                <div className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                  Elérhetőségek
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  {selectedLead.contact_name && (
                    <div className="flex items-center gap-1.5">
                      <User size={14} className="text-slate-500" />
                      <span>{selectedLead.contact_name}</span>
                    </div>
                  )}
                  {selectedLead.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone size={14} className="text-slate-500" />
                      <a href={`tel:${selectedLead.phone}`} className="hover:underline">
                        {selectedLead.phone}
                      </a>
                    </div>
                  )}
                  {selectedLead.email && (
                    <div className="flex items-center gap-1.5 col-span-2">
                      <Mail size={14} className="text-slate-500" />
                      <a
                        href={`mailto:${selectedLead.email}`}
                        className="hover:underline"
                      >
                        {selectedLead.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Next Action Box */}
              <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Clock size={14} />
                  <span>Következő teendő (Next Action)</span>
                </div>
                <div className="text-xs text-slate-200">
                  {selectedLead.next_action || "Nincs rögzített teendő"}
                </div>
                {selectedLead.next_action_at && (
                  <div className="text-[11px] text-amber-400/80">
                    Esedékesség:{" "}
                    {new Date(selectedLead.next_action_at).toLocaleDateString("hu-HU")}
                  </div>
                )}
              </div>

              {/* Add Activity Form */}
              <form onSubmit={handleAddActivity} className="space-y-3 pt-2">
                <div className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                  Új aktivitás / feljegyzés rögzítése
                </div>
                <div className="flex gap-2">
                  {(
                    [
                      { id: "note", label: "Jegyzet", icon: <MessageSquare size={13} /> },
                      { id: "call", label: "Telefon", icon: <PhoneCall size={13} /> },
                      { id: "meeting", label: "Meeting", icon: <Video size={13} /> },
                      { id: "email", label: "E-mail", icon: <Mail size={13} /> },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewActivityType(t.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                        newActivityType === t.id
                          ? "bg-red-600 border-red-500 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {t.icon}
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
                <Textarea
                  value={newActivityText}
                  onChange={(e) => setNewActivityText(e.target.value)}
                  placeholder="Aktivitás vagy megbeszélés részletei..."
                  rows={2}
                  className="text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newNextAction}
                    onChange={(e) => setNewNextAction(e.target.value)}
                    placeholder="Új következő teendő..."
                    className="text-xs"
                  />
                  <Input
                    type="date"
                    value={newNextActionDate}
                    onChange={(e) => setNewNextActionDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <Button type="submit" variant="secondary" size="sm" className="w-full">
                  Aktivitás mentése
                </Button>
              </form>

              {/* Activity Timeline */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                  Idővonal & Történet
                </div>
                <div className="space-y-3">
                  {(selectedLead.activities || []).map((act, i) => (
                    <div
                      key={i}
                      className="p-3 bg-slate-800/40 border border-slate-800 rounded-lg text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span className="font-semibold text-slate-300">
                          {act.user_name} • {act.type.toUpperCase()}
                        </span>
                        <span>
                          {new Date(act.timestamp).toLocaleDateString("hu-HU", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-slate-200">{act.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative z-50 w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100">
                Új megkeresés / lehetőség rögzítése
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Cégnév *
                </label>
                <Input
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="pl. ABC Logisztikai Kft."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Kapcsolattartó
                  </label>
                  <Input
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="pl. Kovács Péter"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Becsült érték (Ft)
                  </label>
                  <Input
                    type="number"
                    value={newEstValue}
                    onChange={(e) => setNewEstValue(e.target.value)}
                    placeholder="pl. 1500000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    E-mail cím
                  </label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="info@ceg.hu"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Telefonszám
                  </label>
                  <Input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+36 30 123 4567"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Forrás
                  </label>
                  <Input
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    placeholder="pl. Weboldal, Hideghívás"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Kezdő státusz
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as LeadStatus)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2"
                  >
                    {Object.entries(LEAD_STATUS_CONFIG).map(([st, cfg]) => (
                      <option key={st} value={st}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Megjegyzések
                </label>
                <Textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Kezdeti megjegyzések vagy igények leírása..."
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Mégse
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Rögzítés
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
