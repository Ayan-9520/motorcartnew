import { forwardRef, useState } from "react";
import { Copy, Download, FileDown, FolderPlus, Loader2, Send, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { cn } from "@/lib/utils";
import { POSTER_SIZES, TEMPLATE_META, type PosterSize } from "../types";
import type { RecentPoster } from "../services/brochure.service";

export type PreviewAction = "png" | "jpg" | "pdf" | "whatsapp" | "social" | "send" | "lead" | "copy";

type Props = {
  size: PosterSize;
  onSize: (s: PosterSize) => void;
  busy: PreviewAction | "";
  loadingAssets: boolean;
  disabled: boolean;
  onAction: (a: PreviewAction) => void;
  socialLinks: { facebook: string; x: string; linkedin: string } | null;
  recent: RecentPoster[];
  leadName?: string;
};

export const PreviewPanel = forwardRef<HTMLCanvasElement, Props>(function PreviewPanel(
  { size, onSize, busy, loadingAssets, disabled, onAction, socialLinks, recent, leadName },
  ref
) {
  const [socialOpen, setSocialOpen] = useState(false);
  const spin = (a: PreviewAction) => (busy === a ? <Loader2 className="h-4 w-4 animate-spin" /> : null);
  const ar = POSTER_SIZES[size];

  return (
    <section className="rounded-2xl border bg-card p-4 lg:sticky lg:top-20">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-normal">Preview</h2>
        {loadingAssets ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading photos…
          </span>
        ) : null}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg border p-1">
        {(Object.keys(POSTER_SIZES) as PosterSize[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSize(s)}
            title={POSTER_SIZES[s].hint}
            className={cn("rounded-md py-1 text-xs font-medium", size === s ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            {POSTER_SIZES[s].label}
          </button>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {ar.width}×{ar.height}px · {ar.hint}
      </p>
      <div className="mx-auto mt-3 overflow-hidden rounded-xl border bg-muted shadow-inner" style={{ maxWidth: size === "story" ? 300 : 420 }}>
        <canvas ref={ref} className="block h-auto w-full" style={{ aspectRatio: `${ar.width} / ${ar.height}` }} aria-label="Poster preview" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button className="gap-1.5" disabled={disabled || Boolean(busy)} onClick={() => onAction("png")}>
          {spin("png") ?? <Download className="h-4 w-4" />} Download image
        </Button>
        <Button variant="destructive" className="gap-1.5" disabled={disabled || Boolean(busy)} onClick={() => onAction("pdf")}>
          {spin("pdf") ?? <FileDown className="h-4 w-4" />} Download PDF
        </Button>
        <Button
          className="gap-1.5 bg-[#25D366] text-white hover:bg-[#1eb957]"
          disabled={disabled || Boolean(busy)}
          onClick={() => onAction("whatsapp")}
        >
          {spin("whatsapp") ?? <WhatsAppIcon className="h-4 w-4" />} Share on WhatsApp
        </Button>
        <div className="relative">
          <Button
            variant="outline"
            className="w-full gap-1.5"
            disabled={disabled || Boolean(busy)}
            onClick={() => {
              setSocialOpen((v) => !v);
              onAction("social");
            }}
          >
            {spin("social") ?? <Share2 className="h-4 w-4" />} Social media
          </Button>
          {socialOpen && socialLinks ? (
            <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border bg-card p-1 shadow-lg">
              {(
                [
                  ["Facebook", socialLinks.facebook],
                  ["X (Twitter)", socialLinks.x],
                  ["LinkedIn", socialLinks.linkedin],
                ] as const
              ).map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => setSocialOpen(false)}
                >
                  Post on {label}
                </a>
              ))}
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setSocialOpen(false);
                  onAction("jpg");
                }}
              >
                Download for Instagram
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setSocialOpen(false);
                  onAction("copy");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copy poster link
              </button>
            </div>
          ) : null}
        </div>
        <Button variant="outline" className="gap-1.5" disabled={disabled || Boolean(busy)} onClick={() => onAction("send")}>
          {spin("send") ?? <Send className="h-4 w-4" />} {leadName ? `Send to ${leadName.split(" ")[0]}` : "Send to customer"}
        </Button>
        <Button variant="outline" className="gap-1.5" disabled={disabled || Boolean(busy)} onClick={() => onAction("lead")}>
          {spin("lead") ?? <FolderPlus className="h-4 w-4" />} Add to lead folder
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        The QR code opens this car's live MotorCart listing — enquiries from it land in your Lead CRM.
      </p>

      {recent.length ? (
        <div className="mt-4 border-t pt-3">
          <p className="text-xs font-semibold">Recently shared posters</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {recent.map((r) => (
              <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="w-20 shrink-0" title={`${r.title} · ${TEMPLATE_META[r.template]?.name ?? ""}`}>
                <img src={r.url} alt="" className="h-24 w-20 rounded-lg border object-cover" loading="lazy" />
                <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{new Date(r.at).toLocaleDateString("en-IN")}</span>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
});
