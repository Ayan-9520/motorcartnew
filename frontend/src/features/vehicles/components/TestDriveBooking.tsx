import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createTestDrive } from "@/features/test-drives/services/test-drives.service";
import { apiErrorMessage } from "@/lib/api/axios";
import { useAuth } from "@/hooks/useAuth";
import type { VehicleListing } from "@/types/vehicle";
import toast from "react-hot-toast";

function toIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

export function TestDriveBooking({ vehicle }: { vehicle: VehicleListing }) {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      toast.error("Sign in to request a test drive.");
      return;
    }
    if (!vehicle.dealerId) {
      toast.error("This listing has no dealer for a test drive.");
      return;
    }
    setLoading(true);
    try {
      const meta = (vehicle.metadata ?? {}) as {
        ncdInventoryId?: string;
        vehicleId?: string;
        source?: string;
      };
      const isNewCarStock =
        meta.source === "new_car_inventory" ||
        Boolean(meta.ncdInventoryId) ||
        /^ncd-/i.test(vehicle.slug ?? "");
      const inventoryId = isNewCarStock
        ? meta.ncdInventoryId || vehicle.id.replace(/^ncd-/i, "")
        : undefined;
      // Marketplace Vehicle UUID when linked; never send inventory UUID as vehicleId
      const vehicleId = isNewCarStock
        ? meta.vehicleId || undefined
        : vehicle.id;

      if (!inventoryId && !vehicleId) {
        toast.error("This listing cannot accept a test-drive request yet.");
        return;
      }

      const row = await createTestDrive({
        vehicleId,
        inventoryId,
        requestedStartAt: toIso(date, time),
        customerNotes: notes || undefined,
      });
      setSubmittedId(row.id);
      toast.success("Test-drive request submitted.");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Request Test Drive
        </CardTitle>
      </CardHeader>
      <CardContent>
        {submittedId ? (
          <div className="space-y-3 text-sm">
            <p>Test-drive request submitted. The dealer will confirm a time — this is not a confirmed booking yet.</p>
            <Button variant="outline" className="w-full" asChild>
              <Link to={`/dashboard/customer/test-drives/${submittedId}`}>View my test drives</Link>
            </Button>
          </div>
        ) : !isAuthenticated ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">Sign in to submit a test-drive request to this dealer.</p>
            <Button variant="outline" className="w-full border-primary text-primary" asChild>
              <Link to="/login">Sign in to request</Link>
            </Button>
          </div>
        ) : !vehicle.dealerId ? (
          <p className="text-sm text-muted-foreground">Test drives can be requested on dealer listings only.</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-xs text-muted-foreground">
              You are requesting a slot. The dealer must confirm — times are not live availability.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Date</Label>
                <Input type="date" className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" className="mt-1" value={time} onChange={(e) => setTime(e.target.value)} required />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button type="submit" variant="outline" className="w-full border-primary text-primary" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request Test Drive"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
