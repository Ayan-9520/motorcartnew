import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationDropdown() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 16 });
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();

  const updatePanelPos = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setPanelPos({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPos();
    const onReflow = () => updatePanelPos();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const handleMarkRead = async (id: string) => {
    await markRead(id);
  };

  const panel = open ? (
    <div
      ref={panelRef}
      className="notification-panel notification-panel--portal animate-fade-in"
      style={{ top: panelPos.top, right: panelPos.right }}
      role="dialog"
      aria-label="Notifications"
    >
      <div className="notification-panel-header">
        <div>
          <p className="font-bold text-foreground">Notifications</p>
          <p className="text-xs text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => void markAllRead()}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="notification-panel-list">
        {!isAuthenticated ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-semibold text-foreground">Sign in for alerts</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Leads, bookings &amp; updates appear here when you&apos;re logged in.
            </p>
            <Button size="sm" className="mt-4 rounded-xl" asChild onClick={() => setOpen(false)}>
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">No notifications yet</p>
        ) : (
          <ul>
            {notifications.map((n) => (
              <li key={n.id}>
                <div
                  className={cn(
                    "notification-item",
                    !n.is_read && "notification-item-unread"
                  )}
                >
                  {n.link ? (
                    <Link
                      to={n.link}
                      className="block flex-1"
                      onClick={() => {
                        if (!n.is_read) void handleMarkRead(n.id);
                        setOpen(false);
                      }}
                    >
                      <NotificationBody n={n} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="block w-full text-left"
                      onClick={() => !n.is_read && void handleMarkRead(n.id)}
                    >
                      <NotificationBody n={n} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative" ref={rootRef}>
      <Button
        ref={btnRef}
        type="button"
        variant="ghost"
        size="icon"
        className="nav-icon-btn nav-icon-btn-ghost relative"
        title={unreadCount > 0 ? `Notifications — ${unreadCount} unread` : "Notifications"}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-5 w-5" />
        {isAuthenticated && unreadCount > 0 && (
          <span className="nav-badge nav-badge-notify" aria-hidden>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {typeof document !== "undefined" ? createPortal(panel, document.body) : null}
    </div>
  );
}

function NotificationBody({
  n,
}: {
  n: { title: string; message: string; type: string; created_at: string; is_read: boolean };
}) {
  const text = n.message?.trim() || "";
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{n.title}</p>
        <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
      </div>
      {text ? (
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{text}</p>
      ) : null}
      {n.type ? (
        <span className="mt-1.5 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
          {n.type.replace(/_/g, " ")}
        </span>
      ) : null}
    </>
  );
}
