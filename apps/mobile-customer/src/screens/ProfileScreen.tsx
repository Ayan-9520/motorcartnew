import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { WEB_SITE_URL } from "../config";
import type { ThemeColors } from "../theme";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../ThemeContext";
import { updateProfile } from "../api/auth";
import { getRoleWorkspace } from "../roles";
import {
  McAvatar,
  McBadge,
  McButton,
  McContent,
  McScreen,
  McSettingsField,
  McSettingsGroup,
  McSettingsRow,
  McThemeToggle,
  mcListStyle,
  useThemedStyles,
} from "../ui/crm";

type ProfileForm = {
  fullName: string;
  phone: string;
  city: string;
  state: string;
};

function toForm(user: ReturnType<typeof useAuth>["user"]): ProfileForm {
  return {
    fullName: user?.fullName?.trim() ?? "",
    phone: user?.phone?.trim() ?? "",
    city: user?.city?.trim() ?? "",
    state: user?.state?.trim() ?? "",
  };
}

function statusTone(status?: string): "neutral" | "primary" | "success" | "danger" {
  const s = (status ?? "").toLowerCase();
  if (s === "active" || s === "approved") return "success";
  if (s === "suspended" || s === "closed") return "danger";
  if (s === "pending_verification") return "primary";
  return "neutral";
}

export function ProfileScreen() {
  const { user, signOut, refresh } = useAuth();
  const { resolved } = useTheme();
  const ws = useMemo(() => getRoleWorkspace(user?.role), [user?.role]);
  const styles = useThemedStyles(makeStyles);
  const [form, setForm] = useState<ProfileForm>(() => toForm(user));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(toForm(user));
  }, [user?.fullName, user?.phone, user?.city, user?.state]);

  const baseline = useMemo(() => toForm(user), [user]);
  const dirty = useMemo(
    () =>
      form.fullName !== baseline.fullName ||
      form.phone !== baseline.phone ||
      form.city !== baseline.city ||
      form.state !== baseline.state,
    [form, baseline]
  );

  function patch(key: keyof ProfileForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveProfile() {
    const phoneDigits = form.phone.replace(/\D/g, "").slice(-10);
    if (!form.fullName.trim()) {
      Alert.alert("Name required", "Enter your full name.");
      return;
    }
    if (phoneDigits.length > 0 && phoneDigits.length < 10) {
      Alert.alert("Invalid phone", "Enter a valid 10-digit mobile number or leave blank.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        fullName: form.fullName.trim(),
        ...(phoneDigits.length >= 10 ? { phone: phoneDigits } : {}),
        city: form.city.trim(),
        state: form.state.trim(),
      });
      await refresh();
      Alert.alert("Profile saved", "Your details are updated across Motorcart app & CRM.");
    } catch (e) {
      Alert.alert(
        "Could not save",
        e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const displayName = user?.fullName?.trim() || user?.email?.split("@")[0] || "User";

  return (
    <McScreen>
      <ScrollView
        style={mcListStyle()}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        <McContent style={styles.pad}>
          {/* Profile header */}
          <View style={styles.hero}>
            <McAvatar name={displayName} size={72} />
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.badges}>
              <McBadge label={ws.label} tone="primary" />
              {user?.status ? <McBadge label={user.status.replace(/_/g, " ")} tone={statusTone(user.status)} /> : null}
            </View>
            <Text style={styles.heroHint}>{ws.subtitle}</Text>
          </View>

          {/* Editable details */}
          <McSettingsGroup title="Personal details">
            <McSettingsField
              label="Full name"
              value={form.fullName}
              onChangeText={(v) => patch("fullName", v)}
              placeholder="Your name"
              autoCapitalize="words"
            />
            <McSettingsField
              label="Mobile number"
              value={form.phone}
              onChangeText={(v) => patch("phone", v)}
              placeholder="10-digit number for dealer callbacks"
              keyboardType="phone-pad"
            />
            <McSettingsField
              label="City"
              value={form.city}
              onChangeText={(v) => patch("city", v)}
              placeholder="e.g. Mumbai"
              autoCapitalize="words"
            />
            <McSettingsField
              label="State"
              value={form.state}
              onChangeText={(v) => patch("state", v)}
              placeholder="e.g. Maharashtra"
              autoCapitalize="words"
              last
            />
          </McSettingsGroup>

          <McSettingsGroup title="Account">
            <McSettingsRow label="Email" value={user?.email ?? "—"} hint="Sign-in ID · contact support to change" last />
          </McSettingsGroup>

          <McSettingsGroup title="Preferences">
            <McSettingsRow
              label="Appearance"
              hint={resolved === "dark" ? "Dark mode" : "Light mode"}
              right={<McThemeToggle size={38} />}
              last
            />
          </McSettingsGroup>

          <McSettingsGroup title="Workspace">
            <McSettingsRow
              label="Open web CRM"
              hint={ws.webPath}
              onPress={() => void Linking.openURL(`${WEB_SITE_URL}${ws.webPath}`)}
              last
            />
          </McSettingsGroup>

          {dirty ? (
            <McButton label="Save profile" busy={saving} onPress={() => void saveProfile()} />
          ) : null}
          <View style={{ height: dirty ? 10 : 0 }} />
          <McButton label="Sign out" variant="danger" onPress={() => void signOut()} />
        </McContent>
      </ScrollView>
    </McScreen>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    scroll: { paddingBottom: 108 },
    pad: { paddingHorizontal: 16, paddingTop: 8 },
    hero: {
      alignItems: "center",
      paddingVertical: 24,
      paddingHorizontal: 18,
      marginBottom: 8,
      borderRadius: c.radius,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      ...c.shadowSm,
    },
    name: {
      marginTop: 14,
      fontSize: 22,
      fontWeight: "800",
      color: c.text,
      letterSpacing: -0.4,
      textAlign: "center",
    },
    email: {
      marginTop: 4,
      fontSize: 14,
      color: c.muted,
      textAlign: "center",
    },
    badges: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 8,
      marginTop: 14,
    },
    heroHint: {
      marginTop: 14,
      fontSize: 13,
      color: c.muted,
      textAlign: "center",
      lineHeight: 19,
      paddingHorizontal: 8,
    },
  });
}
