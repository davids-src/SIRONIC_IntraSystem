"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
} from "@crm/ui";
import type { Column } from "@crm/ui";
import type { BillingCycle, DeploymentPackage } from "@crm/types";
import { Plus, Trash2 } from "lucide-react";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";

async function fetchPackages(): Promise<DeploymentPackage[]> {
  return apiJson<DeploymentPackage[]>("/api/deployment-packages");
}

const CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: "Havi",
  quarterly: "Negyedéves",
  yearly: "Éves",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(n);

export default function DeploymentPackagesSettingsPage() {
  const queryClient = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["deployment-packages"],
    queryFn: fetchPackages,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [priceHuf, setPriceHuf] = useState("");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [vcpu, setVcpu] = useState("");
  const [ramMb, setRamMb] = useState("");
  const [diskGb, setDiskGb] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deployment-packages"] });

  const createMutation = useMutation({
    mutationFn: () =>
      apiJsonBody("/api/deployment-packages", "POST", {
        code,
        name,
        price_huf: Number(priceHuf) || 0,
        default_cycle: cycle,
        resources: {
          vcpu: vcpu ? Number(vcpu) : null,
          ram_mb: ramMb ? Number(ramMb) : null,
          disk_gb: diskGb ? Number(diskGb) : null,
        },
      }),
    onSuccess: () => {
      toast.success("Csomag létrehozva.");
      setModalOpen(false);
      setCode("");
      setName("");
      setPriceHuf("");
      setVcpu("");
      setRamMb("");
      setDiskGb("");
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Létrehozás sikertelen."),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiJsonBody(`/api/deployment-packages/${id}`, "DELETE"),
    onSuccess: () => {
      toast.success("Csomag deaktiválva.");
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Sikertelen."),
  });

  const columns: Column<DeploymentPackage>[] = [
    {
      key: "code",
      header: "Kód",
      render: (r) => <span style={{ fontFamily: "monospace" }}>{r.code}</span>,
    },
    { key: "name", header: "Név" },
    { key: "price_huf", header: "Ár", render: (r) => fmt(r.price_huf) },
    {
      key: "default_cycle",
      header: "Ciklus",
      render: (r) => CYCLE_LABEL[r.default_cycle],
    },
    {
      key: "resources",
      header: "Erőforrás",
      render: (r) => (
        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #555)" }}>
          {[
            r.resources.vcpu ? `${r.resources.vcpu} vCPU` : null,
            r.resources.ram_mb ? `${r.resources.ram_mb} MB` : null,
            r.resources.disk_gb ? `${r.resources.disk_gb} GB` : null,
          ]
            .filter(Boolean)
            .join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "is_active",
      header: "Állapot",
      width: "100px",
      render: (r) =>
        r.is_active ? (
          <Badge variant="success">Aktív</Badge>
        ) : (
          <Badge variant="default">Inaktív</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      width: "60px",
      render: (r) =>
        r.is_active ? (
          <button
            onClick={() => deactivateMutation.mutate(r._id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-status-error, #f87171)",
            }}
            title="Deaktiválás"
          >
            <Trash2 size={14} />
          </button>
        ) : null,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="Deployment csomagok"
        subtitle="Billable csomagok (erőforrás, ár, ciklus), amelyeket deploymentekhez rendelhetsz"
        actions={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} style={{ marginRight: "6px" }} />
            Új csomag
          </Button>
        }
      />
      <Card className="p-0 overflow-hidden">
        <Table<DeploymentPackage>
          data={rows}
          columns={columns}
          keyField="_id"
          emptyMessage="Nincs deployment csomag"
        />
      </Card>

      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="rounded-xl border p-6"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
              width: "100%",
              maxWidth: "480px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 16px 0" }}>Új csomag</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <Input
                label="Kód"
                placeholder="pl. small-5gb"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Input
                label="Név"
                placeholder="pl. Small — 5 GB, 1 core"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="Ár (HUF)"
                value={priceHuf}
                onChange={(e) => setPriceHuf(e.target.value)}
              />
              <div className="flex flex-col gap-1.5">
                <Label>Alapértelmezett ciklus</Label>
                <Select value={cycle} onValueChange={(v) => setCycle(v as BillingCycle)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[1100]">
                    <SelectItem value="monthly">Havi</SelectItem>
                    <SelectItem value="quarterly">Negyedéves</SelectItem>
                    <SelectItem value="yearly">Éves</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                label="vCPU"
                value={vcpu}
                onChange={(e) => setVcpu(e.target.value)}
              />
              <Input
                label="RAM (MB)"
                value={ramMb}
                onChange={(e) => setRamMb(e.target.value)}
              />
              <Input
                label="Disk (GB)"
                value={diskGb}
                onChange={(e) => setDiskGb(e.target.value)}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                marginTop: "20px",
              }}
            >
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Mégse
              </Button>
              <Button
                variant="primary"
                onClick={() => createMutation.mutate()}
                style={{ opacity: createMutation.isPending ? 0.6 : 1 }}
              >
                Mentés
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
