import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
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

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded = await uploadMultiple("vehicle-images", Array.from(files), uploadPrefix);
      const next = [...urls.map((u) => u.trim()).filter(Boolean), ...uploaded.map((u) => u.publicUrl)];
      onChange(next.length ? next : [""]);
      toast.success(`${uploaded.length} image(s) uploaded`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Photos</Label>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
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
      <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG or WebP · max 10MB each · or paste image URLs below</p>

      {urls.some((u) => u.trim()) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {urls
            .map((u) => u.trim())
            .filter(Boolean)
            .map((url, i) => (
              <div key={`${url}-${i}`} className="relative h-16 w-24 overflow-hidden rounded-lg border bg-muted">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-0.5 top-0.5 rounded bg-background/90 p-0.5 shadow"
                  onClick={() => {
                    const trimmed = urls.map((x) => x.trim()).filter(Boolean);
                    trimmed.splice(i, 1);
                    onChange(trimmed.length ? trimmed : [""]);
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
            placeholder={`Image URL ${i + 1} (optional)`}
            value={url}
            onChange={(e) => {
              const next = [...urls];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([...urls, ""])}
        >
          + Add URL field
        </Button>
      </div>
    </div>
  );
}
