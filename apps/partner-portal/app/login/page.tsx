"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Card } from "@crm/ui";

export default function PartnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
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

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg-primary)]">
      <Card className="w-full max-w-md p-8 space-y-6">
        <h1 className="text-xl font-bold text-white">Partner portál</h1>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {err && <p className="text-sm text-[var(--color-status-error)]">{err}</p>}
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
        </form>
      </Card>
    </div>
  );
}
