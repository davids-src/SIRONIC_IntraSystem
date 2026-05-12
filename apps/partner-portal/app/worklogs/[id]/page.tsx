"use client";

import { Card, Button, Badge } from "@crm/ui";
import { useRouter } from "next/navigation";
import { useState, use } from "react";
import {
  FileSignature,
  Download,
  CheckCircle2,
  ArrowLeft,
  MapPin,
  Clock,
  CalendarDays,
  Wrench,
  User,
} from "lucide-react";

const mockWorklog = {
  _id: "w1",
  worklog_number: "WL-000001",
  work_category: "IT Támogatás",
  work_date: new Date(Date.now() - 24 * 60 * 60 * 1000),
  work_start: "08:00",
  work_end: "12:30",
  site_address: "Központi iroda, 1054 Budapest",
  technician_name: "Kovács János",
  travel_km: 15,
  work_description:
    "Szerver hiba elhárítása, hálózati switch újraindítása és konfigurálása. A portok ellenőrzése során kiderült, hogy az 1-es port kontakthibás. A kábelt kicseréltük és áthelyeztük a 2-es portra. A rendszer tesztelése sikeres volt.",
  devices: [
    {
      name: "SRV-01",
      type: "Szerver",
      serial: "SN-12345678",
      task: "Újraindítás, patch kábel csere",
    },
  ],
  materials: [{ name: "CAT6 Patch kábel 2m", sku: "CAB-001", qty: "1 db" }],
  technician_signature: "Kovács János",
  status: "finalized" as const,
};

export default function PartnerWorklogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [signed, setSigned] = useState(false);
  const wl = { ...mockWorklog, _id: id };

  const duration = (() => {
    const [sh = 0, sm = 0] = wl.work_start.split(":").map(Number);
    const [eh = 0, em = 0] = wl.work_end.split(":").map(Number);
    const mins = eh * 60 + em - (sh * 60 + sm);
    return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? (mins % 60) + "p" : ""}`.trim();
  })();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => router.push("/worklogs")}
          className="flex items-center gap-1.5 text-sm w-fit"
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
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{wl.worklog_number}</h1>
              <Badge variant={signed ? "success" : "info"}>
                {signed ? "Aláírva" : "Jóváhagyásra vár"}
              </Badge>
            </div>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {wl.work_category} · {new Date(wl.work_date).toLocaleDateString("hu-HU")}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button
              variant="secondary"
              onClick={() => window.open(`/worklogs/${id}/print`, "_blank")}
            >
              <Download size={15} style={{ marginRight: "6px" }} />
              PDF
            </Button>
            {!signed && (
              <Button variant="primary" onClick={() => setSigned(true)}>
                <FileSignature size={15} style={{ marginRight: "6px" }} />
                Aláírás és elfogadás
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: 2/3 */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Alapadatok */}
          <div
            className="rounded-xl border p-6 flex flex-col gap-4"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider pb-2 border-b"
              style={{
                color: "var(--color-text-muted)",
                borderColor: "var(--color-border-subtle)",
              }}
            >
              Alapadatok
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: <Wrench size={14} />,
                  label: "Munkavégzés típusa",
                  value: wl.work_category,
                },
                {
                  icon: <CalendarDays size={14} />,
                  label: "Dátum",
                  value: new Date(wl.work_date).toLocaleDateString("hu-HU"),
                },
                {
                  icon: <Clock size={14} />,
                  label: "Időtartam",
                  value: `${wl.work_start} – ${wl.work_end} (${duration})`,
                },
                { icon: <MapPin size={14} />, label: "Helyszín", value: wl.site_address },
                {
                  icon: <User size={14} />,
                  label: "Technikus",
                  value: wl.technician_name,
                },
                {
                  icon: <Clock size={14} />,
                  label: "Kiszállás",
                  value: `${wl.travel_km} km`,
                },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex flex-col gap-1">
                  <span
                    className="text-xs uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {icon} {label}
                  </span>
                  <span className="text-sm font-medium text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Munkaleírás */}
          <div
            className="rounded-xl border p-6 flex flex-col gap-4"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider pb-2 border-b"
              style={{
                color: "var(--color-text-muted)",
                borderColor: "var(--color-border-subtle)",
              }}
            >
              Elvégzett munka leírása
            </h3>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {wl.work_description}
            </p>
          </div>

          {/* Szervizelt eszközök */}
          <div
            className="rounded-xl border p-6 flex flex-col gap-4"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider pb-2 border-b"
              style={{
                color: "var(--color-text-muted)",
                borderColor: "var(--color-border-subtle)",
              }}
            >
              Szervizelt Eszközök
            </h3>
            <div
              className="overflow-x-auto rounded-lg border"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr
                    style={{
                      background: "var(--color-bg-secondary)",
                      borderBottom: "1px solid var(--color-border-subtle)",
                    }}
                  >
                    {["Eszköz neve", "Típus", "Sorozatszám", "Elvégzett feladat"].map(
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
                  {wl.devices.map((d, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                    >
                      <td
                        className="px-4 py-3 font-medium text-sm text-white"
                        style={{ minWidth: "120px" }}
                      >
                        {d.name}
                      </td>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: "var(--color-text-muted)", minWidth: "100px" }}
                      >
                        {d.type}
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{
                          color: "var(--color-text-secondary)",
                          minWidth: "140px",
                        }}
                      >
                        {d.serial}
                      </td>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: "var(--color-text-primary)", minWidth: "200px" }}
                      >
                        {d.task}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Felhasznált anyagok */}
          <div
            className="rounded-xl border p-6 flex flex-col gap-4"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider pb-2 border-b"
              style={{
                color: "var(--color-text-muted)",
                borderColor: "var(--color-border-subtle)",
              }}
            >
              Felhasznált Anyagok
            </h3>
            <div
              className="overflow-x-auto rounded-lg border"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr
                    style={{
                      background: "var(--color-bg-secondary)",
                      borderBottom: "1px solid var(--color-border-subtle)",
                    }}
                  >
                    {["Megnevezés", "Cikkszám", "Mennyiség"].map((h) => (
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
                  {wl.materials.map((m, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                    >
                      <td className="px-4 py-3 font-medium text-sm text-white">
                        {m.name}
                      </td>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {m.sku}
                      </td>
                      <td className="px-4 py-3 text-sm text-white">{m.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: 1/3 */}
        <div className="flex flex-col gap-4">
          {/* Signatures */}
          <div
            className="rounded-xl border p-6 flex flex-col gap-4"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider pb-2 border-b"
              style={{
                color: "var(--color-text-muted)",
                borderColor: "var(--color-border-subtle)",
              }}
            >
              Aláírások
            </h3>

            {/* Technician signature */}
            <div className="flex flex-col gap-2">
              <div
                className="flex items-center gap-2 text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                <CheckCircle2 size={13} style={{ color: "#22c55e" }} />
                Technikus aláírása
              </div>
              <p className="text-sm font-medium text-white">
                {wl.technician_name} (SIRONIC)
              </p>
              <div
                className="h-20 rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-bg-secondary)" }}
              >
                <span className="font-serif italic text-lg opacity-50 text-white">
                  {wl.technician_name}
                </span>
              </div>
            </div>

            {/* Client signature */}
            <div className="flex flex-col gap-2">
              <div
                className="flex items-center gap-2 text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                {signed ? (
                  <CheckCircle2 size={13} style={{ color: "#22c55e" }} />
                ) : (
                  <FileSignature size={13} style={{ color: "#f59e0b" }} />
                )}
                Ügyfél aláírása {!signed && "(hiányzik)"}
              </div>
              {signed ? (
                <>
                  <p className="text-sm font-medium text-white">Aláírva</p>
                  <div
                    className="h-20 rounded-lg flex items-center justify-center"
                    style={{ background: "var(--color-bg-secondary)" }}
                  >
                    <span className="font-serif italic text-lg opacity-50 text-white">
                      Jóváhagyva
                    </span>
                  </div>
                </>
              ) : (
                <div
                  className="h-20 rounded-lg flex flex-col items-center justify-center text-center gap-2"
                  style={{
                    background: "var(--color-bg-secondary)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <FileSignature size={24} style={{ opacity: 0.4 }} />
                  <p className="text-xs">Kattintson az „Aláírás" gombra</p>
                </div>
              )}
            </div>
          </div>

          {/* Action */}
          {!signed && (
            <Button
              variant="primary"
              style={{ gap: "8px", width: "100%" }}
              onClick={() => setSigned(true)}
            >
              <FileSignature size={16} />
              Aláírás és elfogadás
            </Button>
          )}

          {signed && (
            <div
              className="flex items-center gap-3 p-4 rounded-xl border"
              style={{
                background: "rgba(34,197,94,0.08)",
                borderColor: "rgba(34,197,94,0.25)",
              }}
            >
              <CheckCircle2 size={18} style={{ color: "#22c55e", flexShrink: 0 }} />
              <span className="text-sm font-medium" style={{ color: "#22c55e" }}>
                Munkalap sikeresen aláírva
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
