import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import * as Linking from "expo-linking";
import { WEB_SITE_URL } from "../config";
import type { ThemeColors } from "../theme";
import { useCRM } from "../ThemeContext";
import { useAuth } from "../auth/AuthContext";
import { getRoleFamily, getRoleWorkspace, type RoleFamily } from "../roles";
import {
  fetchAdminOverview,
  fetchFinanceApplications,
  fetchLeads,
  fetchNotifications,
  fetchPendingBusiness,
  fetchPendingDealers,
  fetchWishlist,
} from "../api/crm";
import { fetchVehicles } from "../api/vehicles";
import { fetchNewCarInventorySafe } from "../api/inventory";
import {
  McAvatar,
  McButton,
  McCard,
  McContent,
  McHero,
  McMuted,
  McScreen,
  McSectionLabel,
  McStat,
  McTitle,
  mcListStyle,
  useThemedStyles,
} from "../ui/crm";
import type { MainTabParamList } from "../navigation/types";

function familyModules(family: RoleFamily): { title: string; body: string }[] {
  switch (family) {
    case "customer":
      return [
        { title: "Browse & enquire", body: "Open listings, view detail, send a CRM lead in under a minute." },
        { title: "Track enquiries", body: "See status of leads you raised with dealers." },
        { title: "Wishlist pulse", body: "Saved vehicles sync from the website Ownership OS." },
      ];
    case "dealer":
      return [
        { title: "Lead pipeline", body: "New → contacted → qualified → won/lost from your phone." },
        { title: "Call / WhatsApp", body: "One-tap triage on every enquiry row." },
        { title: "Live showroom stock", body: "Same /api/new-car/inventory KPIs as website New Car OS." },
      ];
    case "finance":
      return [
        { title: "Application queue", body: "Approve, reject, or mark processing live." },
        { title: "Finance leads", body: "DSA / lender inbound enquiries." },
        { title: "Deep underwriting", body: "Docs & bank tools open on web Finance OS." },
      ];
    case "admin":
      return [
        { title: "Approvals", body: "Approve / reject dealers and business accounts in-app." },
        { title: "Command KPIs", body: "Users, listings, KYC, finance pending." },
        { title: "Ops desk", body: "Fraud, CMS, revenue — use full web Super Admin ERP." },
      ];
    case "service":
      return [
        { title: "Job alerts", body: "Notification desk for workshop / technician." },
        { title: "Market context", body: "Browse related vehicles when quoting jobs." },
      ];
    case "broker":
      return [
        { title: "Bridge leads", body: "Pipeline triage with Call / WhatsApp." },
        { title: "Buyer network", body: "Deep tools on web Broker desk." },
      ];
    default:
      return [
        { title: "Live desk", body: "Alerts and marketplace glance from the Motorcart API." },
        { title: "Web ERP", body: "Heavy modules stay on the website for your role." },
      ];
  }
}

export function HomeScreen() {
  const { user } = useAuth();
  const c = useCRM();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const ws = useMemo(() => getRoleWorkspace(user?.role), [user?.role]);
  const family = getRoleFamily(user?.role);
  const name = user?.fullName?.split(" ")[0] || "there";
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const statCols = width >= 640 ? (desktop ? 4 : 2) : 2;
  const statBasis = `${Math.floor(100 / statCols) - 2}%` as `${number}%`;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ label: string; value: string | number; accent?: boolean }[]>([]);
  const modules = useMemo(() => familyModules(family), [family]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (family === "admin") {
        const [ov, leads, dealers, biz] = await Promise.all([
          fetchAdminOverview().catch(() => ({} as Record<string, unknown>)),
          fetchLeads().catch(() => []),
          fetchPendingDealers().catch(() => []),
          fetchPendingBusiness().catch(() => []),
        ]);
        const o = ov as Record<string, unknown>;
        setStats([
          { label: "Users", value: Number(o.totalUsers ?? 0), accent: true },
          { label: "Active", value: Number(o.activeUsers ?? 0) },
          { label: "Live listings", value: Number(o.listingsLive ?? 0) },
          { label: "Leads", value: leads.length, accent: true },
          { label: "Dealer approvals", value: dealers.length || Number(o.pendingDealers ?? 0) },
          { label: "Biz approvals", value: biz.length || Number(o.pendingBusiness ?? 0) },
          { label: "Finance pending", value: Number(o.pendingFinance ?? 0) },
          { label: "KYC pending", value: Number(o.pendingKyc ?? 0) },
        ]);
      } else if (family === "dealer") {
        const [leads, inventory, vehicles] = await Promise.all([
          fetchLeads().catch(() => []),
          fetchNewCarInventorySafe({ pageSize: 1 }),
          fetchVehicles(50).catch(() => []),
        ]);
        const open = leads.filter((l) => !["converted", "lost"].includes(String(l.status ?? "new")));
        if (inventory) {
          setStats([
            { label: "Showroom stock", value: inventory.kpis.totalRows, accent: true },
            { label: "Available", value: inventory.kpis.available },
            { label: "Low stock", value: inventory.kpis.lowStock, accent: true },
            { label: "Open leads", value: open.length },
            { label: "New leads", value: leads.filter((l) => String(l.status ?? "new") === "new").length, accent: true },
            { label: "Out of stock", value: inventory.kpis.outOfStock },
          ]);
        } else {
          setStats([
            { label: "Total leads", value: leads.length, accent: true },
            { label: "Open pipeline", value: open.length },
            { label: "New", value: leads.filter((l) => String(l.status ?? "new") === "new").length, accent: true },
            { label: "Market listings", value: vehicles.length },
          ]);
        }
      } else if (family === "finance") {
        const [apps, leads] = await Promise.all([
          fetchFinanceApplications().catch(() => []),
          fetchLeads().catch(() => []),
        ]);
        setStats([
          { label: "Applications", value: apps.length, accent: true },
          { label: "Finance leads", value: leads.length },
          {
            label: "In review",
            value: apps.filter((a) => {
              const s = String((a as { status?: string }).status ?? "").toLowerCase();
              return s.includes("pending") || s.includes("review") || s.includes("processing") || !s;
            }).length,
          },
        ]);
      } else if (family === "broker") {
        const leads = await fetchLeads().catch(() => []);
        setStats([
          { label: "Bridged leads", value: leads.length, accent: true },
          { label: "Open", value: leads.filter((l) => String(l.status) !== "converted").length },
        ]);
      } else if (family === "customer") {
        const [vehicles, notifs, wish] = await Promise.all([
          fetchVehicles(24).catch(() => []),
          fetchNotifications().catch(() => []),
          fetchWishlist().catch(() => []),
        ]);
        // GET /api/leads is dealer/admin only — avoid 403 for customers
        setStats([
          { label: "Vehicles live", value: vehicles.length, accent: true },
          { label: "Wishlist", value: wish.length },
          { label: "Alerts", value: notifs.length },
        ]);
      } else {
        const [vehicles, notifs] = await Promise.all([
          fetchVehicles(24).catch(() => []),
          fetchNotifications().catch(() => []),
        ]);
        setStats([
          { label: "Market units", value: vehicles.length },
          { label: "Desk alerts", value: notifs.length, accent: true },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [family]);

  useEffect(() => {
    void load();
  }, [load]);

  const primaryCta =
    family === "customer"
      ? { label: "Browse vehicles", go: "Browse" as const }
      : family === "admin"
        ? { label: "Open approvals", go: "Workspace" as const }
        : family === "finance"
          ? { label: "Open application queue", go: "Workspace" as const }
          : { label: "Open leads desk", go: "Workspace" as const };

  const secondaryCta =
    family === "customer"
      ? { label: "Wishlist & alerts", go: "Workspace" as const }
      : { label: "Marketplace stock", go: "Browse" as const };

  return (
    <McScreen>
      <ScrollView
        style={mcListStyle()}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 108 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={c.primary} />}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        <McContent style={styles.content}>
          {desktop ? (
            <View style={[styles.webBanner, { backgroundColor: c.primarySoft, borderColor: c.primaryGlow }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.webBannerTitle, { color: c.text }]}>Desktop browser · Companion layout</Text>
                <Text style={[styles.webBannerBody, { color: c.muted }]}>
                  Full New Car OS (1031 stock, sidebar CRM) lives on motorcart.in. This app is for phone + quick leads.
                </Text>
              </View>
              <McButton
                label="Open web OS"
                variant="outline"
                onPress={() => void Linking.openURL(`${WEB_SITE_URL}${ws.webPath}`)}
              />
            </View>
          ) : null}

          <View style={[styles.topGrid, desktop && styles.topGridDesktop]}>
            <View style={[styles.greetRow, desktop && styles.greetRowDesktop, desktop && styles.topMain]}>
              <McAvatar name={user?.fullName ?? "User"} size={desktop ? 52 : 46} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <McSectionLabel>
                  {ws.label} · {family} desk
                </McSectionLabel>
                <McTitle>Hi, {name}</McTitle>
                <McMuted>{ws.subtitle}</McMuted>
              </View>
            </View>

            <View style={desktop ? styles.topSide : undefined}>
              <McHero
                eyebrow={`${family.toUpperCase()} DESK`}
                title={ws.headline}
                body={user?.email ?? undefined}
                right={desktop ? undefined : <McAvatar name={user?.fullName ?? "U"} size={40} />}
              />
              {desktop ? (
                <McCard style={styles.sideCard}>
                  <Text style={styles.sideTitle}>Connected account</Text>
                  <Text style={styles.sideBody}>{user?.email}</Text>
                  <Text style={styles.sideMeta}>JWT + refresh · pull to refresh · live /api</Text>
                </McCard>
              ) : null}
            </View>
          </View>

          <McSectionLabel>Live KPIs</McSectionLabel>
          <View style={styles.stats}>
            {stats.map((s) => (
              <View key={s.label} style={[styles.statCell, { flexBasis: statBasis, maxWidth: statBasis }]}>
                <McStat label={s.label} value={s.value} accent={s.accent} />
              </View>
            ))}
          </View>

          <McSectionLabel>This desk</McSectionLabel>
          <View style={[styles.modules, desktop && styles.modulesDesktop]}>
            {modules.map((m) => (
              <McCard key={m.title} style={desktop ? styles.moduleCard : styles.moduleCardPhone}>
                <Text style={styles.moduleTitle}>{m.title}</Text>
                <Text style={styles.moduleBody}>{m.body}</Text>
              </McCard>
            ))}
          </View>

          <McSectionLabel>Actions</McSectionLabel>
          <View style={[styles.actions, desktop && styles.actionsDesktop]}>
            <View style={desktop ? styles.actionCol : styles.actionPhone}>
              <McButton label={primaryCta.label} onPress={() => nav.navigate(primaryCta.go)} />
            </View>
            {!desktop ? <View style={{ height: 10 }} /> : null}
            <View style={desktop ? styles.actionCol : styles.actionPhone}>
              <McButton label={secondaryCta.label} variant="outline" onPress={() => nav.navigate(secondaryCta.go)} />
            </View>
            {!desktop ? <View style={{ height: 10 }} /> : null}
            <View style={desktop ? styles.actionCol : styles.actionPhone}>
              <McButton
                label="Full web CRM"
                variant="ghost"
                onPress={() => void Linking.openURL(`${WEB_SITE_URL}${ws.webPath}`)}
              />
            </View>
          </View>
        </McContent>
      </ScrollView>
    </McScreen>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48 },
    webBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      marginBottom: 16,
    },
    webBannerTitle: { fontSize: 14, fontWeight: "800" },
    webBannerBody: { marginTop: 4, fontSize: 12, lineHeight: 17 },
    topGrid: { marginBottom: 8 },
    topGridDesktop: { flexDirection: "row", alignItems: "stretch", gap: 16, marginBottom: 16 },
    topMain: { flex: 1.1, minWidth: 0, marginBottom: 0 },
    topSide: { flex: 1, minWidth: 280, gap: 12 },
    greetRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 16,
    },
    greetRowDesktop: { marginBottom: 0, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.card },
    sideCard: { marginBottom: 0, backgroundColor: c.panel, borderColor: c.borderStrong },
    sideTitle: { color: c.text, fontSize: 17, fontWeight: "800" },
    sideBody: { color: c.textSecondary, marginTop: 8, fontSize: 13 },
    sideMeta: { color: c.muted, marginTop: 10, fontSize: 11 },
    stats: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: 12,
      width: "100%",
      gap: 10,
    },
    statCell: { flexGrow: 1, flexShrink: 0, minWidth: 140 },
    modules: { gap: 10, marginBottom: 16 },
    modulesDesktop: { flexDirection: "row", flexWrap: "wrap" },
    moduleCard: { flexGrow: 1, flexBasis: 220, minWidth: 200 },
    moduleCardPhone: { backgroundColor: c.panel, borderColor: c.borderStrong },
    moduleTitle: { color: c.text, fontWeight: "800", fontSize: 15 },
    moduleBody: { color: c.muted, marginTop: 6, fontSize: 13, lineHeight: 18 },
    actions: { marginTop: 4, width: "100%" },
    actionsDesktop: { flexDirection: "row", alignItems: "stretch", gap: 12 },
    actionCol: { flex: 1, minWidth: 0 },
    actionPhone: { width: "100%" },
  });
}
