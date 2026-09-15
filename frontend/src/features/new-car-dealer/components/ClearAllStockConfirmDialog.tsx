import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Must type this exactly (case-insensitive) — GitHub-style safety. */
export const CLEAR_ALL_STOCK_PHRASE = "DELETE ALL";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockCount?: number | string;
  showroomName?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ClearAllStockConfirmDialog({
  open,
  onOpenChange,
  stockCount,
  showroomName,
  loading,
  onConfirm,
}: Props) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const matches = typed.trim().toUpperCase() === CLEAR_ALL_STOCK_PHRASE;
  const countLabel =
    stockCount != null && Number(stockCount) > 0 ? String(stockCount) : "all";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-destructive/30 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Clear all showroom stock?
          </DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed text-muted-foreground">
            This permanently removes stock from your showroom and public Buy listings. You can
            re-upload Excel after. This cannot be undone from here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-semibold text-foreground">What will be deleted</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">{countLabel}</span> inventory row
              {countLabel === "1" ? "" : "s"}
              {showroomName ? (
                <>
                  {" "}
                  for <span className="font-medium text-foreground">{showroomName}</span>
                </>
              ) : null}
            </li>
            <li>Photos & prices on those stock rows</li>
            <li>Public Buy pages for this showroom stock</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Not deleted: your account, leads, bookings, or other dealers&apos; stock.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clear-all-confirm" className="text-sm font-medium">
            Type <span className="font-mono font-bold text-destructive">{CLEAR_ALL_STOCK_PHRASE}</span>{" "}
            to confirm
          </Label>
          <Input
            id="clear-all-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={CLEAR_ALL_STOCK_PHRASE}
            autoComplete="off"
            autoFocus
            className="rounded-xl font-mono"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches && !loading) void onConfirm();
            }}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-xl"
            disabled={!matches || loading}
            onClick={() => void onConfirm()}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            I understand, delete all stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
