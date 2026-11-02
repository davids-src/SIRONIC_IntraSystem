import { redirect } from "next/navigation";
import { getSession } from "@/lib/session-cookie";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <div className="auth-card">
        <h1 style={{ fontSize: "1.1rem", marginBottom: "8px" }}>Bejelentkezve</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          {session.email}
        </p>
        <LogoutButton />
      </div>
    </div>
  );
}
