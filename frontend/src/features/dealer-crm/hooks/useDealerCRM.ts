import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDealer } from "./useDealer";
import { fetchDealerLeads, fetchDealerVehiclesByDealerId, fetchLeadsForDealerOwner } from "../services/dealer.service";
import { buildListingPerformance } from "../lib/dealer-analytics";
import { fetchLeadCalls, subscribeDealerLeads } from "../services/crm.service";
import type { CRMStats, LeadWithMeta } from "../types";
import type { DbLead } from "@/types/database";

function leadType(lead: DbLead): LeadWithMeta["type"] {
  const meta = lead.metadata as { type?: string };
  if (lead.source === "test_drive" || meta?.type === "test_drive") return "test_drive";
  if (meta?.type === "enquiry" || lead.source === "website") return "enquiry";
  return "lead";
}

export function useDealerCRM() {
  const { dealer, user, loading: dealerLoading } = useDealer();
  const [leads, setLeads] = useState<DbLead[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; title: string; status: string; price: number; is_featured?: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<{ id: string; leadName: string; phone: string; outcome: string; duration: number; createdAt: string }[]>([]);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    if (!dealer) {
      setLoading(false);
      return;
    }

    const seq = ++loadSeq.current;
    setLoading(true);

    try {
      const [leadRows, vehicleRows, callRows] = await Promise.all([
        user?.id ? fetchLeadsForDealerOwner(user.id) : fetchDealerLeads(dealer.id),
        fetchDealerVehiclesByDealerId(dealer.id),
        fetchLeadCalls(dealer.id),
      ]);

      if (seq !== loadSeq.current) return;

      setLeads(leadRows as DbLead[]);
      if (callRows.length) {
        const leadMap = new Map((leadRows as DbLead[]).map((l) => [l.id, l]));
        setCalls(
          callRows.map((c) => {
            const lead = leadMap.get(c.lead_id);
            return {
              id: c.id,
              leadName: lead?.name ?? "Lead",
              phone: lead?.phone ?? "",
              outcome: String(c.outcome ?? "CONNECTED"),
              duration: c.duration_seconds ?? 0,
              createdAt: c.created_at,
            };
          })
        );
      } else {
        setCalls([]);
      }
      setVehicles(
        vehicleRows.map((v) => ({
          id: v.id,
          title: v.title,
          status: v.status,
          price: Number(v.price),
          is_featured: v.is_featured,
        }))
      );
    } catch (e) {
      console.warn("[useDealerCRM] load failed", e);
    } finally {
      if (seq === loadSeq.current) {
        setLoading(false);
      }
    }
  }, [dealer, user?.id]);

  useEffect(() => {
    void load();
    if (!dealer?.id) return;

    const unsub = subscribeDealerLeads(dealer.id, () => {
      void load();
    });
    return () => {
      unsub();
    };
  }, [load, dealer?.id]);

  const leadsWithMeta: LeadWithMeta[] = useMemo(
    () =>
      leads.map((l) => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        email: l.email,
        source: l.source,
        status: l.status,
        aiScore: l.ai_score,
        vehicleInterest:
          l.vehicle_interest ??
          (l.metadata as { vehicle_title?: string })?.vehicle_title ??
          undefined,
        notes: l.notes,
        createdAt: l.created_at,
        type: leadType(l),
      })),
    [leads]
  );

  const stats: CRMStats = useMemo(() => {
    const active = vehicles.filter((v) => v.status === "available").length;
    const sold = vehicles.filter((v) => v.status === "sold").length;
    const featured = vehicles.filter((v) => v.is_featured).length;
    const newLeads = leads.filter((l) => l.status === "new").length;
    const followUpLeads = leads.filter((l) => l.status === "contacted" || l.status === "qualified").length;
    const lostLeads = leads.filter((l) => l.status === "lost").length;
    const converted = leads.filter((l) => l.status === "converted").length;
    const testDrives = leadsWithMeta.filter((l) => l.type === "test_drive").length;
    const enquiries = leadsWithMeta.filter((l) => l.type === "enquiry").length;
    const revenueMtd = vehicles.filter((v) => v.status === "sold").reduce((s, v) => s + v.price, 0);

    return {
      totalListings: vehicles.length,
      activeListings: active,
      soldListings: sold,
      featuredListings: featured,
      totalLeads: leads.length,
      newLeads,
      convertedLeads: converted,
      testDriveRequests: testDrives,
      enquiries,
      revenueMtd,
      conversionRate: leads.length ? Math.round((converted / leads.length) * 100) : 0,
      followUpLeads,
      lostLeads,
      whatsappChats: 0,
      callsTracked: calls.length,
      avgListingViews: 0,
      activeAuctions: 0,
    };
  }, [vehicles, leads, leadsWithMeta, calls.length]);

  const listingPerformance = useMemo(
    () => buildListingPerformance(vehicles, leadsWithMeta),
    [vehicles, leadsWithMeta]
  );

  const statsWithMetrics = useMemo(() => {
    const perf = listingPerformance;
    const wa = perf.reduce((s, p) => s + p.whatsappClicks, 0);
    const avgViews = perf.length
      ? Math.round(perf.reduce((s, p) => s + p.views, 0) / perf.length)
      : 0;
    return {
      ...stats,
      whatsappChats: wa,
      avgListingViews: avgViews,
    };
  }, [stats, listingPerformance]);

  return {
    dealer,
    dealerLoading,
    loading: dealerLoading || loading,
    stats: statsWithMetrics,
    leads: leadsWithMeta,
    vehicles,
    listingPerformance,
    calls,
    refetch: load,
  };
}
