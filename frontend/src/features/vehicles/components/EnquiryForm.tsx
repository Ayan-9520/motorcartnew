import { useEffect, useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { submitVehicleEnquiry } from "@/services/leads.service";
import { useAuth } from "@/hooks/useAuth";
import type { VehicleListing } from "@/types/vehicle";
import toast from "react-hot-toast";

export function EnquiryForm({ vehicle }: { vehicle: VehicleListing }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState(`I'm interested in ${vehicle.title}`);
  const [consent, setConsent] = useState(false);
  const [preferredContact, setPreferredContact] = useState<"phone" | "email" | "whatsapp">("phone");
  const [sent, setSent] = useState(false);
  const [assignment, setAssignment] = useState<"assigned" | "unassigned" | undefined>();

  useEffect(() => {
    if (user?.fullName) setName((current) => current || user.fullName || "");
    if (user?.phone) setPhone((current) => current || user.phone || "");
    if (user?.email) setEmail((current) => current || user.email || "");
  }, [user?.id, user?.fullName, user?.phone, user?.email]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      toast.error("Please confirm we may contact you about this enquiry.");
      return;
    }
    setLoading(true);
    try {
      const result = await submitVehicleEnquiry({
        vehicleId: vehicle.id,
        vehicleTitle: vehicle.title,
        vehicleSlug: vehicle.slug,
        dealerId: vehicle.dealerId,
        dealerSlug: vehicle.dealerSlug,
        name,
        phone,
        email: email || undefined,
        message,
        location: vehicle.location || vehicle.city,
        category: vehicle.category,
        consent: true,
        preferredContact,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setAssignment(result.assignment);
      setSent(true);
      if (result.duplicate) {
        toast.success("We already have this enquiry. A partner will follow up.");
      } else if (result.assignment === "unassigned") {
        toast.success("Enquiry received. We'll assign a partner shortly.");
      } else {
        toast.success("Enquiry sent! The dealer will contact you shortly.");
      }
    } finally {
      setLoading(false);
    }
  };

  const successCopy =
    assignment === "unassigned" || !vehicle.dealerName
      ? `Thanks, ${name || "there"}! Your interest in ${vehicle.title} was recorded. A MotorCart partner will follow up on ${phone}.`
      : `Thanks, ${name || "there"}! Your interest in ${vehicle.title} was shared with ${vehicle.dealerName}. Expect a call on ${phone}.`;

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
            {successCopy}
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
              <Label>Preferred contact</Label>
              <select
                className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={preferredContact}
                onChange={(e) => setPreferredContact(e.target.value as "phone" | "email" | "whatsapp")}
              >
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
            <div>
              <Label>Message</Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="mt-1"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
              />
              I agree to be contacted about this vehicle enquiry.
            </label>
            <Button type="submit" variant="default" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Enquiry"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
