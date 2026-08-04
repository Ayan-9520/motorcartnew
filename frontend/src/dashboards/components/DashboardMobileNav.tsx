import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutGrid, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuthStore } from "@/store/authStore";
import type { AppRole } from "@/types/database";
import { getRoleNavContext } from "@/dashboards/config/role-navigation";
import { cn } from "@/lib/utils";

/** Mobile/tablet dashboard navigation — sidebar is desktop-only (lg+). */
export function DashboardMobileNav() {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "customer") as AppRole;
  const { title, subtitle, items } = getRoleNavContext(role);

  return (
    <div className="dashboard-mobile-nav lg:hidden">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 rounded-full border-border/80 bg-card/80"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="dashboard-mobile-menu"
      >
        <LayoutGrid className="h-4 w-4" aria-hidden />
        Menu
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          id="dashboard-mobile-menu"
          showCloseButton={false}
          aria-describedby={undefined}
          className="dashboard-mobile-sheet left-0 top-0 h-full max-h-none w-[min(100vw,320px)] translate-x-0 translate-y-0 rounded-none border-r p-0 sm:max-w-none"
        >
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div>
              <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
              {subtitle ? <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{subtitle}</p> : null}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex flex-col gap-0.5 overflow-y-auto p-3" aria-label="Dashboard navigation">
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                    isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/60"
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" />
                {label}
              </NavLink>
            ))}
          </nav>
        </DialogContent>
      </Dialog>
    </div>
  );
}
