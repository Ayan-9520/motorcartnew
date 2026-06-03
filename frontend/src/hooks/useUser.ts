import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { fetchUserProfile, updateUserProfile, submitKyc } from "@/services/auth.service";
import { mapDbUserToAppUser } from "@/services/mapUser";
import toast from "react-hot-toast";

export function useUser() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const row = await fetchUserProfile(user.id);
    if (row) setUser(mapDbUserToAppUser(row));
    setLoading(false);
  }, [user?.id, setUser]);

  const updateProfile = useCallback(
    async (data: {
      full_name?: string;
      phone?: string;
      city?: string;
      state?: string;
      company_name?: string;
      avatar_url?: string;
    }) => {
      if (!user?.id) return;
      setLoading(true);
      const { data: updated, error } = await updateUserProfile(user.id, data);
      if (error) toast.error(error.message);
      else if (updated) {
        setUser(mapDbUserToAppUser(updated as never));
        toast.success("Profile updated");
      }
      setLoading(false);
      return { error };
    },
    [user?.id, setUser]
  );

  const submitKycVerification = useCallback(
    async (kycData: Record<string, unknown>) => {
      if (!user?.id) return;
      setLoading(true);
      const { data: updated, error } = await submitKyc(user.id, kycData);
      if (error) toast.error(error.message);
      else if (updated) {
        setUser(mapDbUserToAppUser(updated as never));
        toast.success("KYC submitted for review");
      }
      setLoading(false);
      return { error };
    },
    [user?.id, setUser]
  );

  return { user, loading, refresh, updateProfile, submitKycVerification };
}
