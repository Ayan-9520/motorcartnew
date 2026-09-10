import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ThemeColors } from "../theme";
import { fetchVehicleById, type Vehicle } from "../api/vehicles";
import { createLead } from "../api/crm";
import { useAuth } from "../auth/AuthContext";
import { useCRM } from "../ThemeContext";
import type { ApiError } from "../api/client";
import {
  McButton,
  McContent,
  McMuted,
  McScreen,
  McSectionLabel,
  McTitle,
  useThemedStyles,
} from "../ui/crm";
import type { RootStackParamList } from "../navigation/types";
import { resolveVehicleImage } from "../lib/vehicleImage";

type Props = NativeStackScreenProps<RootStackParamList, "VehicleDetail">;

function formatPrice(n?: number) {
  if (n == null || Number.isNaN(n)) return "Price on request";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function emiEstimate(price?: number) {
  if (!price || price < 50000) return null;
  const r = 0.1 / 12;
  const n = 60;
  const emi = (price * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi);
}

export function VehicleDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { user } = useAuth();
  const c = useCRM();
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const v = await fetchVehicleById(id);
    setVehicle(v);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function enquire() {
    if (!vehicle) return;
    const title = vehicle.title || [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Vehicle";
    if (!user?.phone && !user?.email) {
      Alert.alert("Profile incomplete", "Add a phone on your account for faster dealer callback.");
    }
    setBusy(true);
    try {
      await createLead({
        name: user?.fullName || user?.email || "App user",
        phone: user?.phone || "9999999999",
        email: user?.email || undefined,
        vehicle_id: vehicle.id,
        vehicle_title: title,
        notes: `Enquiry from Motorcart app detail — ${title}`,
        source: "mobile_app",
      });
      Alert.alert("Lead sent", "Dealer / admin CRM will see this enquiry.");
    } catch (e) {
      Alert.alert("Failed", (e as ApiError)?.message ?? "Could not create lead");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <McScreen>
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      </McScreen>
    );
  }

  if (!vehicle) {
    return (
      <McScreen>
        <McContent style={styles.pad}>
          <McTitle>Vehicle not found</McTitle>
          <View style={{ height: 12 }} />
          <McButton label="Go back" variant="outline" onPress={() => navigation.goBack()} />
        </McContent>
      </McScreen>
    );
  }

  const title = vehicle.title || [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Vehicle";
  const img = resolveVehicleImage(vehicle.images?.[0]);
  const emi = emiEstimate(vehicle.price);

  return (
    <McScreen>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <McContent style={styles.pad}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Back to market</Text>
          </Pressable>

          <View style={[styles.layout, desktop && styles.layoutDesktop]}>
            <View style={[styles.media, desktop && styles.mediaDesktop]}>
              {img ? (
                <Image source={{ uri: img }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={[styles.image, styles.fallback]}>
                  <Text style={styles.fallbackText}>{(vehicle.brand || "MC").slice(0, 2).toUpperCase()}</Text>
                </View>
              )}
            </View>

            <View style={styles.info}>
              <McSectionLabel>{vehicle.category || "Vehicle"}</McSectionLabel>
              <McTitle>{title}</McTitle>
              <Text style={styles.price}>{formatPrice(vehicle.price)}</Text>
              {emi ? <McMuted>Est. EMI ~ ₹{emi.toLocaleString("en-IN")}/mo (60 mo @ 10%)</McMuted> : null}

              <View style={styles.specs}>
                {[
                  vehicle.year && `Year ${vehicle.year}`,
                  vehicle.city,
                  vehicle.fuel_type,
                  vehicle.transmission,
                  vehicle.km_driven != null && `${Number(vehicle.km_driven).toLocaleString("en-IN")} km`,
                  vehicle.owners != null && `${vehicle.owners} owner(s)`,
                ]
                  .filter(Boolean)
                  .map((s) => (
                    <View key={String(s)} style={styles.specChip}>
                      <Text style={styles.specText}>{s}</Text>
                    </View>
                  ))}
              </View>

              {vehicle.description ? (
                <Text style={styles.desc}>{vehicle.description}</Text>
              ) : (
                <McMuted>Live listing from Motorcart marketplace. Enquire to connect with the seller desk.</McMuted>
              )}

              <View style={{ height: 18 }} />
              <McButton label="Enquire · create CRM lead" busy={busy} onPress={() => void enquire()} />
              <View style={{ height: 10 }} />
              <McButton label="Back" variant="ghost" onPress={() => navigation.goBack()} />
            </View>
          </View>
        </McContent>
      </ScrollView>
    </McScreen>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    pad: { padding: 16, paddingBottom: 40 },
    back: { marginBottom: 14 },
    backText: { color: c.primary, fontWeight: "800", fontSize: 13 },
    layout: { gap: 16 },
    layoutDesktop: { flexDirection: "row", gap: 24, alignItems: "flex-start" },
    media: {
      width: "100%",
      borderRadius: c.radius,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.border,
      ...c.shadowSm,
    },
    mediaDesktop: { flex: 1.1 },
    image: { width: "100%", height: 240, backgroundColor: c.bgElevated },
    fallback: { alignItems: "center", justifyContent: "center", backgroundColor: c.navyDeep },
    fallbackText: { fontSize: 36, fontWeight: "800", color: c.primary },
    info: { flex: 1, minWidth: 0 },
    price: { marginTop: 8, marginBottom: 6, fontSize: 26, fontWeight: "800", color: c.primary },
    specs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14, marginBottom: 12 },
    specChip: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    specText: { color: c.textSecondary, fontSize: 12, fontWeight: "700" },
    desc: { color: c.textSecondary, lineHeight: 21, fontSize: 14, marginTop: 4 },
  });
}
