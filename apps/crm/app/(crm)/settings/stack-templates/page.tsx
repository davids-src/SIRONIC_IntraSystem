"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge, Button, Card, Input, Label, PageHeader, Table, Textarea } from "@crm/ui";
import type { Column } from "@crm/ui";
import type { StackTemplate } from "@crm/types";
import { Plus, Trash2 } from "lucide-react";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";

async function fetchTemplates(): Promise<StackTemplate[]> {
  return apiJson<StackTemplate[]>("/api/stack-templates");
}

const DEFAULT_COMPOSE = `services:
  app:
    container_name: {{STACK_NAME}}
    image: {{IMAGE}}:{{IMAGE_TAG}}
    restart: unless-stopped
    environment:
      - NEXTAUTH_URL=https://{{DOMAIN}}
    networks:
      - default
      - nginxproxy_default

networks:
  default:
    driver: bridge
  nginxproxy_default:
    external: true
`;

export default function StackTemplatesSettingsPage() {
  const queryClient = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["stack-templates"],
    queryFn: fetchTemplates,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [composeYaml, setComposeYaml] = useState(DEFAULT_COMPOSE);
  const [requiredNetworks, setRequiredNetworks] = useState("nginxproxy_default");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["stack-templates"] });

  const createMutation = useMutation({
    mutationFn: () =>
      apiJsonBody("/api/stack-templates", "POST", {
        name,
        description: description.trim() || null,
        compose_yaml: composeYaml,
        required_networks: requiredNetworks
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      toast.success("Stack sablon létrehozva.");
      setModalOpen(false);
      setName("");
      setDescription("");
      setComposeYaml(DEFAULT_COMPOSE);
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Létrehozás sikertelen."),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) =>
      apiJsonBody(`/api/stack-templates/${id}`, "PATCH", { is_default: true }),
    onSuccess: () => {
      toast.success("Alapértelmezett sablon beállítva.");
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Sikertelen."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiJsonBody(`/api/stack-templates/${id}`, "DELETE"),
    onSuccess: () => {
      toast.success("Sablon törölve.");
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Törlés sikertelen."),
  });

  const columns: Column<StackTemplate>[] = [
    { key: "name", header: "Név" },
    { key: "description", header: "Leírás", render: (r) => r.description ?? "—" },
    {
      key: "is_default",
      header: "Alapértelmezett",
      width: "130px",
      render: (r) =>
        r.is_default ? (
          <Badge variant="success">Igen</Badge>
        ) : (
          <button
            onClick={() => setDefaultMutation.mutate(r._id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.75rem",
              color: "var(--color-accent-primary, #e53935)",
            }}
          >
            Beállítás
          </button>
        ),
    },
    {
      key: "actions",
      header: "",
      width: "60px",
      render: (r) => (
        <button
          onClick={() => confirm("Biztosan törlöd?") && deleteMutation.mutate(r._id)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-status-error, #f87171)",
          }}
        >
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="Stack sablonok"
        subtitle="Docker Compose sablonok a deployment stackekhez (nginxproxy_default hálózat kötelező)"
        actions={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} style={{ marginRight: "6px" }} />
            Új sablon
          </Button>
        }
      />
      <Card className="p-0 overflow-hidden">
        <Table<StackTemplate>
          data={rows}
          columns={columns}
          keyField="_id"
          emptyMessage="Nincs stack sablon"
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
              maxWidth: "640px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 16px 0" }}>Új stack sablon</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <Input label="Név" value={name} onChange={(e) => setName(e.target.value)} />
              <Input
                label="Leírás"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Input
                label="Kötelező Docker hálózatok (vesszővel)"
                value={requiredNetworks}
                onChange={(e) => setRequiredNetworks(e.target.value)}
              />
              <div className="flex flex-col gap-1.5">
                <Label>
                  Compose YAML (placeholderek: {"{{STACK_NAME}}"}, {"{{IMAGE}}"},{" "}
                  {"{{IMAGE_TAG}}"}, {"{{DOMAIN}}"})
                </Label>
                <Textarea
                  rows={12}
                  value={composeYaml}
                  onChange={(e) => setComposeYaml(e.target.value)}
                  style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
                />
              </div>
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
