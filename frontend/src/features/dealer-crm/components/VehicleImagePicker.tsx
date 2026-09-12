import { useRef, useState } from "react";
import { GripVertical, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { uploadMultiple } from "@/services/storage.service";
import toast from "react-hot-toast";

type VehicleImagePickerProps = {
  imageUrls: string[];
  uploadPrefix: string;
  onChange: (urls: string[]) => void;
};

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [picked] = next.splice(from, 1);
  if (picked === undefined) return list;
  next.splice(to, 0, picked);
  return next;
}

export function VehicleImagePicker({ imageUrls, uploadPrefix, onChange }: VehicleImagePickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [showUrls, setShowUrls] = useState(false);

  const urls = imageUrls.length ? imageUrls : [""];
  const filled = urls.map((u) => u.trim()).filter(Boolean);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const ordered = Array.from(files);
    setUploading(true);
    try {
      const uploaded = await uploadMultiple("vehicle-images", ordered, uploadPrefix);
      const newUrls = uploaded.map((u) => u.publicUrl).filter(Boolean);
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
    onChange(moveItem(filled, index, 0));
    toast.success("Main photo updated");
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    onChange(moveItem(filled, from, to));
    if (to === 0 || from === 0) toast.success("Photo order updated — 1st is Main");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Photos</Label>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
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
        Drag left/right to reorder. First photo = Buy page hero.
      </p>

      {filled.length > 0 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {filled.map((url, i) => (
            <div
              key={`${url}-${i}`}
              draggable
              onDragStart={(e) => {
                setDragIndex(i);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(i));
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (overIndex !== i) setOverIndex(i);
              }}
              onDragLeave={() => {
                if (overIndex === i) setOverIndex(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = dragIndex ?? Number(e.dataTransfer.getData("text/plain"));
                setDragIndex(null);
                setOverIndex(null);
                if (Number.isFinite(from)) reorder(from, i);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={cn(
                "w-[7.5rem] shrink-0 cursor-grab overflow-hidden rounded-xl border bg-card shadow-sm active:cursor-grabbing",
                dragIndex === i && "opacity-60",
                overIndex === i && dragIndex !== i && "ring-2 ring-primary",
              )}
              title="Drag to reorder"
            >
              <div className="relative h-20 w-full bg-muted">
                <img src={url} alt="" className="pointer-events-none h-full w-full object-cover" draggable={false} />
                <span className="absolute bottom-0.5 left-0.5 rounded bg-black/55 p-0.5 text-white">
                  <GripVertical className="h-3 w-3" />
                </span>
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
            </div>
          ))}
        </div>
      )}

      <div className="mt-2">
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setShowUrls((v) => !v)}>
          {showUrls ? "Hide URL fields" : "Paste image URLs"}
        </Button>
        {showUrls ? (
          <div className="mt-2 space-y-2">
            {urls.map((url, i) => (
              <Input
                key={i}
                placeholder={i === 0 ? "Main image URL" : `Image URL ${i + 1}`}
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
        ) : null}
      </div>
    </div>
  );
}
