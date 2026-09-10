import React, { useMemo, useState } from "react";
import { ActivityIndicator, Platform, Text, View, useWindowDimensions } from "react-native";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../auth/AuthContext";
import { getRoleWorkspace } from "../roles";
import { useCRM, useTheme } from "../ThemeContext";
import { MotorcartLogo } from "../ui/MotorcartLogo";
import { LoginScreen } from "../screens/LoginScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { VehiclesScreen } from "../screens/VehiclesScreen";
import { WorkspaceScreen } from "../screens/WorkspaceScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { VehicleDetailScreen } from "../screens/VehicleDetailScreen";
import type { MainTabParamList, RootStackParamList } from "./types";
import { AppMenuButton, AppMenuSheet } from "./AppMenuSheet";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const TAB_GLYPH: Record<string, string> = {
  Home: "⌂",
  Browse: "◎",
  Workspace: "◫",
  Profile: "◉",
};

function TabIcon({ route, focused, color }: { route: string; focused: boolean; color: string }) {
  const c = useCRM();
  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? c.primarySoft : "transparent",
        borderWidth: focused ? 1 : 0,
        borderColor: c.primaryGlow,
      }}
    >
      <Text style={{ fontSize: 17, color, fontWeight: "700", marginTop: Platform.OS === "ios" ? -1 : 0 }}>
        {TAB_GLYPH[route] ?? "•"}
      </Text>
    </View>
  );
}

function HeaderBrand({ subtitle }: { subtitle: string }) {
  const c = useCRM();
  const { resolved } = useTheme();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginLeft: Platform.OS === "web" ? 4 : 0 }}>
      <MotorcartLogo variant="full" height={desktop ? 30 : 26} tone={resolved === "dark" ? "dark" : "light"} />
      {desktop ? (
        <Text style={{ color: c.muted, fontSize: 13, fontWeight: "700" }}>{subtitle}</Text>
      ) : (
        <View
          style={{
            backgroundColor: c.primarySoft,
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: c.primaryGlow,
          }}
        >
          <Text style={{ color: c.primary, fontSize: 9, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" }}>
            {subtitle}
          </Text>
        </View>
      )}
    </View>
  );
}

function MainTabs() {
  const { user } = useAuth();
  const ws = useMemo(() => getRoleWorkspace(user?.role), [user?.role]);
  const c = useCRM();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <Tabs.Navigator
        screenOptions={({ route }) => {
          const titles: Record<string, string> = {
            Home: ws.tabs.home,
            Browse: ws.tabs.browse,
            Workspace: ws.tabs.workspace,
            Profile: ws.tabs.profile,
          };
          const subtitle = titles[route.name] ?? "Motorcart";
          return {
            title: subtitle,
            sceneStyle: { flex: 1, backgroundColor: c.bg, minHeight: 0 },
            headerStyle: {
              backgroundColor: c.header,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
              ...(Platform.OS === "web" ? ({ height: desktop ? 64 : 58 } as object) : null),
            },
            headerShadowVisible: false,
            headerTintColor: c.text,
            headerTitleAlign: "left" as const,
            headerTitle: () => <HeaderBrand subtitle={subtitle} />,
            headerRight: () => <AppMenuButton onPress={() => setMenuOpen(true)} />,
            tabBarIcon: ({ focused, color }) => <TabIcon route={route.name} focused={focused} color={color} />,
            tabBarActiveTintColor: c.primary,
            tabBarInactiveTintColor: c.muted,
            tabBarStyle: {
              backgroundColor: c.tabBar,
              borderTopWidth: 1,
              borderTopColor: c.border,
              height: Platform.OS === "web" ? 76 : 64,
              paddingBottom: Platform.OS === "web" ? 16 : Platform.OS === "ios" ? 12 : 10,
              paddingTop: 8,
              width: "100%",
              ...c.shadowLg,
            },
            tabBarLabelStyle: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3, marginTop: 2 },
            tabBarItemStyle: { flex: 1, paddingVertical: 2 },
          };
        }}
      >
        <Tabs.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: ws.tabs.home }} />
        <Tabs.Screen name="Browse" component={VehiclesScreen} options={{ tabBarLabel: ws.tabs.browse }} />
        <Tabs.Screen name="Workspace" component={WorkspaceScreen} options={{ tabBarLabel: ws.tabs.workspace }} />
        <Tabs.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: ws.tabs.profile }} />
      </Tabs.Navigator>
      <AppMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();
  const c = useCRM();
  const { resolved } = useTheme();

  const navTheme = useMemo(() => {
    const base = resolved === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: c.primary,
        background: c.bg,
        card: c.header,
        text: c.text,
        border: c.border,
        notification: c.primary,
      },
    };
  }, [c, resolved]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg }}>
        <MotorcartLogo variant="full" height={44} tone={resolved === "dark" ? "dark" : "light"} />
        <ActivityIndicator size="large" color={c.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <View style={[{ flex: 1, minHeight: 0 }, Platform.OS === "web" ? ({ height: "100%" } as object) : null]}>
      <NavigationContainer
        theme={navTheme}
        documentTitle={{
          formatter: (options) => {
            const section = options?.title?.trim();
            if (section && section !== "Motorcart") return `Motorcart · ${section}`;
            return "Motorcart";
          },
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg, flex: 1 } }}>
          {user ? (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen
                name="VehicleDetail"
                component={VehicleDetailScreen}
                options={{ animation: "slide_from_right" }}
              />
            </>
          ) : (
            <Stack.Screen name="Auth" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
