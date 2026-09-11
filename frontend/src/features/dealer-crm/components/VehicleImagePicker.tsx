import { useRef, useState } from "react";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadMultiple } from "@/services/storage.service";
import toast from "react-hot-toast";

type VehicleImagePickerProps = {
  imageUrls: string[];
  uploadPrefix: string;
  onChange: (urls: string[]) => void;
};

export function VehicleImagePicker({ imageUrls, uploadPrefix, onChange }: VehicleImagePickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const urls = imageUrls.length ? imageUrls : [""];
  const filled = urls.map((u) => u.trim()).filter(Boolean);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    // Preserve OS selection order (first clicked / first in multi-select = main)
    const ordered = Array.from(files);
    setUploading(true);
    try {
      const uploaded = await uploadMultiple("vehicle-images", ordered, uploadPrefix);
      const newUrls = uploaded.map((u) => u.publicUrl).filter(Boolean);
      // First selected file becomes listing hero (index 0); older photos follow
      const next = [...newUrls, ...filled];
      onChange(next.length ? next : [""]);
      toast.success(
        newUrls.length === 1
          ? "Main photo set (1st selected)"
          : `${newUrls.length} photos uploaded — 1st selected is the main image`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const setAsMain = (index: number) => {
    if (index <= 0 || index >= filled.length) return;
    const next = [...filled];
    const [picked] = next.splice(index, 1);
    if (!picked) return;
    next.unshift(picked);
    onChange(next);
    toast.success("Main photo updated");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Photos</Label>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            // Intentionally no accept= — Windows hides extensionless images (named 1, 2, 3) under Custom Files
            multiple
            className="sr-only"
            onChange={(e) => {
              void onFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Upload files
          </Button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        First photo you select = main image on Buy page. Same order as colours = colour gallery. JPG/PNG/WebP/AVIF/GIF/BMP · HD.
      </p>

      {filled.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {filled.map((url, i) => (
            <div key={`${url}-${i}`} className="relative h-16 w-24 overflow-hidden rounded-lg border bg-muted">
              <img src={url} alt="" className="h-full w-full object-cover" />
              {i === 0 ? (
                <span className="absolute left-0.5 top-0.5 rounded bg-primary px-1 py-0.5 text-[9px] font-bold text-primary-foreground">
                  Main
                </span>
              ) : (
                <button
                  type="button"
                  className="absolute left-0.5 top-0.5 rounded bg-background/90 p-0.5 shadow"
                  title="Set as main photo"
                  onClick={() => setAsMain(i)}
                  aria-label="Set as main photo"
                >
                  <Star className="h-3 w-3 text-amber-500" />
                </button>
              )}
              <button
                type="button"
                className="absolute right-0.5 top-0.5 rounded bg-background/90 p-0.5 shadow"
                onClick={() => {
                  const next = filled.filter((_, j) => j !== i);
                  onChange(next.length ? next : [""]);
                }}
                aria-label="Remove image"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {urls.map((url, i) => (
          <Input
            key={i}
            placeholder={i === 0 ? "Main image URL (1st = Buy page hero)" : `Image URL ${i + 1} (optional)`}
            value={url}
            onChange={(e) => {
              const next = [...urls];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange([...urls, ""])}>
          + Add URL field
        </Button>
      </div>
    </div>
  );
}
