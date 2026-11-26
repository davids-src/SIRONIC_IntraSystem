"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <button className="auth-button" onClick={logout} disabled={busy}>
      {busy ? "Kijelentkezés..." : "Kijelentkezés"}
    </button>
  );
}
