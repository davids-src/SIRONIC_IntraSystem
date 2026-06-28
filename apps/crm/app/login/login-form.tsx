"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Input } from "@crm/ui";

export function LoginForm() {
  const searchParams = useSearchParams();
  const magicConsumeAttemptedRef = React.useRef(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [magicInfo, setMagicInfo] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [magicLoading, setMagicLoading] = React.useState(false);

  React.useEffect(() => {
    const queryEmail = searchParams.get("email") ?? "";
    const magicToken = searchParams.get("magicToken") ?? "";
    if (queryEmail && !email) {
      setEmail(queryEmail);
    }
    if (!queryEmail || !magicToken) {
      return;
    }
    if (magicConsumeAttemptedRef.current) {
      return;
    }
    magicConsumeAttemptedRef.current = true;

    let cancelled = false;
    async function consumeMagicLink() {
      setLoading(true);
      setError(null);
      const res = await signIn("magic-link", {
        email: queryEmail,
        token: magicToken,
        redirect: false,
      });
      if (cancelled) {
        return;
      }
      setLoading(false);
      if (res?.error) {
        setError("A magic link érvénytelen vagy lejárt.");
        return;
      }
      window.location.href = "/";
    }
    void consumeMagicLink();
    return () => {
      cancelled = true;
    };
  }, [searchParams, email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMagicInfo(null);
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

  async function onMagicLinkRequest() {
    setError(null);
    setMagicInfo(null);
    setMagicLoading(true);
    try {
      const response = await fetch("/api/auth/magic-link/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Nem sikerült elküldeni a magic linket.");
        return;
      }
      setMagicInfo(
        "Ha az email cím létezik a rendszerben, küldtünk egy egyszeri bejelentkezési linket.",
      );
    } catch {
      setError("Nem sikerült elküldeni a magic linket.");
    } finally {
      setMagicLoading(false);
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
        {magicInfo ? (
          <p style={{ color: "var(--color-success, #34d399)", fontSize: "0.875rem" }}>
            {magicInfo}
          </p>
        ) : null}
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Belépés…" : "Belépés"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={magicLoading || loading || !email.trim()}
          onClick={() => void onMagicLinkRequest()}
        >
          {magicLoading ? "Magic link küldése…" : "Belépés email magic linkkel"}
        </Button>
      </form>
    </Card>
  );
}
