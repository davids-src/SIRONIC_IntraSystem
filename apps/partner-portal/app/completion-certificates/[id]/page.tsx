"use client";

import { PageHeader, Card, Badge, Button, Input, Textarea, Label } from "@crm/ui";
import type { CompletionCertificate } from "@crm/types";
import { apiJson, apiJsonBody } from "@/lib/api-client";
import { parseCompletionCertificate } from "@/lib/entity-parsers";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";

const statusLabel: Record<CompletionCertificate["status"], string> = {
  draft: "Piszkozat",
  sent: "Aláírásra vár",
  accepted: "Elfogadva",
  rejected: "Elutasítva",
};

const statusVariant = {
  draft: "default",
  sent: "warning",
  accepted: "success",
  rejected: "error",
} as const;

export default function PartnerCompletionCertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [doc, setDoc] = useState<CompletionCertificate | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Workflow states
  const [actionType, setActionType] = useState<"none" | "accept" | "reject">("none");

  // Accept form states
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [declaredChecked, setDeclaredChecked] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reject form states
  const [rejectionReason, setRejectionReason] = useState("");

  const loadDoc = async (signal?: AbortSignal) => {
    try {
      const raw = await apiJson<unknown>(`/api/completion-certificates/${id}`, {
        signal,
      });
      setDoc(parseCompletionCertificate(raw));
      setLoadErr(null);
    } catch {
      if (!signal?.aborted) setLoadErr("Az igazolás nem elérhető.");
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    loadDoc(ac.signal);
    return () => ac.abort();
  }, [id]);

  // Canvas drawing handlers
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return { x: 0, y: 0 };
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (e.cancelable) {
      e.preventDefault();
    }

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setIsDrawing(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (e.cancelable) {
      e.preventDefault();
    }

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim()) {
      alert("Kérjük, add meg az aláíró nevét.");
      return;
    }
    if (!declaredChecked) {
      alert("Az elfogadáshoz kötelező bejelölni a nyilatkozatot.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if canvas is empty
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const buffer = new Uint32Array(
      ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer,
    );
    const hasDrawn = buffer.some((color) => color !== 0);

    if (!hasDrawn) {
      alert("Kérjük, rajzold le az aláírásodat a kijelölt mezőben.");
      return;
    }

    const clientSignature = canvas.toDataURL("image/png");
    setSubmitting(true);
    try {
      await apiJsonBody(`/api/completion-certificates/${id}`, "PATCH", {
        status: "accepted",
        client_name: signerName.trim(),
        client_title: signerTitle.trim() || null,
        client_signature: clientSignature,
      });
      setActionType("none");
      await loadDoc();
    } catch (err) {
      alert("Nem sikerült az elfogadás elküldése.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      alert("Kérjük, add meg az elutasítás indokát.");
      return;
    }
    setSubmitting(true);
    try {
      await apiJsonBody(`/api/completion-certificates/${id}`, "PATCH", {
        status: "rejected",
        rejection_reason: rejectionReason.trim(),
      });
      setActionType("none");
      await loadDoc();
    } catch (err) {
      alert("Nem sikerült az elutasítás elküldése.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!doc && !loadErr) {
    return <div className="p-6 text-[var(--color-text-muted)]">Betöltés…</div>;
  }
  if (loadErr && !doc) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-red-400">{loadErr}</p>
        <Button
          variant="secondary"
          onClick={() => router.push("/completion-certificates")}
        >
          Vissza
        </Button>
      </div>
    );
  }
  if (!doc) return null;

  const totalAmount = doc.lines
    ? doc.lines.reduce((sum, l) => sum + l.quantity * (l.net_unit_price || 0), 0)
    : 0;

  const fmtDate = (d: Date | string | null) => {
    if (!d) return "—";
    const date = typeof d === "string" ? new Date(d) : d;
    return new Intl.DateTimeFormat("hu-HU").format(date);
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <PageHeader
        title={`${doc.certificate_number} — ${doc.title}`}
        subtitle="Teljesítési igazolás részletei és jóváhagyása"
        actions={
          <Button
            variant="secondary"
            onClick={() => router.push("/completion-certificates")}
          >
            Vissza
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--color-text-secondary)]">Státusz:</span>
        <Badge variant={statusVariant[doc.status]}>{statusLabel[doc.status]}</Badge>
      </div>

      {/* Rejection alert */}
      {doc.status === "rejected" && doc.rejection_reason && (
        <Card className="p-4 bg-red-950/20 border-red-900/50 text-red-200">
          <h4 className="text-sm font-bold text-red-400 mb-1">Ügyfél által elutasítva</h4>
          <p className="text-sm italic">&quot;{doc.rejection_reason}&quot;</p>
        </Card>
      )}

      {/* Acceptance alert */}
      {doc.status === "accepted" && (
        <Card className="p-4 bg-green-950/20 border-green-900/50 text-green-200">
          <h4 className="text-sm font-bold text-green-400 mb-1">
            Sikeresen elfogadva és leigazolva
          </h4>
          <p className="text-xs">
            Aláíró: {doc.client_name} {doc.client_title ? `(${doc.client_title})` : ""} ·
            Dátum: {fmtDate(doc.signed_at)}
          </p>
        </Card>
      )}

      {/* Document info grid */}
      <Card className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
            Munkaidőszak
          </span>
          <p className="text-sm font-medium mt-1">
            {fmtDate(doc.work_period_start)} – {fmtDate(doc.work_period_end)}
          </p>
        </div>
        <div>
          <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
            Összesített munkaóra
          </span>
          <p className="text-sm font-medium mt-1">
            {doc.total_hours != null ? `${doc.total_hours} óra` : "—"}
          </p>
        </div>
      </Card>

      {/* Work summary */}
      <Card className="p-6 space-y-3">
        <h3 className="text-sm font-bold text-[var(--color-text-secondary)] border-b pb-2">
          Elvégzett munka leírása
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">
          {doc.work_summary}
        </p>
      </Card>

      {/* Itemized Lines */}
      {doc.lines && doc.lines.length > 0 && (
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-[var(--color-text-secondary)] border-b pb-2">
            Igazolt tételek és anyagok listája
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
                  <th className="py-2 px-3 font-semibold">Megnevezés</th>
                  <th className="py-2 px-3 font-semibold text-right">Mennyiség</th>
                  <th className="py-2 px-3 font-semibold">Egység</th>
                  <th className="py-2 px-3 font-semibold text-right">Nettó egységár</th>
                  <th className="py-2 px-3 font-semibold text-right">Összesen</th>
                </tr>
              </thead>
              <tbody>
                {doc.lines.map((l, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-[var(--color-border-subtle)]/50 hover:bg-white/5"
                  >
                    <td className="py-2.5 px-3 font-medium">{l.description}</td>
                    <td className="py-2.5 px-3 text-right">{l.quantity}</td>
                    <td className="py-2.5 px-3 text-[var(--color-text-muted)]">
                      {l.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {l.net_unit_price != null
                        ? `${l.net_unit_price.toLocaleString("hu-HU")} Ft`
                        : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium">
                      {l.net_unit_price != null
                        ? `${(l.quantity * l.net_unit_price).toLocaleString("hu-HU")} Ft`
                        : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold border-t border-[var(--color-border-subtle)] bg-white/5">
                  <td colSpan={4} className="py-3 px-3">
                    Nettó mindösszesen:
                  </td>
                  <td className="py-3 px-3 text-right text-[var(--color-accent-primary)]">
                    {totalAmount.toLocaleString("hu-HU")} Ft
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Signature display for accepted state */}
      {doc.status === "accepted" && doc.client_signature && (
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-[var(--color-text-secondary)] border-b pb-2">
            Hitelesítési aláírás
          </h3>
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg max-w-[320px] mx-auto border">
            <img
              src={doc.client_signature}
              alt="Client Signature"
              className="max-h-[120px]"
            />
            <div className="border-t w-full text-center mt-2 pt-2">
              <p className="text-xs font-semibold text-gray-800">{doc.client_name}</p>
              {doc.client_title && (
                <p className="text-[10px] text-gray-500">{doc.client_title}</p>
              )}
              <p className="text-[10px] text-gray-400 mt-1">{fmtDate(doc.signed_at)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Approval Portal controls (only visible if status is sent) */}
      {doc.status === "sent" && actionType === "none" && (
        <div className="flex gap-4">
          <Button
            variant="primary"
            className="flex-1 py-3 text-base font-semibold"
            onClick={() => setActionType("accept")}
          >
            Igazolás elfogadása és aláírása
          </Button>
          <Button
            variant="secondary"
            className="flex-1 py-3 text-base font-semibold border-red-900/50 hover:bg-red-950/10 text-red-400"
            onClick={() => setActionType("reject")}
          >
            Igazolás elutasítása indoklással
          </Button>
        </div>
      )}

      {/* Accept form */}
      {doc.status === "sent" && actionType === "accept" && (
        <Card className="p-6 space-y-4 border-[var(--color-accent-primary)]/40">
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">
            Teljesítés leigazolása és digitális aláírás
          </h3>
          <form onSubmit={handleAcceptSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="signer-name">Aláíró képviselő neve *</Label>
                <Input
                  id="signer-name"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Pl. Kovács István"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="signer-title">Beosztás / Megnevezés (opcionális)</Label>
                <Input
                  id="signer-title"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  placeholder="Pl. Ügyvezető, Projektvezető"
                />
              </div>
            </div>

            {/* Signature Canvas */}
            <div className="space-y-2">
              <Label>Aláírás rajzolása (egérrel vagy érintőképernyővel) *</Label>
              <div className="flex flex-col items-center">
                <div className="border border-[var(--color-border-subtle)] rounded-lg overflow-hidden bg-white">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={180}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="cursor-crosshair max-w-full"
                  />
                </div>
                <div className="flex justify-end w-full max-w-[500px] mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-xs"
                    onClick={clearCanvas}
                  >
                    Aláírás törlése / Újrarajzolás
                  </Button>
                </div>
              </div>
            </div>

            {/* Declaration Checkbox */}
            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="declare"
                checked={declaredChecked}
                onChange={(e) => setDeclaredChecked(e.target.checked)}
                className="mt-1"
                required
              />
              <label
                htmlFor="declare"
                className="text-xs text-[var(--color-text-secondary)] leading-relaxed cursor-pointer select-none"
              >
                Kijelentem, hogy az elvégzett munka leírását, a feltüntetett tételeket és
                mennyiségeket ellenőriztem, és azokat a valósággal egyezőnek fogadom el.
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setActionType("none")}>
                Mégse
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Aláírás küldése…" : "Igazolás aláírása"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Reject form */}
      {doc.status === "sent" && actionType === "reject" && (
        <Card className="p-6 space-y-4 border-red-900/40">
          <h3 className="text-base font-bold text-red-400">
            Teljesítésigazolás elutasítása
          </h3>
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="rejection-reason">
                Elutasítás indoklása (Miért nem fogadható el a teljesítés?) *
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Kérjük, írd le részletesen, milyen hibákat, hiányosságokat tapasztaltál, vagy mely tételekkel nem értesz egyet..."
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setActionType("none")}>
                Mégse
              </Button>
              <Button
                type="submit"
                variant="primary"
                style={{
                  backgroundColor: "var(--color-status-error)",
                  borderColor: "var(--color-status-error)",
                }}
                disabled={submitting}
              >
                {submitting ? "Küldés…" : "Elutasítás elküldése"}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
