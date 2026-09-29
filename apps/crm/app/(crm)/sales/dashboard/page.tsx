"use client";

import * as React from "react";
import Link from "next/link";
import { PageHeader, Card, Button, Badge } from "@crm/ui";
import {
  TrendingUp,
  Users,
  MessageSquare,
  Video,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Filter,
} from "lucide-react";
import type { Lead, Offer } from "@crm/types";

export default function SalesDashboardPage() {
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [offers, setOffers] = React.useState<Offer[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [leadsRes, offersRes] = await Promise.all([
          fetch("/api/leads"),
          fetch("/api/offers"),
        ]);
        if (leadsRes.ok) setLeads(await leadsRes.json());
        if (offersRes.ok) setOffers(await offersRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalLeads = leads.length;
  const contactedLeads = leads.filter((l) => l.status !== "target").length;
  const repliedLeads = leads.filter(
    (l) => !["target", "contacted", "no_response", "not_relevant"].includes(l.status),
  ).length;
  const meetingLeads = leads.filter((l) =>
    [
      "meeting",
      "quotation_needed",
      "quotation_sent",
      "follow_up",
      "negotiation",
      "won",
    ].includes(l.status),
  ).length;
  const quoteLeads = leads.filter((l) =>
    ["quotation_sent", "follow_up", "negotiation", "won"].includes(l.status),
  ).length;
  const wonLeads = leads.filter((l) => l.status === "won").length;
  const lostLeads = leads.filter((l) => l.status === "lost").length;

  const totalPipelineValue = leads
    .filter((l) => l.status !== "lost" && l.status !== "not_relevant")
    .reduce((sum, l) => sum + (l.estimated_value || 0), 0);

  const responseRate = contactedLeads > 0 ? (repliedLeads / contactedLeads) * 100 : 0;
  const quoteRate = repliedLeads > 0 ? (quoteLeads / repliedLeads) * 100 : 0;
  const winRate =
    wonLeads + lostLeads > 0 ? (wonLeads / (wonLeads + lostLeads)) * 100 : 0;

  const funnelStages = [
    { name: "1. Megkeresve", count: contactedLeads, color: "bg-blue-500" },
    { name: "2. Válaszolt / Érdeklődő", count: repliedLeads, color: "bg-cyan-500" },
    { name: "3. Tárgyalás / Meeting", count: meetingLeads, color: "bg-amber-500" },
    { name: "4. Ajánlat készítve", count: quoteLeads, color: "bg-purple-500" },
    { name: "5. Megnyert üzlet", count: wonLeads, color: "bg-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vezetői Értékesítési Műszerfal (Sales Dashboard)"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/leads">
              <Button variant="secondary" size="sm">
                Megkeresések lista
              </Button>
            </Link>
            <Link href="/offers">
              <Button variant="secondary" size="sm">
                Ajánlatok
              </Button>
            </Link>
          </div>
        }
      />

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Összes megkeresés</span>
            <Users size={16} className="text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">{totalLeads} db</div>
          <div className="text-xs text-slate-500 mt-1">
            {contactedLeads} aktívan felvéve
          </div>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Pipeline nettó érték
            </span>
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {totalPipelineValue.toLocaleString("hu-HU")} Ft
          </div>
          <div className="text-xs text-slate-500 mt-1">Aktív nyitott lehetőségek</div>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Válaszadási arány</span>
            <MessageSquare size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2">
            {responseRate.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">{repliedLeads} pozitív válasz</div>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Win Rate (Ajánlat / Nyert)
            </span>
            <CheckCircle2 size={16} className="text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 mt-2">
            {winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {wonLeads} nyert / {lostLeads} elvesztett
          </div>
        </Card>
      </div>

      {/* Sales Funnel Section */}
      <Card className="p-6 bg-slate-900 border-slate-800">
        <h3 className="text-base font-bold text-slate-100 mb-4">
          Értékesítési Konverziós Tölcsér (Sales Funnel)
        </h3>

        <div className="space-y-4">
          {funnelStages.map((stage, idx) => {
            const maxVal = Math.max(1, contactedLeads);
            const pct = (stage.count / maxVal) * 100;

            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-200">{stage.name}</span>
                  <span className="font-bold text-slate-300">
                    {stage.count} db ({pct.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full h-5 bg-slate-800 rounded-lg overflow-hidden p-0.5 border border-slate-700/60">
                  <div
                    className={`h-full rounded-md ${stage.color} transition-all duration-500`}
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
