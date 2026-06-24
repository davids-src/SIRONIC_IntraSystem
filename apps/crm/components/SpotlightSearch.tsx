"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/api-client";

interface SearchResult {
  type: string;
  id: string;
  label: string;
  subtitle?: string;
  href: string;
  badge: string;
}

const BADGE_COLORS: Record<string, string> = {
  Partner: "bg-blue-100 text-blue-800",
  Projekt: "bg-purple-100 text-purple-800",
  Ticket: "bg-red-100 text-red-800",
  Munkalap: "bg-green-100 text-green-800",
  Raktár: "bg-amber-100 text-amber-800",
};

export function SpotlightSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Ctrl+K megnyitás
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQ("");
        setResults([]);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keresés debounce-szal
  useEffect(() => {
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiJson<SearchResult[]>(
          `/api/search?q=${encodeURIComponent(q)}`,
        );
        setResults(data);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [q]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setQ("");
      setResults([]);
      router.push(href);
    },
    [router],
  );

  // Nyilak + Enter navigáció
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      navigate(results[selectedIndex].href);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "var(--color-bg-card, #1a1a2e)",
          border: "1px solid var(--color-border-default, rgba(255,255,255,0.1))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-subtle,rgba(255,255,255,0.08))]">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-[var(--color-text-muted)] flex-shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-[var(--color-text-primary)] text-base outline-none placeholder:text-[var(--color-text-muted)]"
            placeholder="Keresés partnerek, projektek, ticketek, munkalapok, raktár között…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && (
            <svg
              className="animate-spin text-[var(--color-accent-primary)] flex-shrink-0"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          )}
          <kbd className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] px-2 py-1 rounded flex-shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <ul className="max-h-80 overflow-y-auto py-2">
            {results.map((r, i) => (
              <li key={`${r.type}-${r.id}`}>
                <button
                  className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors ${
                    i === selectedIndex
                      ? "bg-[var(--color-accent-primary)] text-white"
                      : "hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                  }`}
                  onClick={() => navigate(r.href)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      i === selectedIndex
                        ? "bg-white/20 text-white"
                        : (BADGE_COLORS[r.badge] ?? "bg-gray-100 text-gray-700")
                    }`}
                  >
                    {r.badge}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium text-sm">{r.label}</span>
                    {r.subtitle && (
                      <span
                        className={`block truncate text-xs ${i === selectedIndex ? "text-white/70" : "text-[var(--color-text-muted)]"}`}
                      >
                        {r.subtitle}
                      </span>
                    )}
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`flex-shrink-0 ${i === selectedIndex ? "text-white/50" : "text-[var(--color-text-muted)]"}`}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        ) : q.length >= 2 && !loading ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
            Nincs találat a(z) „{q}" keresőszóra.
          </div>
        ) : q.length < 2 ? (
          <div className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
            Kezdj el gépelni a kereséshez (min. 2 karakter)…
          </div>
        ) : null}

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--color-border-subtle,rgba(255,255,255,0.06))] flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
          <span>
            <kbd className="bg-[var(--color-bg-secondary)] px-1.5 py-0.5 rounded">↑↓</kbd>{" "}
            navigáció
          </span>
          <span>
            <kbd className="bg-[var(--color-bg-secondary)] px-1.5 py-0.5 rounded">↵</kbd>{" "}
            megnyitás
          </span>
          <span className="ml-auto">
            <kbd className="bg-[var(--color-bg-secondary)] px-1.5 py-0.5 rounded">
              Ctrl
            </kbd>
            +<kbd className="bg-[var(--color-bg-secondary)] px-1.5 py-0.5 rounded">K</kbd>{" "}
            váltás
          </span>
        </div>
      </div>
    </div>
  );
}
