import { Sparkles } from "lucide-react";
import { AnimatedStat } from "./AnimatedStat";

type LedgerRow = {
  id?: string;
  entryType?: string;
  points?: number;
  reason?: string;
  createdAt?: string;
  expiresAt?: string | null;
};

type CustomerRewardsPanelProps = {
  balance: number;
  ledger?: LedgerRow[];
  statement?: Record<string, unknown>;
};

export function CustomerRewardsPanel({ balance, ledger = [], statement }: CustomerRewardsPanelProps) {
  const earned = ledger.filter((r) => r.entryType === "EARN");
  const redeemed = ledger.filter((r) => r.entryType === "REDEEM");
  const expiring = ledger.filter((r) => r.expiresAt);

  return (
    <div className="space-y-6">
      <div className="cos-rewards-hero">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Reward balance</p>
          <p className="mt-1 text-4xl font-bold text-white tabular-nums">
            <AnimatedStat value={balance} />
          </p>
          <p className="text-sm text-white/80">Ledger-backed points. MotorCart One card is not issued yet.</p>
        </div>
        <Sparkles className="h-12 w-12 text-white/30" />
      </div>

      {statement && (
        <div className="space-y-1 text-sm">
          <p>Opening {Number(statement.openingBalance ?? 0)}</p>
          <p>Earned {Number(statement.pointsEarned ?? 0)}</p>
          <p>Redeemed {Number(statement.pointsRedeemed ?? 0)}</p>
          <p>Expired {Number(statement.pointsExpired ?? 0)}</p>
          <p>Adjustments {Number(statement.adjustments ?? 0)}</p>
          <p>Closing {Number(statement.closingBalance ?? 0)}</p>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold">Earn history</h3>
        {earned.length === 0 && <p className="text-sm text-muted-foreground">No earn entries.</p>}
        {earned.map((r) => (
          <p key={String(r.id)} className="text-sm">
            {r.points} · {r.reason}
          </p>
        ))}
      </div>
      <div>
        <h3 className="text-sm font-semibold">Redeem history</h3>
        {redeemed.length === 0 && <p className="text-sm text-muted-foreground">No redemptions.</p>}
        {redeemed.map((r) => (
          <p key={String(r.id)} className="text-sm">
            {r.points} · {r.reason}
          </p>
        ))}
      </div>
      <div>
        <h3 className="text-sm font-semibold">Expiry</h3>
        {expiring.length === 0 && <p className="text-sm text-muted-foreground">No expiry dates on current rows.</p>}
        {expiring.map((r) => (
          <p key={String(r.id)} className="text-sm">
            {r.points} · {r.expiresAt}
          </p>
        ))}
      </div>
    </div>
  );
}
