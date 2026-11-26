"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@erp/ui";
import { deleteSecretAction } from "../actions";

export function DeleteSecretButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const remove = () =>
    start(async () => {
      const r = await deleteSecretAction(id);
      if (r.success) {
        toast.success(r.message);
        router.push("/secrets");
      } else {
        toast.error(r.message);
        setOpen(false);
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          Törlés
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Biztosan törlöd?</DialogTitle>
          <DialogDescription>
            A(z) „{name}” titok és minden megosztása véglegesen törlődik. Ez nem vonható
            vissza.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Mégse
          </Button>
          <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
            Végleges törlés
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
