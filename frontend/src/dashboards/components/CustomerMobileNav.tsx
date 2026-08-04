import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Car, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CUSTOMER_ECOSYSTEM_NAV } from "@/features/customer-ecosystem";
import { cn } from "@/lib/utils";

export function CustomerMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="dashboard-mobile-nav lg:hidden">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 rounded-full border-border/80 bg-card/80"
        onClick={() => setOpen(true)}
      >
        <Car className="h-4 w-4" />
        My Garage
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          className="dashboard-mobile-sheet left-0 top-0 h-full max-h-none w-[min(100vw,320px)] translate-x-0 translate-y-0 rounded-none border-r p-0 sm:max-w-none"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <DialogTitle className="text-base font-semibold">Ownership OS</DialogTitle>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Customer menu</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="max-h-[calc(100vh-4rem)] overflow-y-auto p-3">
            {CUSTOMER_ECOSYSTEM_NAV.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={`${group.label}-${to}-${label}`}
                    to={to}
                    end={end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                        isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </DialogContent>
      </Dialog>
    </div>
  );
}
