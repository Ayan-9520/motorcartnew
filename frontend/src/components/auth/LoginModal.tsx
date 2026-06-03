import { useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Quick entry — full sign-in lives on /login (no duplicate form in modal). */
export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const goLogin = () => {
    onOpenChange(false);
    navigate("/login", { state: { from: location } });
  };

  const goSignup = () => {
    onOpenChange(false);
    navigate("/signup");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="auth-modal gap-0 overflow-hidden border-border/70 p-0 sm:max-w-[420px]">
        <DialogHeader className="space-y-2 border-b border-border/60 bg-muted/30 px-6 py-5 text-left">
          <DialogTitle className="text-xl font-bold tracking-tight">Sign in to Motorcart</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            For security and the best experience, continue on our dedicated sign-in page — OTP, Google,
            and password all in one place.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 px-6 py-5">
          <Button type="button" className="auth-cta h-11 w-full" onClick={goLogin}>
            <LogIn className="mr-2 h-4 w-4" />
            Continue to sign in
            <ArrowRight className="ml-auto h-4 w-4 opacity-80" />
          </Button>
          <Button type="button" variant="outline" className="h-11 w-full rounded-xl" onClick={goSignup}>
            <UserPlus className="mr-2 h-4 w-4" />
            Create account
          </Button>
        </div>
        <p className="border-t border-border/50 px-6 py-3 text-center text-[11px] text-muted-foreground">
          Business accounts require GST verification and admin approval.
        </p>
      </DialogContent>
    </Dialog>
  );
}
