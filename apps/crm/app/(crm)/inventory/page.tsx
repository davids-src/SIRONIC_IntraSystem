"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Input, Button } from "@crm/ui";
import { Search, Package, Plus, AlertTriangle } from "lucide-react";
import type { StockItemWithProduct } from "@crm/types";

export default function InventoryPage() {
  const [stockItems, setStockItems] = useState<StockItemWithProduct[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/warehouse/stock", { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setStockItems(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const filtered = stockItems.filter(
    (s) =>
      !search ||
      s.product?.name.toLowerCase().includes(search.toLowerCase()) ||
      s.product?.item_number.toLowerCase().includes(search.toLowerCase()),
  );

  const stats = {
    totalItems: stockItems.length,
    lowStock: stockItems.filter(
      (s) =>
        s.low_stock_threshold !== null && s.quantity_in_stock <= s.low_stock_threshold,
    ).length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">Raktárkészlet</h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            A vállalat központi raktárának kezelése
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={() => alert("Később: manuális bevét modal")}>
            <Plus size={16} className="mr-2" /> Bevét / Hozzáadás
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div
          className="rounded-xl border p-5 flex items-center gap-4"
          style={{
            background: "var(--color-bg-card)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-500">
            <Package size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-2xl font-bold text-white">{stats.totalItems}</span>
            <span className="text-sm text-gray-400">Összes különböző cikk</span>
          </div>
        </div>

        <div
          className="rounded-xl border p-5 flex items-center gap-4"
          style={{
            background: "var(--color-bg-card)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-red-500/10 text-red-500">
            <AlertTriangle size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-2xl font-bold text-white">{stats.lowStock}</span>
            <span className="text-sm text-gray-400">
              Kifogyóban lévő / alacsony készlet
            </span>
          </div>
        </div>
      </div>

      <div
        className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row"
        style={{
          background: "var(--color-bg-card)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        <div className="relative min-w-[250px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-400"
          />
          <Input
            placeholder="Keresés cikkszám vagy név alapján..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{
          borderColor: "var(--color-border-subtle)",
          background: "var(--color-bg-card)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr
                className="border-b"
                style={{
                  background: "var(--color-bg-secondary)",
                  borderColor: "var(--color-border-subtle)",
                }}
              >
                <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                  Cikkszám
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                  Megnevezés
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                  Hely
                </th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                  Készlet
                </th>
                <th className="text-center text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                  Állapot
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    Betöltés...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    Nincs találat.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const isLow =
                    s.low_stock_threshold !== null &&
                    s.quantity_in_stock <= s.low_stock_threshold;
                  return (
                    <tr
                      key={s._id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30"
                    >
                      <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                        {s.product?.item_number || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-white font-medium">
                        {s.product?.name || "Ismeretlen termék"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {s.warehouse_location || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right text-white">
                        {s.quantity_in_stock}{" "}
                        <span className="text-gray-400 font-normal text-xs">
                          {s.product?.unit || "db"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isLow ? (
                          <Badge variant="danger">Alacsony készlet</Badge>
                        ) : (
                          <Badge variant="success">Rendben</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
