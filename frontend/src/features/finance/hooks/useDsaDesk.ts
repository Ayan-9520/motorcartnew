import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { DsaTeamMember } from "../data/dsa-desk-data";
import {
  fetchCommissions,
  fetchDsaAgentByUserId,
  fetchDsaApplications,
  fetchDsaDeskLeads,
  fetchDsaTeam,
  getFinanceAnalytics,
} from "../services/finance.service";
import { subscribeFinanceDesk, unsubscribeFinanceChannel } from "../lib/finance-realtime";
import type { FinanceCommission, FinanceLead, LoanApplication } from "../types";

export function useDsaDesk() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [leads, setLeads] = useState<FinanceLead[]>([]);
  const [commissions, setCommissions] = useState<FinanceCommission[]>([]);
  const [team, setTeam] = useState<DsaTeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const agent = await fetchDsaAgentByUserId(user.id);
    const agentId = agent?.id as string | undefined;
    const [apps, comms, leadRows, teamRows] = await Promise.all([
      agentId ? fetchDsaApplications(agentId) : Promise.resolve([] as LoanApplication[]),
      agentId ? fetchCommissions(agentId) : Promise.resolve([] as FinanceCommission[]),
      fetchDsaDeskLeads(agentId),
      fetchDsaTeam(),
    ]);
    setApplications(apps);
    setCommissions(comms);
    setLeads(leadRows);
    setTeam(teamRows);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = subscribeFinanceDesk(user.id, {
      onApplicationChange: () => void load(),
      onLeadChange: () => void load(),
      onCommissionChange: () => void load(),
    });
    return () => unsubscribeFinanceChannel(channel);
  }, [user?.id, load]);

  return {
    applications,
    leads,
    commissions,
    team,
    analytics: getFinanceAnalytics(applications),
    loading,
    refetch: load,
  };
}
