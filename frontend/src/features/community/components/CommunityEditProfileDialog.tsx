import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SocialProfile } from "../types";
import { updateSocialProfile, suggestCommunityHandle } from "../services/community-profile.service";
import { uploadCommunityAvatar, uploadCommunityCover } from "../services/community-media.service";
import toast from "react-hot-toast";

type CommunityEditProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: SocialProfile;
  onSaved: (profile: SocialProfile) => void;
};

export function CommunityEditProfileDialog({
  open,
  onOpenChange,
  profile,
  onSaved,
}: CommunityEditProfileDialogProps) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [handle, setHandle] = useState(profile.handle ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName(profile.fullName);
      setHandle(profile.handle ?? suggestCommunityHandle(profile.fullName, profile.id));
      setBio(profile.bio ?? "");
      setHeadline(profile.headline ?? "");
      setCity(profile.city ?? "");
    }
  }, [open, profile]);

  const save = async () => {
    setBusy(true);
    try {
      const updated = await updateSocialProfile(profile.id, {
        fullName: fullName.trim(),
        handle: handle.trim().replace(/^@/, "") || null,
        bio: bio.trim() || null,
        headline: headline.trim() || null,
        city: city.trim() || null,
      });
      if (updated) {
        onSaved(updated);
        toast.success("Profile updated");
        onOpenChange(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setBusy(false);
    }
  };

  const onAvatarFile = async (file: File) => {
    setBusy(true);
    try {
      const url = await uploadCommunityAvatar(profile.id, file);
      const updated = await updateSocialProfile(profile.id, { avatarUrl: url });
      if (updated) {
        onSaved(updated);
        toast.success("Photo updated");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const onCoverFile = async (file: File) => {
    setBusy(true);
    try {
      const url = await uploadCommunityCover(profile.id, file);
      const updated = await updateSocialProfile(profile.id, { coverUrl: url });
      if (updated) {
        onSaved(updated);
        toast.success("Cover updated");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit social profile</DialogTitle>
          <DialogDescription>How you appear on Motorcart Community — like Instagram bio.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Label className="w-full text-xs">Profile photo</Label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="text-xs"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onAvatarFile(f);
              }}
            />
            <Label className="w-full text-xs">Cover photo</Label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="text-xs"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onCoverFile(f);
              }}
            />
          </div>
          <div>
            <Label htmlFor="cp-name">Display name</Label>
            <Input id="cp-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="cp-handle">Username</Label>
            <Input
              id="cp-handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/\s/g, "_"))}
              placeholder="rajesh_auto"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cp-headline">Headline</Label>
            <Input
              id="cp-headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Sales consultant · New cars"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cp-city">City</Label>
            <Input id="cp-city" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="cp-bio">Bio</Label>
            <Textarea
              id="cp-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-1 min-h-[80px]"
              placeholder="Dealer · Mumbai · Pre-owned cars…"
            />
          </div>
          <Button className="w-full rounded-xl" disabled={busy} onClick={() => void save()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
