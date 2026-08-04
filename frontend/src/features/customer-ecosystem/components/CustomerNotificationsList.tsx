import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { CustomerNotification } from "../types";

const typeColors: Record<CustomerNotification["type"], string> = {
  emi: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  insurance: "bg-amber-500/10 text-amber-800",
  service: "bg-emerald-500/10 text-emerald-800",
  auction: "bg-purple-500/10 text-purple-800",
  price_drop: "bg-rose-500/10 text-rose-800",
  dealer: "bg-slate-500/10 text-slate-700",
  ai: "bg-primary/10 text-primary",
  loyalty: "bg-yellow-500/10 text-yellow-800",
  system: "bg-muted text-muted-foreground",
};

type CustomerNotificationsListProps = {
  notifications: CustomerNotification[];
  onMarkRead?: (id: string) => void;
};

export function CustomerNotificationsList({ notifications, onMarkRead }: CustomerNotificationsListProps) {
  return (
    <ul className="space-y-2">
      {notifications.map((n) => (
        <li key={n.id}>
          <div
            className={cn(
              "cos-notif",
              !n.read && "cos-notif--unread"
            )}
          >
            <span className={cn("cos-notif__type", typeColors[n.type])}>{n.type.replace("_", " ")}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{n.title}</p>
              {n.body ? <p className="text-sm text-muted-foreground">{n.body}</p> : null}
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(n.createdAt).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              {n.actionUrl ? (
                <Link to={n.actionUrl} className="text-xs font-medium text-primary hover:underline">
                  Open
                </Link>
              ) : null}
              {!n.read && onMarkRead ? (
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => onMarkRead(n.id)}>
                  Mark read
                </button>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
