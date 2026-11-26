"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@erp/ui";
import { ALAIRAS_MAX_KARAKTER } from "@erp/bizonylat/client";

const SZELESSEG = 480;
const MAGASSAG = 180;

/**
 * Canvas signature pad in a dialog. The result is a small PNG data-URI kept in a hidden input
 * (`name`); the server re-validates mime and size. Only images small enough to store are accepted.
 */
export function AlairasPad({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  const [ertek, setErtek] = useState(defaultValue ?? "");
  const [nyitva, setNyitva] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rajzol = useRef(false);
  const rajzolt = useRef(false);

  const beallit = (c: HTMLCanvasElement | null) => {
    canvasRef.current = c;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";
    rajzolt.current = false;
  };

  const pont = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * SZELESSEG,
      y: ((e.clientY - r.top) / r.height) * MAGASSAG,
    };
  };

  const torol = () => {
    beallit(canvasRef.current);
  };

  const mentes = () => {
    const c = canvasRef.current;
    if (!c || !rajzolt.current) {
      toast.error("Még nincs aláírás megrajzolva.");
      return;
    }
    const data = c.toDataURL("image/png");
    if (data.length > ALAIRAS_MAX_KARAKTER) {
      toast.error("Az aláírás túl nagy, kérjük egyszerűbben rajzolja meg.");
      return;
    }
    setErtek(data);
    setNyitva(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <input type="hidden" name={name} value={ertek} />
      {ertek.startsWith("data:") ? (
        <img
          src={ertek}
          alt={label}
          className="bg-background h-20 w-fit rounded border"
        />
      ) : ertek ? (
        <p className="text-muted-foreground text-sm">Mentett aláírás (média).</p>
      ) : (
        <p className="text-muted-foreground text-sm">Nincs aláírás.</p>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setNyitva(true)}>
          {ertek ? "Újrarajzolás" : "Aláírás rögzítése"}
        </Button>
        {ertek && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setErtek("")}>
            Törlés
          </Button>
        )}
      </div>
      <Dialog open={nyitva} onOpenChange={setNyitva}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <canvas
            ref={beallit}
            width={SZELESSEG}
            height={MAGASSAG}
            className="w-full touch-none rounded border bg-white"
            onPointerDown={(e) => {
              const ctx = e.currentTarget.getContext("2d");
              if (!ctx) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              rajzol.current = true;
              const p = pont(e);
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
            }}
            onPointerMove={(e) => {
              if (!rajzol.current) return;
              const ctx = e.currentTarget.getContext("2d");
              if (!ctx) return;
              const p = pont(e);
              ctx.lineTo(p.x, p.y);
              ctx.stroke();
              rajzolt.current = true;
            }}
            onPointerUp={() => {
              rajzol.current = false;
            }}
            onPointerCancel={() => {
              rajzol.current = false;
            }}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={torol}>
              Törlés
            </Button>
            <Button type="button" onClick={mentes}>
              Aláírás mentése
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
