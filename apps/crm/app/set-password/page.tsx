"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function CrmSetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setError("Hiányzó meghívó token. A link érvénytelen.");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("A jelszónak legalább 8 karakter hosszúnak kell lennie.");
      return;
    }
    if (password !== confirm) {
      setError("A két jelszó nem egyezik.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Hiba történt.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.replace("/login"), 3000);
    } catch {
      setError("Hálózati hiba. Kérjük, próbálja újra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9fafb", // Light background for CRM style
        padding: "20px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "16px",
          padding: "40px 36px",
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)",
        }}
      >
        {/* Logo / Brand */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)", // Blue for CRM
              marginBottom: "16px",
            }}
          >
            <span style={{ fontSize: "24px" }}>🔐</span>
          </div>
          <h1 style={{ color: "#111827", fontSize: "22px", fontWeight: 700, margin: 0 }}>
            Jelszó beállítása
          </h1>
          <p style={{ color: "#6b7280", fontSize: "14px", marginTop: "8px" }}>
            SIRONIC CRM
          </p>
        </div>

        {success ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "48px",
                marginBottom: "16px",
              }}
            >
              ✅
            </div>
            <h2 style={{ color: "#16a34a", fontSize: "18px", marginBottom: "8px" }}>
              Jelszó sikeresen beállítva!
            </h2>
            <p style={{ color: "#6b7280", fontSize: "14px" }}>
              Átirányítunk a bejelentkezési oldalra...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "20px",
                  color: "#dc2626",
                  fontSize: "13px",
                }}
              >
                {error}
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  color: "#374151",
                  fontSize: "13px",
                  fontWeight: 600,
                  marginBottom: "6px",
                }}
              >
                Új jelszó
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Legalább 8 karakter"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  color: "#111827",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  color: "#374151",
                  fontSize: "13px",
                  fontWeight: 600,
                  marginBottom: "6px",
                }}
              >
                Jelszó megerősítése
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Írd be újra a jelszót"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  color: "#111827",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              style={{
                width: "100%",
                padding: "12px",
                background: loading
                  ? "#9ca3af"
                  : "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "opacity 0.15s",
              }}
            >
              {loading ? "Mentés..." : "Jelszó beállítása és belépés"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CrmSetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f9fafb",
          }}
        >
          Betöltés...
        </div>
      }
    >
      <CrmSetPasswordForm />
    </Suspense>
  );
}
