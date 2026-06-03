import { useState } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
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
import { createDealerLead as createUsedCarLead } from "../services/crm.service";
import { createDealerLead as createNewCarLead } from "@/features/new-car-dealer/services/new-car-dealer.service";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealerId: string;
  onSaved: () => void;
  /** Used-car CRM uses `leads` table; new-car uses `dealer_leads`. */
  variant?: "used" | "new_car";
};

export function DealerAddLeadDialog({ open, onOpenChange, dealerId, onSaved, variant = "used" }: Props) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || phone.replace(/\D/g, "").length < 10) {
      toast.error("Name and valid 10-digit phone required");
      return;
    }
    setLoading(true);
    try {
      if (variant === "new_car") {
        const { error } = await createNewCarLead(dealerId, {
          customerName: name,
          phone,
          preferredModel: vehicle || undefined,
          source: "showroom",
        });
        if (error) throw error;
      } else {
        await createUsedCarLead({
          dealerId,
          customerName: name,
          phone,
          vehicleTitle: vehicle || undefined,
          source: "showroom",
        });
      }
      toast.success("Lead added");
      setName("");
      setPhone("");
      setVehicle("");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add lead</DialogTitle>
          <DialogDescription>Walk-in or phone enquiry — appears in your CRM pipeline.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3">
          <div>
            <Label htmlFor="lead-name">Customer name</Label>
            <Input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="lead-phone">Mobile</Label>
            <Input id="lead-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
          </div>
          <div>
            <Label htmlFor="lead-vehicle">Vehicle interest (optional)</Label>
            <Input id="lead-vehicle" value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="Swift VXI 2022" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
