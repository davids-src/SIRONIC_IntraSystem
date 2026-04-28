import { hasPermission } from "@crm/rbac";

export default function CrmDashboardPage() {
  const canViewOrganizations = hasPermission(
    {
      actorId: "seed-admin",
      roleKeys: ["crm.admin"],
      tenantId: "global",
    },
    {
      module: "organization",
      action: "view",
      scope: "global",
    },
  );

  return (
    <main
      style={{
        padding: "2rem",
        minHeight: "100vh",
        background: "#111827",
        color: "#f9fafb",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem", color: "#22c55e" }}>
        SIRONIC CRM Dashboard
      </h1>
      <p style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>
        Phase 1 foundation is initialized.
      </p>
      <p style={{ fontWeight: 700, color: "#facc15" }}>
        Organization module access check: {canViewOrganizations ? "allowed" : "denied"}
      </p>
    </main>
  );
}
