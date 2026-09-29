"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  FileText,
  FolderKanban,
  Receipt,
  Ticket,
  ClipboardList,
  Sparkles,
  AlertCircle,
  X,
} from "lucide-react";
import type { NotificationItem } from "@crm/types";

export interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onCountUpdate?: (count: number) => void;
}

export function NotificationCenter({
  isOpen,
  onClose,
  onCountUpdate,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const fetchNotifications = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        onCountUpdate?.(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  }, [onCountUpdate]);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      onCountUpdate?.(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      onCountUpdate?.(0);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    if (type.startsWith("offer")) return <FileText size={16} className="text-blue-500" />;
    if (type.startsWith("project"))
      return <FolderKanban size={16} className="text-amber-500" />;
    if (type.startsWith("invoice"))
      return <Receipt size={16} className="text-emerald-500" />;
    if (type.startsWith("ticket"))
      return <Ticket size={16} className="text-purple-500" />;
    if (type.startsWith("worklog"))
      return <ClipboardList size={16} className="text-cyan-500" />;
    return <Sparkles size={16} className="text-red-500" />;
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="fixed top-16 right-4 z-50 w-96 max-w-[90vw] rounded-xl border border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-3.5 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-red-500" />
            <span className="font-bold text-sm text-slate-100">Értesítési központ</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">
                {unreadCount} új
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                title="Mind olvasottnak jelölése"
              >
                <CheckCheck size={14} />
                <span>Mind olvasott</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-800/60">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <Check className="mx-auto mb-2 text-slate-600" size={24} />
              Nincsenek új értesítéseid.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                className={`p-3 text-xs transition-colors ${
                  !n.read
                    ? "bg-slate-800/40 hover:bg-slate-800/70"
                    : "hover:bg-slate-800/20 opacity-75"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex-shrink-0">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-semibold text-slate-200 truncate">{n.title}</h4>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">
                        {new Date(n.created_at).toLocaleDateString("hu-HU", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-slate-400 line-clamp-2">{n.message}</p>
                    <div className="mt-2 flex items-center justify-between pt-1">
                      {n.href ? (
                        <Link
                          href={n.href}
                          onClick={() => {
                            if (!n.read) markAsRead(n._id);
                            onClose();
                          }}
                          className="text-[11px] font-medium text-red-400 hover:text-red-300 underline"
                        >
                          Megtekintés →
                        </Link>
                      ) : (
                        <span />
                      )}
                      {!n.read && (
                        <button
                          onClick={() => markAsRead(n._id)}
                          className="text-[10px] text-slate-500 hover:text-slate-300"
                        >
                          Olvasottnak jelölés
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
