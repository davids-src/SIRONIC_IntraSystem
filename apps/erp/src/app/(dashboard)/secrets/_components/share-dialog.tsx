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
  Label,
} from "@erp/ui";
import {
  SHARE_KIND_LABELS,
  SHARE_LEVELS,
  SHARE_LEVEL_LABELS,
  type SecretShareRow,
  type ShareKind,
  type ShareLevel,
} from "@erp/secrets/client";
import { revokeSecretShareAction, shareSecretAction } from "../actions";

type Option = { id: string; label: string };

const selectClass =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";

export function ShareDialog({
  secretId,
  shares,
  users,
  roles,
}: {
  secretId: string;
  shares: SecretShareRow[];
  users: Option[];
  roles: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ShareKind>("user");
  const [targetId, setTargetId] = useState("");
  const [level, setLevel] = useState<ShareLevel>("read");
  const [pending, start] = useTransition();

  const options = kind === "user" ? users : roles;

  const add = () =>
    start(async () => {
      const r = await shareSecretAction(secretId, { kind, targetId, level });
      if (r.success) {
        toast.success(r.message);
        setTargetId("");
        router.refresh();
      } else toast.error(r.message);
    });

  const revoke = (shareId: string) =>
    start(async () => {
      const r = await revokeSecretShareAction(secretId, shareId);
      if (r.success) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.message);
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Megosztás ({shares.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Titok megosztása</DialogTitle>
          <DialogDescription>
            Felhasználóval vagy szerepkörrel. A megosztás visszavonásáig él.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="share-kind">Típus</Label>
            <select
              id="share-kind"
              className={selectClass}
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as ShareKind);
                setTargetId("");
              }}
            >
              {(Object.keys(SHARE_KIND_LABELS) as ShareKind[]).map((k) => (
                <option key={k} value={k}>
                  {SHARE_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="share-level">Szint</Label>
            <select
              id="share-level"
              className={selectClass}
              value={level}
              onChange={(e) => setLevel(e.target.value as ShareLevel)}
            >
              {SHARE_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {SHARE_LEVEL_LABELS[l]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="share-target">Címzett</Label>
            <select
              id="share-target"
              className={selectClass}
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              <option value="">Válassz…</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button type="button" onClick={add} disabled={pending || !targetId}>
          Megosztás
        </Button>

        <div className="flex flex-col divide-y rounded-md border">
          {shares.length === 0 && (
            <p className="text-muted-foreground p-3 text-sm">Még nincs megosztva.</p>
          )}
          {shares.map((s) => (
            <div
              key={s._id}
              className="flex items-center justify-between gap-2 p-2 text-sm"
            >
              <span>
                <span className="font-medium">{s.targetName ?? s.targetId}</span>
                <span className="text-muted-foreground ml-2 text-xs">
                  {SHARE_KIND_LABELS[s.kind]} · {SHARE_LEVEL_LABELS[s.level]}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => revoke(s._id)}
              >
                Visszavonás
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
