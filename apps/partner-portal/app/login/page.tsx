"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Label, Card } from "@crm/ui";

export default function PartnerLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const magicConsumeAttemptedRef = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [magicInfo, setMagicInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  useEffect(() => {
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
    void (async () => {
      setErr(null);
      setLoading(true);
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
        setErr("A magic link érvénytelen vagy lejárt.");
        return;
      }
      router.push("/");
      router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, email, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMagicInfo(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setErr("Hibás email vagy jelszó.");
      return;
    }
    router.push("/");
    router.refresh();
  };

  const requestMagicLink = async () => {
    setErr(null);
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
        setErr(data.error ?? "Nem sikerült elküldeni a magic linket.");
        return;
      }
      setMagicInfo(
        "Ha az email cím létezik a rendszerben, küldtünk egy egyszeri bejelentkezési linket.",
      );
    } catch {
      setErr("Nem sikerült elküldeni a magic linket.");
    } finally {
      setMagicLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg-primary)]">
      <Card className="w-full max-w-md p-8 space-y-6">
        <h1 className="text-xl font-bold text-white">Partner portál</h1>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {err && <p className="text-sm text-[var(--color-status-error)]">{err}</p>}
          {magicInfo && <p className="text-sm text-emerald-400">{magicInfo}</p>}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Jelszó</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? "Belépés…" : "Belépés"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={magicLoading || loading || !email.trim()}
            onClick={() => void requestMagicLink()}
          >
            {magicLoading ? "Magic link küldése…" : "Belépés email magic linkkel"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
