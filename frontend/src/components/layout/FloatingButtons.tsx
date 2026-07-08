import { useState } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { SupportChatWidget } from "@/ai/components/SupportChatWidget";
import { SITE_NAME } from "@/lib/constants";

const WHATSAPP_PHONE = import.meta.env.VITE_WHATSAPP_PHONE ?? "919876543210";

function whatsAppSupportUrl() {
  const text = encodeURIComponent(`Hi ${SITE_NAME}, I need help with vehicles / services on the website.`);
  return `https://wa.me/${WHATSAPP_PHONE.replace(/\D/g, "")}?text=${text}`;
}

export function FloatingButtons() {
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <>
      <a
        href={whatsAppSupportUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="wa-fab group"
        aria-label="Chat on WhatsApp"
      >
        <span className="wa-fab__pulse" aria-hidden />
        <span className="wa-fab__btn">
          <WhatsAppIcon className="h-7 w-7 text-white" />
        </span>
        <span className="wa-fab__label">WhatsApp</span>
      </a>
      <Button
        size="icon"
        variant="default"
        className="ai-fab fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-50 h-14 w-14 rounded-full bg-primary shadow-lg hover:bg-primary/90 md:bottom-8"
        onClick={() => setAiOpen(!aiOpen)}
        aria-label="AI Assistant"
      >
        <Bot className="h-5 w-5" />
      </Button>
      <SupportChatWidget open={aiOpen} onOpenChange={setAiOpen} />
    </>
  );
}
