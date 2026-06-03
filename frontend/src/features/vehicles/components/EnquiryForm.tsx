import { useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { submitVehicleEnquiry } from "@/services/leads.service";
import type { VehicleListing } from "@/types/vehicle";
import toast from "react-hot-toast";

export function EnquiryForm({ vehicle }: { vehicle: VehicleListing }) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(`I'm interested in ${vehicle.title}`);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await submitVehicleEnquiry({
        vehicleId: vehicle.id,
        vehicleTitle: vehicle.title,
        vehicleSlug: vehicle.slug,
        dealerId: vehicle.dealerId,
        dealerSlug: vehicle.dealerSlug,
        name,
        phone,
        email: email || undefined,
        message,
      });
      if (error) {
        toast.error(error);
        return;
      }
      setSent(true);
      toast.success("Enquiry sent! The dealer will contact you shortly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
          Send Enquiry
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-foreground">
            Thanks, {name || "there"}! Your interest in <strong>{vehicle.title}</strong> was shared with{" "}
            {vehicle.dealerName ?? "the dealer"}. Expect a call on {phone}.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Message</Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <Button type="submit" variant="default" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Enquiry"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
