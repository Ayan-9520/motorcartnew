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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ThemeColors } from "../theme";
import { fetchVehicles, type Vehicle } from "../api/vehicles";
import type { ApiError } from "../api/client";
import { McChip, McContent, McMuted, McScreen, McSectionLabel, useThemedStyles } from "../ui/crm";
import { getRoleFamily, getRoleWorkspace } from "../roles";
import { useAuth } from "../auth/AuthContext";
import { useCRM } from "../ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { resolveVehicleImage } from "../lib/vehicleImage";
import { MotorcartLogo } from "../ui/MotorcartLogo";

function formatPrice(n?: number) {
  if (n == null || Number.isNaN(n)) return "Price on request";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

const CATEGORIES = ["All", "car", "bike", "suv", "truck", "ev"];

export function VehiclesScreen() {
  const { user } = useAuth();
  const c = useCRM();
  const styles = useThemedStyles(makeStyles);
  const ws = useMemo(() => getRoleWorkspace(user?.role), [user?.role]);
  const family = getRoleFamily(user?.role);
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const cols = desktop ? 3 : width >= 640 ? 2 : 1;
  const [items, setItems] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await fetchVehicles({
        limit: 60,
        category: category === "All" ? undefined : category,
        q: q.trim() || undefined,
      });
      setItems(list);
    } catch (e) {
      setError((e as ApiError)?.message ?? "Could not load vehicles");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, q]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => void load(), q ? 280 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  if (loading && !items.length) {
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
          key={`cols-${cols}`}
          numColumns={cols}
          style={styles.fill}
          contentContainerStyle={styles.list}
          columnWrapperStyle={cols > 1 ? styles.colWrap : undefined}
          data={items}
          keyExtractor={(item) => item.id}
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
              <Text style={styles.h}>{family === "dealer" ? "Stock & market" : "Marketplace"}</Text>
              <McMuted>Search · filter · open detail · enquire creates a real lead</McMuted>

              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Search brand, model, city…"
                placeholderTextColor={c.muted}
                style={styles.search}
              />

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

              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Text style={styles.meta}>{items.length} listings</Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.empty}>{error ?? "No vehicles match your filters."}</Text>}
          renderItem={({ item }) => {
            const title = item.title || [item.brand, item.model].filter(Boolean).join(" ") || "Vehicle";
            const img = resolveVehicleImage(item.images?.[0]);
            return (
              <Pressable
                style={[styles.card, cols > 1 && styles.cardGrid]}
                onPress={() => nav.navigate("VehicleDetail", { id: item.id, title })}
              >
                {img ? (
                  <Image source={{ uri: img }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={[styles.image, styles.fallback]}>
                    <View style={styles.fallbackBadge}>
                      <Text style={styles.fallbackText}>{(item.brand || "MC").slice(0, 2).toUpperCase()}</Text>
                    </View>
                  </View>
                )}
                <View style={styles.metaBox}>
                  <Text style={styles.title} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={styles.sub}>{[item.year, item.city, item.fuel_type].filter(Boolean).join(" · ")}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{formatPrice(item.price)}</Text>
                    <Text style={styles.open}>Details →</Text>
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
