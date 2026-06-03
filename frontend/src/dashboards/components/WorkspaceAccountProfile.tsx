import { useEffect, useRef, useState } from "react";
import { Building2, Camera, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/hooks/useUser";
import { useAuthStore } from "@/store/authStore";
import { updateDealerProfile } from "@/features/dealer-crm/services/dealer-enterprise.service";
import { uploadFile } from "@/services/storage.service";
import type { DealerProfile } from "@/features/dealer-crm/types";
import toast from "react-hot-toast";

type WorkspaceAccountProfileProps = {
  dealer?: DealerProfile | null;
  onDealerSaved?: () => void;
};

export function WorkspaceAccountProfile({ dealer, onDealerSaved }: WorkspaceAccountProfileProps) {
  const { user } = useAuthStore();
  const { loading, updateProfile } = useUser();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [dealerName, setDealerName] = useState(dealer?.name ?? "");
  const [dealerPhone, setDealerPhone] = useState(dealer?.phone ?? "");
  const [dealerCity, setDealerCity] = useState(dealer?.city ?? "");
  const [dealerState, setDealerState] = useState(dealer?.state ?? "");
  const [savingDealer, setSavingDealer] = useState(false);

  useEffect(() => {
    if (!dealer) return;
    setDealerName(dealer.name);
    setDealerPhone(dealer.phone ?? "");
    setDealerCity(dealer.city);
    setDealerState(dealer.state);
  }, [dealer]);

  if (!user) return null;

  const onAvatarPick = async (file: File) => {
    if (!user.id) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const { publicUrl } = await uploadFile("profile-images", `${user.id}/avatar.${ext}`, file);
      await updateProfile({ avatar_url: publicUrl });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Avatar upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealer) return;
    setSavingDealer(true);
    const { error } = await updateDealerProfile(dealer.id, {
      name: dealerName.trim() || dealer.name,
      phone: dealerPhone.trim() || undefined,
      city: dealerCity.trim() || dealer.city,
      state: dealerState.trim() || dealer.state,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Dealership profile updated");
      onDealerSaved?.();
    }
    setSavingDealer(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="dealer-os-card lg:col-span-1 p-5">
        <div className="flex flex-col items-center text-center">
          <button
            type="button"
            className="relative mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 text-2xl font-bold text-primary ring-2 ring-primary/20"
            onClick={() => avatarInputRef.current?.click()}
            title="Change photo"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              (user.fullName?.charAt(0) ?? "U").toUpperCase()
            )}
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-background shadow ring-1 ring-border">
              <Camera className="h-3.5 w-3.5" />
            </span>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onAvatarPick(f);
              e.target.value = "";
            }}
          />
          <h2 className="text-lg font-bold">{user.fullName}</h2>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5" /> {user.email}
          </p>
          <Badge variant="outline" className="mt-2 capitalize">
            {user.role.replace(/_/g, " ")}
          </Badge>
          {dealer?.isVerified && (
            <Badge className="mt-2" variant="default">
              Verified dealer
            </Badge>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 rounded-xl"
            disabled={avatarUploading || loading}
            onClick={() => avatarInputRef.current?.click()}
          >
            {avatarUploading ? "Uploading…" : "Change photo"}
          </Button>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <section className="dealer-os-card p-5" id="personal">
          <h3 className="flex items-center gap-2 font-semibold">
            <User className="h-4 w-4 text-primary" /> Personal account
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">Name, phone and location on your Motorcart login.</p>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void updateProfile({
                full_name: fd.get("fullName") as string,
                phone: fd.get("phone") as string,
                city: fd.get("city") as string,
                state: fd.get("state") as string,
              });
            }}
          >
            <div>
              <Label htmlFor="wa-fullName">Full name</Label>
              <Input id="wa-fullName" name="fullName" defaultValue={user.fullName} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="wa-phone">Phone</Label>
              <Input id="wa-phone" name="phone" defaultValue={user.phone ?? ""} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="wa-city">City</Label>
              <Input id="wa-city" name="city" defaultValue={user.city ?? dealer?.city ?? ""} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="wa-state">State</Label>
              <Input id="wa-state" name="state" defaultValue={user.state ?? dealer?.state ?? ""} className="mt-1 rounded-xl" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading} className="rounded-xl">
                {loading ? "Saving…" : "Save personal details"}
              </Button>
            </div>
          </form>
        </section>

        {dealer && (
          <section className="dealer-os-card p-5" id="dealership">
            <h3 className="flex items-center gap-2 font-semibold">
              <Building2 className="h-4 w-4 text-primary" /> Dealership profile
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">Shown on storefront, leads and inventory defaults.</p>
            <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={saveDealer}>
              <div className="sm:col-span-2">
                <Label htmlFor="wa-dealerName">Showroom / business name</Label>
                <Input
                  id="wa-dealerName"
                  value={dealerName}
                  onChange={(e) => setDealerName(e.target.value)}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="wa-dealerPhone">Business phone</Label>
                <Input
                  id="wa-dealerPhone"
                  value={dealerPhone}
                  onChange={(e) => setDealerPhone(e.target.value)}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="wa-dealerCity">City</Label>
                <Input
                  id="wa-dealerCity"
                  value={dealerCity}
                  onChange={(e) => setDealerCity(e.target.value)}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="wa-dealerState">State</Label>
                <Input
                  id="wa-dealerState"
                  value={dealerState}
                  onChange={(e) => setDealerState(e.target.value)}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={savingDealer} className="rounded-xl">
                  {savingDealer ? "Saving…" : "Save dealership profile"}
                </Button>
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
