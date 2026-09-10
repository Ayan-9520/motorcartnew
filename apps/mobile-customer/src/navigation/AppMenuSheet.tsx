import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import * as Linking from "expo-linking";
import { WEB_SITE_URL } from "../config";
import { useAuth } from "../auth/AuthContext";
import { getAppMenuSections, getRoleWorkspace } from "../roles";
import { useCRM } from "../ThemeContext";
import { McAvatar, McButton, McThemeToggle } from "../ui/crm";
import type { MainTabParamList } from "./types";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function AppMenuSheet({ visible, onClose }: Props) {
  const c = useCRM();
  const { user, signOut } = useAuth();
  const nav = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const ws = useMemo(() => getRoleWorkspace(user?.role), [user?.role]);
  const sections = useMemo(() => getAppMenuSections(user?.role), [user?.role]);
  const { width, height } = useWindowDimensions();
  const desktop = width >= 900;
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    onClose();
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      Alert.alert("Sign out failed", "Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  function goTab(tab: keyof MainTabParamList) {
    onClose();
    nav.navigate(tab);
  }

  function goWeb(path: string) {
    onClose();
    void Linking.openURL(`${WEB_SITE_URL}${path}`);
  }

  const displayName = user?.fullName?.trim() || user?.email?.split("@")[0] || "User";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(2, 6, 23, 0.62)",
          justifyContent: desktop ? "center" : "flex-end",
          alignItems: desktop ? "center" : "stretch",
          padding: desktop ? 24 : 0,
        }}
      >
        <View
          onStartShouldSetResponder={() => true}
          style={{
            width: desktop ? Math.min(380, width - 48) : "100%",
            maxHeight: desktop ? Math.min(640, height - 48) : Math.min(height * 0.88, 680),
            backgroundColor: c.bgElevated,
            borderRadius: desktop ? c.radiusLg : c.radiusLg,
            borderTopLeftRadius: c.radiusLg,
            borderTopRightRadius: c.radiusLg,
            borderBottomLeftRadius: desktop ? c.radiusLg : 0,
            borderBottomRightRadius: desktop ? c.radiusLg : 0,
            borderWidth: 1,
            borderColor: c.borderStrong,
            overflow: "hidden",
            alignSelf: desktop ? "center" : "stretch",
            ...c.shadowLg,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingTop: Platform.OS === "web" ? 16 : 12,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
              backgroundColor: c.panel,
            }}
          >
            {!desktop ? (
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  alignSelf: "center",
                  left: "50%",
                  marginLeft: -20,
                  width: 40,
                  height: 4,
                  borderRadius: 999,
                  backgroundColor: c.borderStrong,
                }}
              />
            ) : null}
            <View style={{ flex: 1, minWidth: 0, marginTop: desktop ? 0 : 8 }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: c.text }}>{ws.label}</Text>
              <Text style={{ marginTop: 2, fontSize: 10, fontWeight: "800", color: c.primary, letterSpacing: 1.2, textTransform: "uppercase" }}>
                {ws.headline}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Close menu"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: c.card,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <Text style={{ fontSize: 16, color: c.textSecondary, fontWeight: "700" }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {sections.map((section) => (
              <View key={section.title} style={{ marginBottom: 14 }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "800",
                    color: c.muted,
                    letterSpacing: 1.4,
                    textTransform: "uppercase",
                    marginBottom: 8,
                    paddingHorizontal: 4,
                  }}
                >
                  {section.title}
                </Text>
                {section.items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      item.kind === "tab" && item.tab ? goTab(item.tab) : item.webPath ? goWeb(item.webPath) : undefined
                    }
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderRadius: c.radiusSm,
                      marginBottom: 4,
                      backgroundColor: pressed ? c.primarySoft : c.card,
                      borderWidth: 1,
                      borderColor: c.border,
                    })}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 11,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: c.primarySoft,
                        borderWidth: 1,
                        borderColor: c.primaryGlow,
                      }}
                    >
                      <Text style={{ fontSize: 16, fontWeight: "800", color: c.primary }}>{item.glyph}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: c.text }}>{item.label}</Text>
                    <Text style={{ fontSize: 14, color: c.muted }}>{item.kind === "web" ? "↗" : "›"}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: c.borderStrong,
              padding: 12,
              paddingBottom: Platform.OS === "web" ? 18 : 14,
              backgroundColor: c.panel,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <McAvatar name={displayName} size={44} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: c.text }} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={{ fontSize: 12, color: c.muted, marginTop: 2 }} numberOfLines={1}>
                  {user?.email}
                </Text>
              </View>
              <McThemeToggle size={38} />
            </View>
            <McButton label="Sign out" variant="danger" busy={signingOut} onPress={() => void handleSignOut()} />
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

export function AppMenuButton({ onPress }: { onPress: () => void }) {
  const c = useCRM();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Open menu"
      style={({ pressed }) => ({
        marginRight: Platform.OS === "web" ? 8 : 4,
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? c.primarySoft : c.card,
        borderWidth: 1,
        borderColor: c.borderStrong,
      })}
    >
      <Text style={{ fontSize: 18, fontWeight: "800", color: c.text, lineHeight: 20 }}>☰</Text>
    </Pressable>
  );
}
