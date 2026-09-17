import { MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { whatsAppVehicleUrl } from "@/lib/vehicle-utils";
import type { VehicleListing } from "@/types/vehicle";

export function WhatsAppCTA({ vehicle, className }: { vehicle: VehicleListing; className?: string }) {
  return (
    <Button
      type="button"
      variant="default"
      className={`w-full gap-2 bg-primary hover:bg-[#128C7E] text-white border-0 ${className ?? ""}`}
      onClick={() => {
        const url = whatsAppVehicleUrl(vehicle);
        if (!url) {
          toast.error("Dealer WhatsApp number is not set for this listing yet.");
          return;
        }
        window.open(url, "_blank");
      }}
    >
      <MessageCircle className="h-5 w-5" />
      Chat on WhatsApp
    </Button>
  );
}
