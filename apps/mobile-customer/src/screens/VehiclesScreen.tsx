import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { WEB_SITE_URL } from "../config";
import type { ThemeColors } from "../theme";
import { fetchVehicles, type Vehicle } from "../api/vehicles";
import { fetchNewCarInventory, type NewCarStockItem } from "../api/inventory";
import type { ApiError } from "../api/client";
import { McChip, McContent, McMuted, McScreen, McSectionLabel, McSegmentRow, useThemedStyles } from "../ui/crm";
import { getRoleFamily, getRoleWorkspace } from "../roles";
import { useAuth } from "../auth/AuthContext";
import { useCRM } from "../ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { resolveVehicleImage } from "../lib/vehicleImage";
import { MotorcartLogo } from "../ui/MotorcartLogo";

function formatPrice(n?: number | null) {
  if (n == null || Number.isNaN(n) || n <= 0) return "Price on request";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

const CATEGORIES = ["All", "car", "bike", "suv", "truck", "ev"];

type BrowseMode = "showroom" | "market";

type Row = {
  id: string;
  title: string;
  sub: string;
  price?: number | null;
  image?: string | null;
  kind: BrowseMode;
  status?: string | null;
};

function vehicleToRow(v: Vehicle): Row {
  return {
    id: v.id,
    title: v.title || [v.brand, v.model].filter(Boolean).join(" ") || "Vehicle",
    sub: [v.year, v.city, v.fuel_type].filter(Boolean).join(" · "),
    price: v.price,
    image: v.images?.[0] ?? null,
    kind: "market",
  };
}

function stockToRow(s: NewCarStockItem): Row {
  return {
    id: s.id,
    title: [s.brand, s.model, s.variant].filter(Boolean).join(" ") || "Stock unit",
    sub: [s.year, s.fuel_type, s.stock_status, s.stock != null ? `qty ${s.stock}` : null]
      .filter(Boolean)
      .join(" · "),
    price: s.ex_showroom_price && s.ex_showroom_price > 0 ? s.ex_showroom_price : s.price,
    image: s.image_url ?? s.images?.[0] ?? null,
    kind: "showroom",
    status: s.stock_status,
  };
}

export function VehiclesScreen() {
  const { user } = useAuth();
  const c = useCRM();
  const styles = useThemedStyles(makeStyles);
  const ws = useMemo(() => getRoleWorkspace(user?.role), [user?.role]);
  const family = getRoleFamily(user?.role);
  const isDealer = family === "dealer";
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const cols = desktop ? 3 : width >= 640 ? 2 : 1;
  const [mode, setMode] = useState<BrowseMode>(isDealer ? "showroom" : "market");
  const [rows, setRows] = useState<Row[]>([]);
  const [stockTotal, setStockTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (isDealer && mode === "showroom") {
        const inv = await fetchNewCarInventory({ q: q.trim() || undefined, pageSize: 200 });
        setRows(inv.items.map(stockToRow));
        setStockTotal(inv.kpis.totalRows || inv.total);
      } else {
        const list = await fetchVehicles({
          limit: 60,
          category: category === "All" ? undefined : category,
          q: q.trim() || undefined,
        });
        setRows(list.map(vehicleToRow));
        setStockTotal(null);
      }
    } catch (e) {
      setError((e as ApiError)?.message ?? "Could not load stock");
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, isDealer, mode, q]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => void load(), q ? 280 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  function openRow(item: Row) {
    if (item.kind === "showroom") {
      void Linking.openURL(`${WEB_SITE_URL}/buy/cars/new/${encodeURIComponent(`ncd-${item.id}`)}`);
      return;
    }
    nav.navigate("VehicleDetail", { id: item.id, title: item.title });
  }

  if (loading && !rows.length) {
    return (
      <McScreen>
        <View style={styles.center}>
          <MotorcartLogo variant="full" height={40} tone="auto" />
          <ActivityIndicator color={c.primary} size="large" style={{ marginTop: 20 }} />
        </View>
      </McScreen>
    );
  }

  return (
    <McScreen>
      <McContent style={styles.fill}>
        <FlatList
          key={`cols-${cols}-${mode}`}
          numColumns={cols}
          style={styles.fill}
          contentContainerStyle={styles.list}
          columnWrapperStyle={cols > 1 ? styles.colWrap : undefined}
          data={rows}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor={c.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <McSectionLabel>{ws.tabs.browse}</McSectionLabel>
              <Text style={styles.h}>
                {isDealer && mode === "showroom" ? "Your showroom stock" : isDealer ? "Marketplace" : "Marketplace"}
              </Text>
              <McMuted>
                {isDealer && mode === "showroom"
                  ? "Live new-car inventory — same API as motorcart.in New Car OS"
                  : "Search · filter · open detail · enquire creates a real lead"}
              </McMuted>

              {isDealer ? (
                <View style={{ marginTop: 12 }}>
                  <McSegmentRow
                    options={["showroom", "market"] as const}
                    value={mode}
                    onChange={setMode}
                    labels={{ showroom: "My stock", market: "Market" }}
                  />
                </View>
              ) : null}

              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder={mode === "showroom" ? "Search brand, model, variant…" : "Search brand, model, city…"}
                placeholderTextColor={c.muted}
                style={styles.search}
              />

              {mode === "market" ? (
                <FlatList
                  horizontal
                  data={CATEGORIES}
                  keyExtractor={(cat) => cat}
                  showsHorizontalScrollIndicator={false}
                  style={styles.catScroll}
                  contentContainerStyle={styles.catRow}
                  renderItem={({ item: cat }) => (
                    <McChip
                      label={cat === "All" ? "All" : cat.toUpperCase()}
                      active={category === cat}
                      onPress={() => setCategory(cat)}
                    />
                  )}
                />
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Text style={styles.meta}>
                {stockTotal != null ? `${rows.length} shown · ${stockTotal} total in showroom` : `${rows.length} listings`}
              </Text>
              {isDealer && mode === "showroom" ? (
                <Pressable onPress={() => void Linking.openURL(`${WEB_SITE_URL}${ws.webPath}/inventory`)} style={{ marginTop: 8 }}>
                  <Text style={{ color: c.primary, fontWeight: "800", fontSize: 13 }}>Edit stock on website →</Text>
                </Pressable>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>{error ?? (mode === "showroom" ? "No showroom stock yet." : "No vehicles match your filters.")}</Text>
          }
          renderItem={({ item }) => {
            const img = resolveVehicleImage(item.image);
            return (
              <Pressable style={[styles.card, cols > 1 && styles.cardGrid]} onPress={() => openRow(item)}>
                {img ? (
                  <Image source={{ uri: img }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={[styles.image, styles.fallback]}>
                    <View style={styles.fallbackBadge}>
                      <Text style={styles.fallbackText}>{(item.title || "MC").slice(0, 2).toUpperCase()}</Text>
                    </View>
                  </View>
                )}
                <View style={styles.metaBox}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.sub} numberOfLines={2}>
                    {item.sub}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{formatPrice(item.price)}</Text>
                    <Text style={styles.open}>{item.kind === "showroom" ? "Open →" : "Details →"}</Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      </McContent>
    </McScreen>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    fill: { flex: 1, width: "100%" },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    list: { padding: 16, paddingBottom: 48 },
    colWrap: { gap: 12 },
    headerBlock: { marginBottom: 14, width: "100%" },
    h: { fontSize: 26, fontWeight: "800", color: c.text, letterSpacing: -0.5, marginBottom: 4 },
    search: {
      marginTop: 14,
      borderWidth: 1,
      borderColor: c.borderStrong,
      backgroundColor: c.bgElevated,
      borderRadius: c.radiusSm,
      paddingHorizontal: 14,
      paddingVertical: 13,
      color: c.text,
      fontSize: 15,
      width: "100%",
    },
    catScroll: { flexGrow: 0, height: 48, marginTop: 10, maxHeight: 48 },
    catRow: { alignItems: "center", paddingVertical: 6 },
    error: { color: c.danger, marginTop: 8, fontSize: 13, fontWeight: "600" },
    meta: { color: c.muted, fontSize: 12, marginTop: 10, fontWeight: "600" },
    empty: { textAlign: "center", color: c.muted, marginTop: 40 },
    card: {
      backgroundColor: c.card,
      borderRadius: c.radius,
      overflow: "hidden",
      marginBottom: 14,
      borderWidth: 1,
      borderColor: c.border,
      width: "100%",
      ...c.shadow,
    },
    cardGrid: { flex: 1, maxWidth: "100%", minWidth: 0 },
    image: { width: "100%", height: 168, backgroundColor: c.bgElevated },
    fallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.navyDeep,
    },
    fallbackBadge: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(37, 211, 102, 0.14)",
      borderWidth: 1,
      borderColor: "rgba(37, 211, 102, 0.35)",
    },
    fallbackText: { fontSize: 18, fontWeight: "800", color: c.primary },
    metaBox: { padding: 14 },
    title: { fontSize: 16, fontWeight: "700", color: c.text, letterSpacing: -0.2 },
    sub: { marginTop: 4, fontSize: 12, color: c.muted },
    priceRow: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    price: { fontSize: 17, fontWeight: "800", color: c.primary },
    open: { color: c.textSecondary, fontWeight: "700", fontSize: 12 },
  });
}
