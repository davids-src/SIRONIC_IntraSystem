"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { Button, Card, Input } from "@crm/ui";

export function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Hibás email vagy jelszó.");
        return;
      }
      window.location.href = "/";
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card style={{ width: "100%", maxWidth: 400, padding: "24px" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "8px" }}>Bejelentkezés</h1>
      <p
        style={{
          fontSize: "0.875rem",
          color: "var(--color-text-muted)",
          marginBottom: "20px",
        }}
      >
        SIRONIC CRM belső hozzáférés
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm">Email</label>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm">Jelszó</label>
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? (
          <p style={{ color: "var(--color-danger, #f87171)", fontSize: "0.875rem" }}>
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Belépés…" : "Belépés"}
        </Button>
      </form>
    </Card>
  );
}
