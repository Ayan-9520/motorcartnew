import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import { WEB_SITE_URL } from "../config";
import type { ThemeColors } from "../theme";
import { useCRM } from "../ThemeContext";
import { useAuth } from "../auth/AuthContext";
import { getRoleFamily, getRoleWorkspace } from "../roles";
import {
  approveBusinessAccount,
  createLead,
  fetchAdminUsers,
  fetchFinanceApplications,
  fetchLeads,
  fetchNotifications,
  fetchPendingBusiness,
  fetchPendingDealers,
  rejectBusinessAccount,
  updateFinanceStatus,
  updateLeadStatus,
  type Lead,
  type LeadStatus,
} from "../api/crm";
import {
  McAvatar,
  McBadge,
  McButton,
  McChip,
  McContent,
  McHero,
  McIconButton,
  McInput,
  McMuted,
  McScreen,
  McSegmentRow,
  mcListStyle,
  useThemedStyles,
} from "../ui/crm";

type TabKey = "leads" | "pipeline" | "approvals" | "users" | "finance" | "desk" | "create";

const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "converted", "lost"];
const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contact",
  qualified: "Qual",
  converted: "Won",
  lost: "Lost",
};
const PIPELINE_FILTERS: { key: string; label: string; statuses?: LeadStatus[] }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New", statuses: ["new"] },
  { key: "hot", label: "Hot", statuses: ["contacted", "qualified"] },
  { key: "won", label: "Won", statuses: ["converted"] },
  { key: "lost", label: "Lost", statuses: ["lost"] },
];

const DESK_FAMILIES = new Set(["service", "parts", "auction"]);

function roleDefaultTab(family: string): TabKey {
  if (family === "customer") return "leads";
  if (family === "finance") return "finance";
  if (family === "admin") return "leads";
  if (family === "dealer" || family === "broker") return "pipeline";
  if (DESK_FAMILIES.has(family)) return "desk";
  return "leads";
}

function workspaceHint(family: string): string {
  if (family === "dealer") return "Your showroom leads only — Call / WhatsApp / status. Submitted → Dealer CRM + Admin leads.";
  if (family === "customer") return "My enquiries only. Submitted → Dealer CRM + Admin Marketplace leads.";
  if (family === "admin") return "Approvals + marketplace lead inbox. Same table as website Super Admin → Marketplace leads.";
  if (family === "finance") return "Finance applications queue only — not marketplace vehicle leads.";
  if (family === "broker") return "Broker pipeline — Call / WhatsApp / status.";
  if (DESK_FAMILIES.has(family)) return "Jobs & desk alerts live on web ERP. This app is a companion — open full desk below.";
  return "Real queues — same backend as website CRM.";
}

function statusTone(status: string): "neutral" | "primary" | "success" | "danger" | "warning" {
  const s = status.toLowerCase();
  if (s === "new") return "primary";
  if (s === "contacted" || s === "qualified" || s === "processing") return "warning";
  if (s === "converted" || s === "approved") return "success";
  if (s === "lost" || s === "rejected") return "danger";
  return "neutral";
}

function formatPhone(phone?: string) {
  if (!phone) return "";
  const d = String(phone).replace(/\D/g, "").slice(-10);
  if (d.length !== 10) return phone;
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}

function waUrl(phone?: string) {
  if (!phone) return null;
  const n = String(phone).replace(/\D/g, "").slice(-10);
  if (n.length < 10) return null;
  return `https://wa.me/91${n}`;
}

export function WorkspaceScreen() {
  const c = useCRM();
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const ws = useMemo(() => getRoleWorkspace(user?.role), [user?.role]);
  const family = getRoleFamily(user?.role);
  const admin = family === "admin";
  const finance = family === "finance";
  const canTriage = family === "dealer" || family === "broker" || family === "admin" || family === "finance";
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [tab, setTab] = useState<TabKey>(() => roleDefaultTab(family));
  const [pipeFilter, setPipeFilter] = useState("all");
  const [rows, setRows] = useState<unknown[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vehicleTitle, setVehicleTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "desk") {
        const notifs = await fetchNotifications();
        setRows(
          notifs.slice(0, 40).map((n, i) => {
            const r = n as Record<string, unknown>;
            return {
              id: String(r.id ?? i),
              name: String(r.title ?? r.message ?? "Alert"),
              notes: String(r.body ?? r.message ?? ""),
              status: String(r.read ? "read" : "new"),
              _kind: "notification",
            };
          })
        );
        setLeads([]);
      } else if (tab === "leads" || tab === "pipeline") {
        const data = await fetchLeads();
        setLeads(data);
        setRows(data);
      } else if (tab === "approvals") {
        const [d, b] = await Promise.all([fetchPendingDealers(), fetchPendingBusiness()]);
        setRows([
          ...d.map((x) => ({ ...(x as object), _kind: "dealer" })),
          ...b.map((x) => ({ ...(x as object), _kind: "business" })),
        ]);
      } else if (tab === "users") {
        setRows(await fetchAdminUsers());
      } else if (tab === "finance") {
        setRows(await fetchFinanceApplications());
      }
    } catch (e) {
      setError(e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayRows = useMemo(() => {
    if (tab !== "pipeline" && tab !== "leads") return rows;
    const filter = PIPELINE_FILTERS.find((f) => f.key === pipeFilter);
    if (!filter?.statuses) return rows;
    return (rows as Lead[]).filter((l) => filter.statuses!.includes(String(l.status ?? "new") as LeadStatus));
  }, [rows, tab, pipeFilter]);

  async function onCreateLead() {
    const phoneDigits = phone.replace(/\D/g, "").slice(-10);
    if (!name.trim() || phoneDigits.length < 10) {
      Alert.alert("Required", "Name and a valid 10-digit phone are required.");
      return;
    }
    setBusy(true);
    try {
      const lead = await createLead({
        name: name.trim(),
        phone: phoneDigits,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        vehicle_title: vehicleTitle.trim() || undefined,
        source: "mobile_app",
        metadata: user?.id ? { created_by_user_id: user.id } : undefined,
      });
      const dealerLabel = lead.dealer_name || "the assigned dealer";
      setShowCreate(false);
      setName("");
      setPhone("");
      setEmail("");
      setVehicleTitle("");
      setNotes("");
      setTab(family === "dealer" ? "pipeline" : "leads");
      await load();
      Alert.alert(
        "Lead sent",
        `Lead sent to ${dealerLabel}. Track under Enquiries / Pipeline. Admin will see it in Marketplace leads.`
      );
    } catch (e) {
      Alert.alert(
        "Could not save lead",
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Dealer missing or server error — try again."
      );
    } finally {
      setBusy(false);
    }
  }

  async function onLeadStatus(id: string, status: LeadStatus) {
    setActionId(id);
    try {
      await updateLeadStatus(id, status);
      await load();
    } catch (e) {
      Alert.alert("Update failed", e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Failed");
    } finally {
      setActionId(null);
    }
  }

  async function onApproveRow(r: Record<string, unknown>) {
    const userId = String(r.ownerId ?? r.owner_id ?? (r._kind === "business" ? r.id : "") ?? "");
    if (!userId) {
      Alert.alert("Missing owner", "This row has no owner user id to approve.");
      return;
    }
    setActionId(String(r.id));
    try {
      await approveBusinessAccount(userId);
      Alert.alert("Approved", "Account unlocked for CRM.");
      await load();
    } catch (e) {
      Alert.alert("Approve failed", e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Failed");
    } finally {
      setActionId(null);
    }
  }

  async function onRejectRow(r: Record<string, unknown>) {
    const userId = String(r.ownerId ?? r.owner_id ?? (r._kind === "business" ? r.id : "") ?? "");
    if (!userId) {
      Alert.alert("Missing owner", "This row has no owner user id to reject.");
      return;
    }
    setActionId(String(r.id));
    try {
      await rejectBusinessAccount(userId);
      Alert.alert("Rejected", "Account marked rejected.");
      await load();
    } catch (e) {
      Alert.alert("Reject failed", e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Failed");
    } finally {
      setActionId(null);
    }
  }

  async function onFinance(id: string, status: "approved" | "rejected" | "processing") {
    setActionId(id);
    try {
      await updateFinanceStatus(id, status);
      await load();
    } catch (e) {
      Alert.alert("Finance update failed", e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Failed");
    } finally {
      setActionId(null);
    }
  }

  const chips: { key: TabKey; label: string; show?: boolean }[] = [
    { key: "desk", label: family === "parts" ? "Directory" : "Jobs / alerts", show: DESK_FAMILIES.has(family) },
    { key: "leads", label: family === "customer" ? "My enquiries" : "Leads inbox", show: family === "customer" || family === "admin" },
    { key: "pipeline", label: "Pipeline", show: family === "dealer" || family === "broker" || family === "admin" },
    { key: "create", label: "New lead", show: family === "customer" || family === "dealer" || family === "broker" },
    { key: "approvals", label: "Approvals", show: admin },
    { key: "users", label: "Users", show: admin },
    { key: "finance", label: "Finance queue", show: admin || finance },
  ];

  const visibleChips = chips.filter((c) => c.show !== false);
  const listCols = desktop && tab !== "pipeline" && tab !== "desk" ? 2 : 1;

  function renderRow(item: unknown, index: number) {
    const r = item as Record<string, unknown>;
    const id = String(r.id ?? index);
    const title = String(
      r.name ?? r.fullName ?? r.full_name ?? r.ownerName ?? r.email ?? r.title ?? r.companyName ?? r.company_name ?? r.id ?? "Record"
    );
    const phoneVal = r.phone ? String(r.phone) : undefined;
    const status = String(r.status ?? r.verificationStatus ?? r.verification_status ?? r._kind ?? "");
    const sub = [r._kind, phoneVal, status, r.role, r.city, r.amount, r.ownerEmail].filter(Boolean).map(String).join(" · ");
    const busyRow = actionId === id;

    const leadStatus = String(r.status ?? "new");
    const statusLabel = leadStatus.replace(/_/g, " ");

    return (
      <View key={id} style={[styles.card, listCols > 1 && styles.rowWide]}>
        <View style={styles.cardTop}>
          <McAvatar name={title} size={46} />
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {title}
            </Text>
            {phoneVal ? (
              <Text style={styles.cardPhone}>{formatPhone(phoneVal)}</Text>
            ) : (
              <Text style={styles.cardSub} numberOfLines={1}>
                {sub}
              </Text>
            )}
          </View>
          {(tab === "leads" || tab === "pipeline") && status ? (
            <McBadge label={statusLabel} tone={statusTone(leadStatus)} />
          ) : null}
        </View>

        {(tab === "leads" || tab === "pipeline") && phoneVal ? (
          <View style={styles.actions}>
            <McIconButton label="Call" variant="outline" onPress={() => void Linking.openURL(`tel:${phoneVal}`)} />
            {waUrl(phoneVal) ? (
              <McIconButton label="WhatsApp" variant="wa" onPress={() => void Linking.openURL(waUrl(phoneVal)!)} />
            ) : null}
          </View>
        ) : null}

        {canTriage && (tab === "leads" || tab === "pipeline") ? (
          <View style={styles.segmentWrap}>
            <McSegmentRow
              options={LEAD_STATUSES}
              labels={LEAD_STATUS_LABELS}
              value={(LEAD_STATUSES.includes(leadStatus as LeadStatus) ? leadStatus : "new") as LeadStatus}
              onChange={(s) => void onLeadStatus(id, s)}
              disabled={busyRow}
            />
          </View>
        ) : null}

        {tab === "approvals" ? (
          <View style={styles.actions}>
            <McIconButton label={busyRow ? "…" : "Approve"} variant="primary" onPress={() => void onApproveRow(r)} />
            <McIconButton label="Reject" variant="outline" onPress={() => void onRejectRow(r)} />
          </View>
        ) : null}

        {tab === "finance" ? (
          <View style={styles.actions}>
            <McIconButton label="Approve" variant="primary" onPress={() => void onFinance(id, "approved")} />
            <McIconButton label="Processing" variant="outline" onPress={() => void onFinance(id, "processing")} />
            <McIconButton label="Reject" variant="outline" onPress={() => void onFinance(id, "rejected")} />
          </View>
        ) : null}
      </View>
    );
  }

  const emptyText =
    loading
      ? "Loading…"
      : tab === "desk"
        ? "No alerts yet — open web desk for full jobs."
        : "No records yet. Create a lead or wait for enquiries.";

  const header = (
    <View style={styles.headerBlock}>
      <McHero
        eyebrow={`${ws.label} workspace`}
        title={ws.tabs.workspace}
        body={workspaceHint(family)}
        right={
          desktop ? (
            <Pressable style={styles.webBtn} onPress={() => void Linking.openURL(`${WEB_SITE_URL}${ws.webPath}`)}>
              <Text style={styles.webBtnText}>Web CRM →</Text>
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
        {visibleChips.map((item) => (
          <McChip
            key={item.key}
            variant="tab"
            label={item.label}
            active={item.key === "create" ? showCreate : tab === item.key}
            onPress={() => {
              if (item.key === "create") setShowCreate(true);
              else setTab(item.key);
            }}
          />
        ))}
      </ScrollView>

      {(tab === "pipeline" || (tab === "leads" && canTriage)) && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
          {PIPELINE_FILTERS.map((f) => (
            <McChip key={f.key} variant="filter" label={f.label} active={pipeFilter === f.key} onPress={() => setPipeFilter(f.key)} />
          ))}
        </ScrollView>
      )}

      {!desktop ? (
        <Pressable style={styles.webLink} onPress={() => void Linking.openURL(`${WEB_SITE_URL}${ws.webPath}`)}>
          <Text style={styles.webLinkText}>Open full web CRM</Text>
          <Text style={styles.webLinkArrow}>→</Text>
        </Pressable>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {tab === "desk" ? (
        <View style={styles.deskBanner}>
          <Text style={styles.deskTitle}>Full {ws.label} desk is on the website</Text>
          <McMuted>
            Marketplace vehicle leads are for dealers/customers — not this role. Open web ERP for jobs, parts, or auction tools.
          </McMuted>
          <Pressable style={[styles.webBtn, { marginTop: 12 }]} onPress={() => void Linking.openURL(`${WEB_SITE_URL}${ws.webPath}`)}>
            <Text style={styles.webBtnText}>Open {ws.webPath} →</Text>
          </Pressable>
        </View>
      ) : null}

      {tab === "leads" || tab === "pipeline" ? (
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{displayRows.length} of {leads.length} records</Text>
          <Text style={styles.metaHint}>Pull to refresh</Text>
        </View>
      ) : null}
      {tab === "desk" ? <Text style={styles.meta}>{displayRows.length} recent alerts · pull to refresh</Text> : null}
    </View>
  );

  return (
    <McScreen>
      <McContent style={styles.fill}>
        {Platform.OS === "web" ? (
          <ScrollView
            style={mcListStyle(styles.fill)}
            contentContainerStyle={[styles.list, displayRows.length === 0 && styles.listEmpty]}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={c.primary} />}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            {header}
            {displayRows.length === 0 ? <Text style={styles.empty}>{emptyText}</Text> : displayRows.map((item, i) => renderRow(item, i))}
          </ScrollView>
        ) : (
          <FlatList
            style={mcListStyle(styles.fill)}
            data={displayRows}
            key={`ws-${listCols}-${tab}`}
            numColumns={listCols}
            keyExtractor={(item, i) => String((item as { id?: string })?.id ?? i)}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={c.primary} />}
            contentContainerStyle={[styles.list, displayRows.length === 0 && styles.listEmpty]}
            columnWrapperStyle={listCols > 1 ? styles.colWrap : undefined}
            ListHeaderComponent={header}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
            renderItem={({ item, index }) => renderRow(item, index)}
          />
        )}
      </McContent>

      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <View style={[styles.modal, desktop && styles.modalDesktop]}>
            <Text style={styles.modalTitle}>New marketplace lead</Text>
            <McMuted>
              {family === "dealer"
                ? "Auto-attaches to your showroom. Shows in Dealer CRM + Admin Marketplace leads."
                : "Submitted → Dealer CRM + Admin Marketplace leads. Track under My enquiries."}
            </McMuted>
            <View style={{ height: 12 }} />
            <McInput placeholder="Customer name *" value={name} onChangeText={setName} />
            <McInput placeholder="Phone * (10 digits)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <McInput placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            <McInput placeholder="Vehicle title (optional)" value={vehicleTitle} onChangeText={setVehicleTitle} />
            <McInput placeholder="Notes" value={notes} onChangeText={setNotes} />
            <McButton label="Save lead" busy={busy} onPress={() => void onCreateLead()} />
            <View style={{ height: 8 }} />
            <McButton label="Cancel" variant="ghost" onPress={() => setShowCreate(false)} />
          </View>
        </View>
      </Modal>
    </McScreen>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  fill: { flex: 1, width: "100%" },
  headerBlock: { width: "100%", paddingTop: 4 },
  chipScroll: { flexGrow: 0, flexShrink: 0, height: 50, maxHeight: 50, width: "100%" },
  chips: { paddingHorizontal: 16, paddingVertical: 6, alignItems: "center", flexDirection: "row" },
  webLink: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: c.radiusSm,
    backgroundColor: c.primarySoft,
    borderWidth: 1,
    borderColor: c.primaryGlow,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  webLinkText: { color: c.primary, fontWeight: "800", fontSize: 13 },
  webLinkArrow: { color: c.primary, fontWeight: "800", fontSize: 16 },
  webBtn: {
    backgroundColor: c.primarySoft,
    borderWidth: 1,
    borderColor: c.primaryGlow,
    borderRadius: c.radiusXs,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexShrink: 0,
  },
  webBtnText: { color: c.primary, fontWeight: "800", fontSize: 12 },
  error: { color: c.danger, paddingHorizontal: 16, marginBottom: 6, fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 108, width: "100%" },
  listEmpty: { flexGrow: 1, minHeight: 200 },
  colWrap: { gap: 12 },
  rowWide: { flex: 1, maxWidth: "50%" },
  empty: { textAlign: "center", color: c.muted, marginTop: 40, paddingHorizontal: 20, fontSize: 14 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  meta: { color: c.textSecondary, fontSize: 12, fontWeight: "700" },
  metaHint: { color: c.muted, fontSize: 11 },
  card: {
    backgroundColor: c.card,
    borderRadius: c.radius,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.border,
    ...c.shadowSm,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardHead: { flex: 1, minWidth: 0 },
  cardTitle: { fontWeight: "800", color: c.text, fontSize: 16, letterSpacing: -0.2 },
  cardPhone: { marginTop: 3, fontSize: 13, color: c.textSecondary, fontWeight: "600", letterSpacing: 0.3 },
  cardSub: { marginTop: 3, fontSize: 12, color: c.muted },
  actions: { flexDirection: "row", gap: 8, marginTop: 14 },
  segmentWrap: { marginTop: 12 },
  deskBanner: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    borderRadius: c.radiusSm,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgElevated,
    ...c.shadowSm,
  },
  deskTitle: { fontWeight: "800", color: c.text, fontSize: 15, marginBottom: 4 },
  modalWrap: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "flex-end", alignItems: "center" },
  modal: {
    backgroundColor: c.card,
    borderTopLeftRadius: c.radiusLg,
    borderTopRightRadius: c.radiusLg,
    padding: 22,
    paddingBottom: 36,
    width: "100%",
    maxWidth: 520,
    borderWidth: 1,
    borderColor: c.border,
    ...c.shadowLg,
  },
  modalDesktop: { borderRadius: c.radiusLg, marginBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: c.text, marginBottom: 4, letterSpacing: -0.3 },
});
}
