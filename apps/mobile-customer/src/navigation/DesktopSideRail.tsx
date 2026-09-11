import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Linking from "expo-linking";
import { WEB_SITE_URL } from "../config";
import { useAuth } from "../auth/AuthContext";
import { getRoleWorkspace } from "../roles";
import { useCRM, useTheme } from "../ThemeContext";
import { MotorcartLogo } from "../ui/MotorcartLogo";
import { McAvatar, McMuted } from "../ui/crm";

export const DESKTOP_RAIL_WIDTH = 248;

const GLYPH: Record<string, string> = {
  Home: "⌂",
  Browse: "◎",
  Workspace: "◫",
  Profile: "◉",
};

/** Desktop / tablet web: left command rail (phone keeps bottom tabs). */
export function DesktopSideRail({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const c = useCRM();
  const { resolved } = useTheme();
  const { user } = useAuth();
  const ws = getRoleWorkspace(user?.role);
  const name = user?.fullName?.trim() || user?.email?.split("@")[0] || "User";

  return (
    <View
      style={[
        styles.rail,
        {
          backgroundColor: c.header,
          borderRightColor: c.border,
          paddingTop: Math.max(insets?.top ?? 0, 16),
          paddingBottom: Math.max(insets?.bottom ?? 0, 14),
          ...c.shadowSm,
        },
      ]}
    >
      <View style={styles.brandBlock}>
        <MotorcartLogo variant="full" height={28} tone={resolved === "dark" ? "dark" : "light"} />
        <Text style={[styles.brandMeta, { color: c.muted }]}>Companion app</Text>
        <View style={[styles.livePill, { backgroundColor: c.primarySoft, borderColor: c.primaryGlow }]}>
          <View style={[styles.liveDot, { backgroundColor: c.primary }]} />
          <Text style={[styles.liveText, { color: c.primary }]}>{ws.label}</Text>
        </View>
      </View>

      <View style={styles.nav}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : options.title ?? route.name;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              style={[
                styles.item,
                {
                  backgroundColor: focused ? c.primarySoft : "transparent",
                  borderColor: focused ? c.primaryGlow : "transparent",
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: focused ? c.primary : c.bgElevated, borderColor: c.border },
                ]}
              >
                <Text style={{ color: focused ? c.primaryOn : c.text, fontWeight: "800", fontSize: 15 }}>
                  {GLYPH[route.name] ?? "•"}
                </Text>
              </View>
              <Text style={[styles.itemLabel, { color: focused ? c.text : c.muted }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.footer, { borderTopColor: c.border }]}>
        <View style={styles.userRow}>
          <McAvatar name={name} size={36} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.userName, { color: c.text }]} numberOfLines={1}>
              {name}
            </Text>
            <McMuted>{user?.email}</McMuted>
          </View>
        </View>
        <Pressable
          onPress={() => void Linking.openURL(`${WEB_SITE_URL}${ws.webPath}`)}
          style={[styles.webCta, { backgroundColor: c.primary }]}
        >
          <Text style={[styles.webCtaText, { color: c.primaryOn }]}>Open full web OS →</Text>
        </Pressable>
        <Text style={[styles.hint, { color: c.muted }]}>
          Phone = this app. Full inventory / New Car OS = motorcart.in
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: DESKTOP_RAIL_WIDTH,
    flex: 1,
    borderRightWidth: 1,
    paddingHorizontal: 14,
    justifyContent: "space-between",
  },
  brandBlock: { gap: 10, paddingHorizontal: 4, marginBottom: 18 },
  brandMeta: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  livePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 99 },
  liveText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  nav: { flexGrow: 1, gap: 6 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  itemLabel: { fontSize: 14, fontWeight: "700", flexShrink: 1 },
  footer: { borderTopWidth: 1, paddingTop: 14, gap: 12 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  userName: { fontSize: 13, fontWeight: "800" },
  webCta: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  webCtaText: { fontSize: 13, fontWeight: "800" },
  hint: { fontSize: 11, lineHeight: 15 },
});
