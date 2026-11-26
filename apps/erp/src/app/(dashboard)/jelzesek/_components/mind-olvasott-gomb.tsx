"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCheckIcon } from "lucide-react";
import { Button } from "@erp/ui";
import { olvasottAction } from "../actions";

export function MindOlvasottGomb({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          await olvasottAction("mind");
          toast.success("Minden jelzés olvasottnak jelölve.");
          router.refresh();
        })
      }
    >
      <CheckCheckIcon className="h-4 w-4" /> Mind olvasott
    </Button>
  );
}
