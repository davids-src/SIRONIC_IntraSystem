"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@erp/ui";
import { seedKategoriakAction } from "../../actions";

export function SeedGomb() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await seedKategoriakAction();
          if (r.message) toast[r.success ? "success" : "error"](r.message);
          router.refresh();
        })
      }
    >
      Alap kategóriák létrehozása (10 db)
    </Button>
  );
}
