import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import type { ThemeColors } from "../theme";
import { useCRM, useTheme } from "../ThemeContext";
import { MotorcartLogo } from "./MotorcartLogo";

const webFill = Platform.OS === "web" ? ({ minHeight: 0, height: "100%" } as object) : null;

export function McScreen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useCRM();
  return (
    <View style={[{ flex: 1, backgroundColor: c.bg, width: "100%", minHeight: 0, overflow: "hidden" }, webFill, style]}>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: c.primary,
          opacity: 0.85,
        }}
      />
      {children}
    </View>
  );
}

export function McContent({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useCRM();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  return (
    <View style={[{ flex: 1, width: "100%", minHeight: 0, alignSelf: "stretch" }, wide && { alignItems: "center" }, webFill]}>
      <View
        style={[
          { flex: 1, width: "100%", minHeight: 0, maxWidth: "100%" },
          wide && { maxWidth: c.maxContent, width: "100%" },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export function mcListStyle(extra?: StyleProp<ViewStyle>): StyleProp<ViewStyle> {
  return [{ flex: 1, width: "100%", minHeight: 0 }, webFill, extra];
}

export function McBrandPlate({
  variant = "full",
  height,
  tone = "auto",
  framed = false,
}: {
  variant?: "full" | "icon";
  height?: number;
  tone?: "dark" | "light" | "auto";
  /** Never default to a white plate — website logos sit on the surface directly. */
  framed?: boolean;
}) {
  const c = useCRM();
  const { resolved } = useTheme();
  const h = height ?? (variant === "full" ? 40 : 32);
  const mark = <MotorcartLogo variant={variant} height={h} tone={tone} />;
  if (!framed) return mark;
  return (
    <View
      style={{
        backgroundColor: resolved === "dark" ? c.bgElevated : c.plate,
        borderRadius: variant === "icon" ? c.radiusXs : c.radiusSm,
        paddingHorizontal: variant === "icon" ? 8 : 12,
        paddingVertical: variant === "icon" ? 8 : 8,
        alignSelf: "flex-start",
        borderWidth: 1,
        borderColor: c.border,
        ...c.shadowSm,
      }}
    >
      {mark}
    </View>
  );
}

export function McCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useCRM();
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderRadius: c.radius,
          padding: 20,
          borderWidth: 1,
          borderColor: c.border,
          ...c.shadowSm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function McTitle({ children, size = "lg" }: { children: React.ReactNode; size?: "md" | "lg" }) {
  const c = useCRM();
  const { width } = useWindowDimensions();
  const compact = width < 400;
  return (
    <Text
      style={{
        fontSize: size === "md" ? (compact ? 20 : 22) : compact ? 24 : 28,
        fontWeight: "800",
        color: c.text,
        letterSpacing: -0.7,
        lineHeight: compact ? 30 : 34,
      }}
    >
      {children}
    </Text>
  );
}

export function McMuted({ children }: { children: React.ReactNode }) {
  const c = useCRM();
  return <Text style={{ fontSize: 14, color: c.muted, lineHeight: 21 }}>{children}</Text>;
}

export function McBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "primary" | "success" | "danger" | "warning";
}) {
  const c = useCRM();
  const tones = {
    neutral: { bg: c.bgElevated, fg: c.textSecondary, border: c.borderStrong },
    primary: { bg: c.primarySoft, fg: c.primary, border: c.primaryGlow },
    success: { bg: "rgba(37,211,102,0.14)", fg: c.primary, border: c.primaryGlow },
    danger: { bg: "rgba(239,68,68,0.1)", fg: c.danger, border: "rgba(239,68,68,0.25)" },
    warning: { bg: "rgba(245,158,11,0.12)", fg: c.warning, border: "rgba(245,158,11,0.25)" },
  }[tone];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: tones.bg,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: tones.border,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "800", color: tones.fg, letterSpacing: 0.6, textTransform: "uppercase" }}>
        {label}
      </Text>
    </View>
  );
}

export function McAvatar({ name, size = 44 }: { name: string; size?: number }) {
  const c = useCRM();
  const letter = (name.trim().charAt(0) || "?").toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.primarySoft,
        borderWidth: 1.5,
        borderColor: c.primaryGlow,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.38, fontWeight: "800", color: c.primary }}>{letter}</Text>
    </View>
  );
}

export function McButton({
  label,
  onPress,
  busy,
  variant = "primary",
  compact,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  variant?: "primary" | "outline" | "danger" | "ghost";
  compact?: boolean;
}) {
  const c = useCRM();
  const base = {
    borderRadius: c.radiusSm,
    paddingVertical: compact ? 10 : 14,
    paddingHorizontal: compact ? 14 : 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    minHeight: compact ? 42 : 50,
    width: "100%" as const,
    alignSelf: "stretch" as const,
  };
  const variants: Record<string, object> = {
    primary: { backgroundColor: c.primary, ...c.shadowSm },
    outline: { borderWidth: 1.5, borderColor: c.primary, backgroundColor: c.primarySoft },
    danger: { borderWidth: 1, borderColor: c.danger, backgroundColor: "rgba(239,68,68,0.06)" },
    ghost: { backgroundColor: "transparent" },
  };
  const labelColor =
    variant === "primary" ? c.primaryOn : variant === "danger" ? c.danger : variant === "ghost" ? c.textSecondary : c.primary;

  return (
    <Pressable
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [base, variants[variant], pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] }]}
    >
      {busy ? (
        <ActivityIndicator color={variant === "primary" ? c.primaryOn : c.primary} />
      ) : (
        <Text style={{ fontWeight: "800", fontSize: compact ? 13 : 15, color: labelColor, letterSpacing: 0.1 }}>{label}</Text>
      )}
    </Pressable>
  );
}

export function McIconButton({
  label,
  onPress,
  variant = "outline",
}: {
  label: string;
  onPress: () => void;
  variant?: "outline" | "primary" | "wa";
}) {
  const c = useCRM();
  const styles = {
    outline: { bg: c.bgElevated, border: c.borderStrong, fg: c.textSecondary },
    primary: { bg: c.primary, border: c.primary, fg: c.primaryOn },
    wa: { bg: c.primarySoft, border: c.primaryGlow, fg: c.primary },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          minHeight: 40,
          borderRadius: c.radiusXs,
          borderWidth: 1,
          borderColor: styles.border,
          backgroundColor: styles.bg,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 12,
        },
        pressed && { opacity: 0.9 },
      ]}
    >
      <Text style={{ fontWeight: "800", fontSize: 12, color: styles.fg }}>{label}</Text>
    </Pressable>
  );
}

export function McInput(props: TextInputProps) {
  const c = useCRM();
  return (
    <TextInput
      {...props}
      placeholderTextColor={c.muted}
      style={[
        {
          borderWidth: 1,
          borderColor: c.borderStrong,
          backgroundColor: c.bgElevated,
          borderRadius: c.radiusSm,
          paddingHorizontal: 16,
          paddingVertical: 13,
          color: c.text,
          fontSize: 15,
          marginBottom: 10,
          width: "100%",
        },
        props.style,
      ]}
    />
  );
}

export function McSkeleton({
  height = 16,
  width = "100%" as const,
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useCRM();
  return (
    <View
      style={[
        {
          height,
          width,
          borderRadius: 8,
          backgroundColor: c.borderStrong,
          opacity: 0.5,
        },
        style,
      ]}
    />
  );
}

export function McStatSkeleton({ accent }: { accent?: boolean }) {
  const c = useCRM();
  const { width } = useWindowDimensions();
  const compact = width < 480;
  return (
    <View
      style={{
        flex: 1,
        minWidth: compact ? 0 : 140,
        backgroundColor: accent ? c.primarySoft : c.card,
        borderRadius: c.radiusSm,
        padding: compact ? 14 : 16,
        borderWidth: 1,
        borderColor: accent ? c.primaryGlow : c.border,
        gap: 10,
      }}
    >
      <McSkeleton height={10} width="55%" />
      <McSkeleton height={28} width="35%" />
    </View>
  );
}

export function McVehicleCardSkeleton() {
  const c = useCRM();
  return (
    <View
      style={{
        backgroundColor: c.card,
        borderRadius: c.radius,
        overflow: "hidden",
        marginBottom: 14,
        borderWidth: 1,
        borderColor: c.border,
        width: "100%",
      }}
    >
      <McSkeleton height={160} width="100%" style={{ borderRadius: 0 }} />
      <View style={{ padding: 14, gap: 8 }}>
        <McSkeleton height={16} width="72%" />
        <McSkeleton height={12} width="48%" />
        <McSkeleton height={18} width="40%" />
      </View>
    </View>
  );
}

export function McBootSplash({ message }: { message?: string }) {
  const c = useCRM();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.bg,
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
      }}
    >
      <View style={{ alignItems: "center", gap: 20, maxWidth: 320, width: "100%" }}>
        <McBrandPlate variant="full" height={52} tone="auto" framed={false} />
        <ActivityIndicator size="large" color={c.primary} />
        {message ? (
          <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: "600", textAlign: "center" }}>{message}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function McStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  const c = useCRM();
  const { width } = useWindowDimensions();
  const compact = width < 480;
  return (
    <View
      style={{
        flex: 1,
        minWidth: compact ? 0 : 140,
        backgroundColor: accent ? c.primarySoft : c.card,
        borderRadius: c.radiusSm,
        padding: compact ? 14 : 16,
        borderWidth: 1,
        borderColor: accent ? c.primaryGlow : c.border,
        ...c.shadowSm,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "800", color: c.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>
        {label}
      </Text>
      <Text
        style={{
          marginTop: 8,
          fontSize: 26,
          fontWeight: "800",
          color: accent ? c.primary : c.text,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      {sub ? <Text style={{ marginTop: 4, fontSize: 11, color: c.muted }}>{sub}</Text> : null}
    </View>
  );
}

export function McChip({
  label,
  active,
  onPress,
  variant = "tab",
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  variant?: "tab" | "filter";
}) {
  const c = useCRM();
  const isTab = variant === "tab";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: active
            ? isTab
              ? c.navy
              : c.primarySoft
            : c.card,
          borderRadius: 999,
          paddingHorizontal: 16,
          height: 38,
          marginRight: 8,
          borderWidth: 1,
          borderColor: active ? (isTab ? c.navy : c.primaryGlow) : c.border,
          alignSelf: "center",
          justifyContent: "center",
          flexGrow: 0,
          flexShrink: 0,
          ...(active && isTab ? c.shadowSm : {}),
        },
        !active && c.shadowSm,
        pressed && { opacity: 0.92 },
      ]}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: active ? (isTab ? "#ffffff" : c.primary) : c.textSecondary,
          letterSpacing: 0.1,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function McSegmentRow<T extends string>({
  options,
  value,
  onChange,
  disabled,
  labels,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  labels?: Partial<Record<T, string>>;
}) {
  const c = useCRM();
  const { width } = useWindowDimensions();
  const compact = width < 420;
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: c.bgElevated,
        borderRadius: c.radiusSm,
        padding: 4,
        borderWidth: 1,
        borderColor: c.border,
        gap: 3,
      }}
    >
      {options.map((opt) => {
        const on = value === opt;
        const text = labels?.[opt] ?? opt;
        return (
          <Pressable
            key={opt}
            disabled={disabled}
            onPress={() => onChange(opt)}
            style={{
              flex: 1,
              minHeight: compact ? 32 : 34,
              borderRadius: c.radiusXs,
              backgroundColor: on ? c.primary : "transparent",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: compact ? 2 : 6,
            }}
          >
            <Text
              style={{
                fontSize: compact ? 9 : 11,
                fontWeight: "800",
                color: on ? c.primaryOn : c.muted,
                textTransform: "capitalize",
              }}
              numberOfLines={1}
            >
              {text}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function McRow({
  title,
  subtitle,
  onPress,
  right,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const c = useCRM();
  const body = (
    <>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontWeight: "700", color: c.text, fontSize: 15 }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ marginTop: 3, fontSize: 12, color: c.muted }} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </>
  );
  const wrap = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    backgroundColor: c.card,
    borderRadius: c.radiusSm,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.border,
    width: "100%" as const,
    ...c.shadowSm,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={wrap}>
        {body}
      </Pressable>
    );
  }
  return <View style={wrap}>{body}</View>;
}

export function McSectionLabel({ children }: { children: React.ReactNode }) {
  const c = useCRM();
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: "800",
        color: c.primary,
        letterSpacing: 1.6,
        textTransform: "uppercase",
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

export function McHero({
  eyebrow,
  title,
  body,
  right,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  right?: React.ReactNode;
}) {
  const c = useCRM();
  const { resolved } = useTheme();
  const dark = resolved === "dark";
  return (
    <View
      style={{
        marginBottom: 16,
        padding: 18,
        borderRadius: c.radius,
        backgroundColor: dark ? "#0f1c24" : c.panel,
        borderWidth: 1,
        borderColor: dark ? "rgba(37, 211, 102, 0.22)" : c.borderStrong,
        ...c.shadowSm,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          borderTopLeftRadius: c.radius,
          borderTopRightRadius: c.radius,
          backgroundColor: c.primary,
          opacity: 0.9,
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 10, fontWeight: "800", color: c.primary, letterSpacing: 1.4, textTransform: "uppercase" }}>
            {eyebrow}
          </Text>
          <Text style={{ marginTop: 6, fontSize: 20, fontWeight: "800", color: c.text, letterSpacing: -0.5 }}>{title}</Text>
          {body ? <Text style={{ marginTop: 8, fontSize: 13, color: c.muted, lineHeight: 19 }} numberOfLines={2}>{body}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

/** Single tap — toggles light ↔ dark (real app pattern). */
export function McThemeToggle({ size = 42 }: { size?: number }) {
  const c = useCRM();
  const { resolved, toggle } = useTheme();
  const toDark = resolved === "light";
  return (
    <Pressable
      onPress={toggle}
      accessibilityLabel={toDark ? "Switch to dark mode" : "Switch to light mode"}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.primarySoft,
          borderWidth: 1,
          borderColor: c.primaryGlow,
        },
        pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
      ]}
    >
      <Text style={{ fontSize: size * 0.42, lineHeight: size * 0.48 }}>{toDark ? "☾" : "☀"}</Text>
    </Pressable>
  );
}

export function McSettingsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const c = useCRM();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "800",
          color: c.muted,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          marginBottom: 8,
          paddingHorizontal: 4,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: c.card,
          borderRadius: c.radius,
          borderWidth: 1,
          borderColor: c.border,
          overflow: "hidden",
          ...c.shadowSm,
        }}
      >
        {children}
      </View>
    </View>
  );
}

export function McSettingsRow({
  label,
  hint,
  value,
  onPress,
  right,
  danger,
  last,
}: {
  label: string;
  hint?: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  last?: boolean;
}) {
  const c = useCRM();
  const inner = (
    <>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: danger ? c.danger : c.text }}>{label}</Text>
        {hint ? <Text style={{ marginTop: 2, fontSize: 12, color: c.muted }}>{hint}</Text> : null}
        {value ? (
          <Text style={{ marginTop: 4, fontSize: 14, color: c.textSecondary, fontWeight: "600" }} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Text style={{ color: c.muted, fontSize: 18, fontWeight: "600" }}>›</Text> : null)}
    </>
  );
  const rowStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: last ? 0 : 1,
    borderBottomColor: c.border,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [rowStyle, pressed && { backgroundColor: c.bgElevated }]}>
        {inner}
      </Pressable>
    );
  }
  return <View style={rowStyle}>{inner}</View>;
}

export function McSettingsField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  last,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  last?: boolean;
  editable?: boolean;
}) {
  const c = useCRM();
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "700", color: c.muted, marginBottom: 6, letterSpacing: 0.3 }}>{label}</Text>
      <TextInput
        editable={editable}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: editable ? c.text : c.muted,
          paddingVertical: 4,
          width: "100%",
        }}
      />
    </View>
  );
}

export function useThemedStyles<T>(factory: (c: ThemeColors) => T): T {
  const c = useCRM();
  return useMemo(() => factory(c), [c]);
}

export type DemoAccount = { role: string; email: string; password: string };

const DEMO_ROLE_TINT: Record<string, string> = {
  Customer: "#3b82f6",
  Dealer: "#25D366",
  "New car": "#6366f1",
  "Finance mgr": "#a855f7",
  DSA: "#ec4899",
  Service: "#f59e0b",
  Parts: "#14b8a6",
  Broker: "#f97316",
  Auction: "#ef4444",
  "Super Admin": "#64748b",
};

export function McDemoAccountPicker({
  accounts,
  selectedEmail,
  onSelect,
}: {
  accounts: DemoAccount[];
  selectedEmail?: string;
  onSelect: (account: DemoAccount) => void;
}) {
  const c = useCRM();
  const { width, height } = useWindowDimensions();
  const desktop = width >= 720;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = accounts.find((a) => a.email === selectedEmail);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => a.role.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  }, [accounts, query]);

  function pick(account: DemoAccount) {
    onSelect(account);
    setOpen(false);
    setQuery("");
  }

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <View
        style={{
          marginTop: 18,
          paddingTop: 18,
          borderTopWidth: 1,
          borderTopColor: c.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: c.primarySoft,
                borderWidth: 1,
                borderColor: c.primaryGlow,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 13 }}>⚡</Text>
            </View>
            <View>
              <Text style={{ fontSize: 13, fontWeight: "800", color: c.text, letterSpacing: -0.2 }}>Quick demo access</Text>
              <Text style={{ marginTop: 1, fontSize: 11, color: c.muted }}>Seed accounts for testing</Text>
            </View>
          </View>
          <McBadge label="Dev" tone="primary" />
        </View>

        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderWidth: 1.5,
              borderColor: selected ? c.primaryGlow : c.borderStrong,
              backgroundColor: selected ? c.primarySoft : c.bgElevated,
              borderRadius: c.radiusSm,
              paddingHorizontal: 14,
              paddingVertical: 13,
              ...c.shadowSm,
            },
            pressed && { opacity: 0.92, transform: [{ scale: 0.995 }] },
          ]}
        >
          {selected ? (
            <>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: `${DEMO_ROLE_TINT[selected.role] ?? c.primary}22`,
                  borderWidth: 1,
                  borderColor: `${DEMO_ROLE_TINT[selected.role] ?? c.primary}44`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "800", color: DEMO_ROLE_TINT[selected.role] ?? c.primary }}>
                  {selected.role.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: c.text }} numberOfLines={1}>
                  {selected.role}
                </Text>
                <Text style={{ marginTop: 2, fontSize: 12, color: c.muted }} numberOfLines={1}>
                  {selected.email}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: c.card,
                  borderWidth: 1,
                  borderColor: c.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 18, color: c.muted }}>⌄</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: c.textSecondary }}>Choose demo role</Text>
                <Text style={{ marginTop: 2, fontSize: 12, color: c.muted }}>{accounts.length} seed accounts available</Text>
              </View>
            </>
          )}
          <Text style={{ fontSize: 18, color: c.muted, fontWeight: "600" }}>▾</Text>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable
          onPress={close}
          style={{
            flex: 1,
            backgroundColor: "rgba(2, 6, 23, 0.62)",
            justifyContent: desktop ? "center" : "flex-end",
            alignItems: "center",
            padding: desktop ? 24 : 0,
          }}
        >
          <View
            onStartShouldSetResponder={() => true}
            style={{
              width: desktop ? Math.min(440, width - 48) : "100%",
              maxHeight: desktop ? Math.min(560, height - 80) : Math.min(height * 0.78, 620),
              backgroundColor: c.card,
              borderRadius: c.radiusLg,
              borderTopLeftRadius: c.radiusLg,
              borderTopRightRadius: c.radiusLg,
              borderBottomLeftRadius: desktop ? c.radiusLg : 0,
              borderBottomRightRadius: desktop ? c.radiusLg : 0,
              borderWidth: 1,
              borderColor: c.borderStrong,
              overflow: "hidden",
              ...c.shadowLg,
            }}
          >
            <View
              style={{
                paddingHorizontal: 18,
                paddingTop: desktop ? 20 : 12,
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderBottomColor: c.border,
              }}
            >
              {!desktop ? (
                <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 999, backgroundColor: c.borderStrong, marginBottom: 14 }} />
              ) : null}
              <Text style={{ fontSize: 18, fontWeight: "800", color: c.text, letterSpacing: -0.3 }}>Demo accounts</Text>
              <Text style={{ marginTop: 4, fontSize: 13, color: c.muted }}>Tap a role to autofill credentials</Text>
              <View style={{ marginTop: 14 }}>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search role or email…"
                  placeholderTextColor={c.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    borderWidth: 1,
                    borderColor: c.borderStrong,
                    backgroundColor: c.bgElevated,
                    borderRadius: c.radiusSm,
                    paddingHorizontal: 14,
                    paddingVertical: Platform.OS === "web" ? 11 : 12,
                    color: c.text,
                    fontSize: 14,
                    width: "100%",
                  }}
                />
              </View>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: desktop ? 360 : height * 0.52 }}
              contentContainerStyle={{ padding: 12, paddingBottom: Platform.OS === "ios" ? 28 : 16 }}
            >
              {filtered.length === 0 ? (
                <Text style={{ textAlign: "center", color: c.muted, paddingVertical: 24, fontSize: 14 }}>No matching accounts</Text>
              ) : (
                filtered.map((account, index) => {
                  const tint = DEMO_ROLE_TINT[account.role] ?? c.primary;
                  const active = selectedEmail === account.email;
                  return (
                    <Pressable
                      key={account.email}
                      onPress={() => pick(account)}
                      style={({ pressed }) => [
                        {
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 11,
                          borderRadius: c.radiusSm,
                          marginBottom: index === filtered.length - 1 ? 0 : 6,
                          borderWidth: 1,
                          borderColor: active ? c.primaryGlow : "transparent",
                          backgroundColor: active ? c.primarySoft : pressed ? c.bgElevated : "transparent",
                        },
                      ]}
                    >
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 13,
                          backgroundColor: `${tint}18`,
                          borderWidth: 1,
                          borderColor: `${tint}33`,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: "800", color: tint }}>{account.role.charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 15, fontWeight: "800", color: c.text }} numberOfLines={1}>
                          {account.role}
                        </Text>
                        <Text style={{ marginTop: 2, fontSize: 12, color: c.muted }} numberOfLines={1}>
                          {account.email}
                        </Text>
                      </View>
                      {active ? <Text style={{ color: c.primary, fontWeight: "800", fontSize: 16 }}>✓</Text> : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
