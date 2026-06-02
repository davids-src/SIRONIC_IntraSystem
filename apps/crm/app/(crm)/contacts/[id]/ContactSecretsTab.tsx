"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Button, Input } from "@crm/ui";
import {
  KeyRound,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Lock,
  Unlock,
  X,
  Check,
} from "lucide-react";
import { apiJson, apiJsonBody } from "@/lib/api-client";

interface SecretMeta {
  _id: string;
  key: string;
  visibility: "shared" | "private";
  created_by: string;
  created_at: string;
  project_id: string | null;
  contact_id: string | null;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("hu-HU");
}

export function ContactSecretsTab({
  contactId,
  projectId,
}: {
  contactId?: string;
  projectId?: string;
}) {
  const [secrets, setSecrets] = useState<SecretMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // New secret form
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newVisibility, setNewVisibility] = useState<"shared" | "private">("shared");
  const [saving, setSaving] = useState(false);

  // Reveal state per secret
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revealing, setRevealing] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  const [error, setError] = useState<string | null>(null);

  const load = () => {
    const params = new URLSearchParams();
    if (contactId) params.set("contact_id", contactId);
    if (projectId) params.set("project_id", projectId);
    setLoading(true);
    apiJson<SecretMeta[]>(`/api/secrets?${params.toString()}`)
      .then((data) => setSecrets(data))
      .catch(() => setError("Nem sikerült betölteni a titkokat."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, projectId]);

  const handleCreate = async () => {
    if (!newKey.trim() || !newValue) {
      setError("Kulcs és érték megadása kötelező.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiJsonBody("/api/secrets", "POST", {
        key: newKey.trim(),
        value: newValue,
        visibility: newVisibility,
        contact_id: contactId ?? null,
        project_id: projectId ?? null,
      });
      setNewKey("");
      setNewValue("");
      setNewVisibility("shared");
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e?.message ?? "Hiba a mentés során.");
    } finally {
      setSaving(false);
    }
  };

  const handleReveal = async (id: string) => {
    if (revealed[id] !== undefined) {
      // Toggle hide
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    setRevealing((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await apiJsonBody<{ value: string }>(
        `/api/secrets/${id}/reveal`,
        "POST",
        {},
      );
      setRevealed((prev) => ({ ...prev, [id]: res.value }));
    } catch {
      setError("Nem sikerült visszafejteni a titkot.");
    } finally {
      setRevealing((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleCopy = async (id: string) => {
    const val = revealed[id];
    if (!val) return;
    await navigator.clipboard.writeText(val);
    setCopied((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setCopied((prev) => ({ ...prev, [id]: false })), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Biztosan törölni szeretnéd ezt a titkot?")) return;
    try {
      await apiJsonBody(`/api/secrets/${id}`, "DELETE", undefined);
      setSecrets((prev) => prev.filter((s) => s._id !== id));
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      setError("Törlés sikertelen.");
    }
  };

  return (
    <Card className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <KeyRound size={18} className="text-[var(--color-accent-primary)]" />
          Titoktár
        </h3>
        <Button variant="primary" size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? (
            <>
              <X size={14} className="mr-1" /> Mégse
            </>
          ) : (
            <>
              <Plus size={14} className="mr-1" /> Új titok
            </>
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-status-error)] bg-[var(--color-status-error)]/10 border border-[var(--color-status-error)]/30 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* New secret form */}
      {showForm && (
        <div className="p-4 rounded-lg border border-[var(--color-accent-primary)]/30 bg-[var(--color-bg-secondary)] space-y-3">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            Új titok rögzítése
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Kulcs (pl. API_KEY, DB_PASSWORD)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="MY_SECRET_KEY"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                Láthatóság
              </label>
              <div className="flex gap-2">
                {(["shared", "private"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setNewVisibility(v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      newVisibility === v
                        ? "bg-[var(--color-accent-primary)] text-white border-[var(--color-accent-primary)]"
                        : "bg-[var(--color-bg-primary)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)] hover:border-[var(--color-accent-primary)]"
                    }`}
                  >
                    {v === "shared" ? <Unlock size={12} /> : <Lock size={12} />}
                    {v === "shared" ? "Megosztott" : "Privát"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">
              Érték (titkosítva kerül tárolásra)
            </label>
            <div className="relative">
              <input
                type="password"
                autoComplete="new-password"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button variant="primary" onClick={handleCreate} disabled={saving}>
              {saving ? "Mentés…" : "Titkosítva mentés"}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="p-6 text-center text-[var(--color-text-muted)] text-sm">
          Betöltés…
        </div>
      ) : secrets.length === 0 ? (
        <div className="p-8 text-center text-[var(--color-text-muted)] space-y-2">
          <KeyRound size={32} className="mx-auto opacity-30" />
          <p className="text-sm">Még nincs tárolt titok.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {secrets.map((s) => {
            const isRevealed = revealed[s._id] !== undefined;
            const isRevealing = revealing[s._id];
            const isCopied = copied[s._id];

            return (
              <div
                key={s._id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent-primary)]/40 transition-colors"
              >
                {/* Icon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-md bg-[var(--color-accent-badgeBg)] flex items-center justify-center">
                  <KeyRound size={14} className="text-[var(--color-accent-primary)]" />
                </div>

                {/* Key name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-[var(--color-text-primary)] truncate">
                      {s.key}
                    </span>
                    <Badge variant={s.visibility === "private" ? "warning" : "default"}>
                      {s.visibility === "private" ? (
                        <>
                          <Lock size={10} className="mr-1" />
                          Privát
                        </>
                      ) : (
                        <>
                          <Unlock size={10} className="mr-1" />
                          Megosztott
                        </>
                      )}
                    </Badge>
                  </div>
                  {isRevealed ? (
                    <div className="mt-1 flex items-center gap-2">
                      <code className="text-xs font-mono bg-[var(--color-bg-primary)] border border-[var(--color-border-subtle)] px-2 py-1 rounded break-all text-[var(--color-status-success)]">
                        {revealed[s._id]}
                      </code>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)] font-mono">
                      ••••••••••••
                    </span>
                  )}
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {fmtDate(s.created_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleReveal(s._id)}
                    disabled={isRevealing}
                    title={isRevealed ? "Elrejt" : "Megjelenítés"}
                  >
                    {isRevealing ? (
                      <span className="text-xs">…</span>
                    ) : isRevealed ? (
                      <EyeOff size={14} />
                    ) : (
                      <Eye size={14} />
                    )}
                  </Button>

                  {isRevealed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleCopy(s._id)}
                      title="Vágólapra másolás"
                    >
                      {isCopied ? (
                        <Check size={14} className="text-[var(--color-status-success)]" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete(s._id)}
                    title="Törlés"
                    className="text-[var(--color-status-error)] hover:bg-[var(--color-status-error)]/10"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
