import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchMyClaimRequests,
  fetchMyMotorApplications,
  type InsuranceClaimRequestRow,
  type MotorInsuranceApplication,
} from "../services/insurance.service";

export function useInsuranceApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<MotorInsuranceApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setApplications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setApplications(await fetchMyMotorApplications());
      setError(null);
    } catch {
      setError("Could not load your insurance applications.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { applications, loading, error, refetch: load };
}

export function useMyClaimRequests() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<InsuranceClaimRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setClaims([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setClaims(await fetchMyClaimRequests());
    } catch {
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { claims, loading, refetch: load };
}
