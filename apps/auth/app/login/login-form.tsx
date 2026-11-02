"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSafeReturnTo } from "@crm/auth-core";

type Mode = "password" | "magic";

export function LoginForm() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [totpRequired, setTotpRequired] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [consumingLink, setConsumingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const goToDestination = () => {
    // /api/oidc/authorize is a backend route (not a Next.js page) that issues a further
    // redirect — a full navigation follows that; router.push wouldn't.
    if (returnTo) window.location.href = returnTo;
    else router.push("/me");
  };

  // Auto-consume a magic link opened from the email (?email=&magicToken=).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rt = params.get("return_to");
    if (rt && isSafeReturnTo(rt, window.location.origin)) setReturnTo(rt);
    const linkEmail = params.get("email");
    const magicToken = params.get("magicToken");
    if (!linkEmail || !magicToken) return;
    setConsumingLink(true);
    fetch("/api/magic-link/consume", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: linkEmail, token: magicToken }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "A link érvénytelen vagy lejárt.");
        }
        // Use the locally-parsed `rt`, not the `returnTo` state — this effect's closure
        // was created at mount, before the setReturnTo() call above could re-render.
        if (rt && isSafeReturnTo(rt, window.location.origin)) window.location.href = rt;
        else router.push("/me");
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "A link érvénytelen vagy lejárt.");
        setConsumingLink(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, code: code || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Bejelentkezés sikertelen.");
      if (body.totpRequired) {
        setTotpRequired(true);
        return;
      }
      goToDestination();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bejelentkezés sikertelen.");
    } finally {
      setBusy(false);
    }
  };

  const submitMagicRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/magic-link/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setMagicSent(true);
    } catch {
      setError("Kérés sikertelen.");
    } finally {
      setBusy(false);
    }
  };

  if (consumingLink) {
    return (
      <div className="auth-card">
        <p>Bejelentkezés folyamatban...</p>
        {error ? <p className="auth-error">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1 style={{ fontSize: "1.1rem", marginBottom: "4px" }}>Sironic bejelentkezés</h1>
      <p
        style={{
          color: "var(--text-secondary)",
          fontSize: "0.85rem",
          marginBottom: "20px",
        }}
      >
        Központi azonosítás a Sironic ökoszisztémához.
      </p>
      {error ? <p className="auth-error">{error}</p> : null}

      {mode === "password" ? (
        <form onSubmit={submitPassword}>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={totpRequired}
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="password">Jelszó</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={totpRequired}
              required
            />
          </div>
          {totpRequired ? (
            <div className="auth-field">
              <label htmlFor="code">Hitelesítő kód (vagy recovery kód)</label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                required
              />
            </div>
          ) : null}
          <button className="auth-button" type="submit" disabled={busy}>
            {busy ? "Belépés..." : "Belépés"}
          </button>
          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <button
              type="button"
              className="auth-link-button"
              onClick={() => {
                setMode("magic");
                setError(null);
              }}
            >
              Inkább egyszeri linket kérek emailben
            </button>
          </div>
        </form>
      ) : magicSent ? (
        <p className="auth-success">
          Ha létezik fiók ezzel az email címmel, küldtünk egy bejelentkezési linket.
        </p>
      ) : (
        <form onSubmit={submitMagicRequest}>
          <div className="auth-field">
            <label htmlFor="magic-email">Email</label>
            <input
              id="magic-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button className="auth-button" type="submit" disabled={busy}>
            {busy ? "Küldés..." : "Link küldése"}
          </button>
          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <button
              type="button"
              className="auth-link-button"
              onClick={() => setMode("password")}
            >
              Vissza a jelszavas belépéshez
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
