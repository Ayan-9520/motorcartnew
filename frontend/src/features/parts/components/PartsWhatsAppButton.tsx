import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/constants";
import { normalizeWhatsAppDigits } from "@/lib/vehicle-utils";
import type { CartLine } from "../types";
import { unitPriceForQty } from "../lib/part-utils";

function buildWhatsAppMessage(lines: CartLine[], extra?: string) {
  const linesText = lines
    .map((l) => `${l.name} x${l.qty} @ ₹${unitPriceForQty(l, l.qty).toLocaleString("en-IN")}`)
    .join("\n");
  return encodeURIComponent(
    `Hi Motorcart,\nI want to order:\n${linesText}\n${extra ?? ""}\n\nSource: ${SITE_URL}/parts`
  );
}

function partsWhatsAppDigits(phone?: string): string {
  const digits = normalizeWhatsAppDigits(phone ?? (import.meta.env.VITE_WHATSAPP_PHONE as string | undefined));
  return digits.length >= 10 && digits !== "919876543210" ? digits : "";
}

interface PartsWhatsAppButtonProps {
  lines: CartLine[];
  label?: string;
  phone?: string;
}

export function PartsWhatsAppButton({ lines, label = "Order on WhatsApp", phone }: PartsWhatsAppButtonProps) {
  const digits = partsWhatsAppDigits(phone);
  if (!digits || lines.length === 0) return null;
  const href = `https://wa.me/${digits}?text=${buildWhatsAppMessage(lines)}`;
  return (
    <Button variant="outline" className="gap-2 border-primary text-[#128C7E] hover:bg-primary/10" asChild>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}
