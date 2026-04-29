"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import { Search, Plus, Edit } from "lucide-react";
import { useRouter } from "next/navigation";

const mockOrgs = [
  { _id: "org1", name: "Acme Kft.", type: "Partner", status: "Active" },
  { _id: "org2", name: "GlobalTech Zrt.", type: "Client", status: "Active" },
];

export default function OrganizationsPage() {
  const router = useRouter();

  const columns = [
    {
      key: "name",
      header: "Szervezet Neve",
      accessor: (row: any) => <span className="font-bold">{row.name}</span>,
    },
    { key: "type", header: "Típus", accessor: (row: any) => row.type },
    {
      key: "status",
      header: "Állapot",
      accessor: (row: any) => <Badge variant="success">{row.status}</Badge>,
    },
    {
      key: "actions",
      header: "",
      accessor: (row: any) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            className="h-8 w-8 p-2"
            onClick={() => router.push(`/organizations/${row._id}`)}
          >
            <Edit size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Szervezetek"
        subtitle="Ügyfelek és partnerek kezelése"
        actions={
          <Button variant="primary" onClick={() => router.push("/organizations/new")}>
            <Plus size={16} className="mr-2" /> Új szervezet
          </Button>
        }
      />

      <Card className="p-4 space-y-4">
        <div className="flex items-end max-w-md relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            size={16}
          />
          <Input label="" placeholder="Keresés..." className="pl-9 w-full" />
        </div>
        <Table
          data={mockOrgs}
          columns={columns}
          keyField="_id"
          emptyMessage="Nincs adat."
        />
      </Card>
    </div>
  );
}
