import { hasPermission } from "@crm/rbac";

export default function PartnerDashboardPage() {
  const canViewOffers = hasPermission(
    {
      actorId: "partner-user",
      roleKeys: ["partner.viewer"],
      tenantId: "org-001",
    },
    {
      module: "offer",
      action: "view",
      scope: "organization",
      resourceTenantId: "org-001",
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
        SIRONIC Partner Portal Dashboard
      </h1>
      <p style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>
        Phase 1 foundation is initialized.
      </p>
      <p style={{ fontWeight: 700, color: "#facc15" }}>
        Offer access check: {canViewOffers ? "allowed" : "denied"}
      </p>
    </main>
  );
}
