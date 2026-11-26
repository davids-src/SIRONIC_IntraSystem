"use client";

import { signOut } from "next-auth/react";
import { Button } from "@erp/ui";

export function KijelentkezesGomb() {
  return (
    <Button onClick={() => signOut({ callbackUrl: "/login" })} className="w-full">
      Kijelentkezés
    </Button>
  );
}
