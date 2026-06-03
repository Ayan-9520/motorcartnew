import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Car, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { NEW_CAR_DEALER_NAV } from "../config/ncd-nav";
import { cn } from "@/lib/utils";

export function NewCarDealerMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => setOpen(true)}>
        <Car className="h-4 w-4" />
        New Car OS
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="left-0 top-0 h-full max-h-none w-[min(100vw,300px)] translate-x-0 translate-y-0 rounded-none border-r p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <DialogTitle>New Car Dealer OS</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="border-b border-border px-3 py-2">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary"
            >
              <Car className="h-4 w-4" />
              Marketplace home
            </Link>
          </div>
          <nav className="max-h-[calc(100vh-4rem)] overflow-y-auto p-3">
            {NEW_CAR_DEALER_NAV.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm", isActive && "bg-primary/10 text-primary")
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
