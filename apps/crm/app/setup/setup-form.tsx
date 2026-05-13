"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@crm/ui";

export function SetupForm() {
  const router = useRouter();
  const [tenantName, setTenantName] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantName,
          displayName: displayName || undefined,
          email,
          password,
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data === "object" && data && "error" in data
            ? String((data as { error: string }).error)
            : "Sikertelen regisztráció";
        setError(msg);
        return;
      }
      router.push("/login?registered=1");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card style={{ width: "100%", maxWidth: 440, padding: "24px" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "8px" }}>Első rendszergazda</h1>
      <p
        style={{
          fontSize: "0.875rem",
          color: "var(--color-text-muted)",
          marginBottom: "20px",
        }}
      >
        Még nincs felhasználó az adatbázisban. Hozd létre a globális CRM adminisztrátort
        és a szervezet nevét.
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm">Szervezet / cég neve</label>
          <Input
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm">Megjelenített név (opcionális)</label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm">Admin email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm">Jelszó (min. 8 karakter)</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        {error ? (
          <p style={{ color: "var(--color-danger, #f87171)", fontSize: "0.875rem" }}>
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Mentés…" : "Szervezet és admin létrehozása"}
        </Button>
      </form>
    </Card>
  );
}
