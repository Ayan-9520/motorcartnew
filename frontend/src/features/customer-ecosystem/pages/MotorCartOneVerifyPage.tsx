import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyMotorCartOne } from "@/features/customer-ecosystem/services/superapp.service";
import { setPageMeta } from "@/utils/seo";

export function MotorCartOneVerifyPage() {
  const { token: paramToken } = useParams<{ token: string }>();
  const [token, setToken] = useState(paramToken ?? "");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(value: string) {
    setError(null);
    try {
      setResult(await verifyMotorCartOne(value));
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Invalid token");
    }
  }

  useEffect(() => {
    setPageMeta({ title: "MotorCart One verification" });
    if (paramToken) void run(paramToken);
  }, [paramToken]);

  return (
    <div className="container max-w-lg py-12">
      <h1 className="text-2xl font-semibold">MotorCart One verification</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Read-only membership check. This is not a login, payment, or wallet scan.
      </p>
      <div className="mt-4 flex gap-2">
        <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste verification token" />
        <Button onClick={() => void run(token)}>Verify</Button>
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {result && (
        <div className="mt-6 rounded-xl border p-4">
          <p className="font-medium">{String(result.title ?? "")}</p>
          <p className="font-mono mt-1">{String(result.publicId ?? "")}</p>
          <p className="text-sm text-muted-foreground">Member since {String(result.memberSince ?? "")}</p>
          <p className="text-sm">Status {String(result.status ?? "")}</p>
        </div>
      )}
    </div>
  );
}
