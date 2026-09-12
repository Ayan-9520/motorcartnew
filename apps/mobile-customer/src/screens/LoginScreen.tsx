import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import { WEB_SITE_URL } from "../config";
import type { ThemeColors } from "../theme";
import { useAuth } from "../auth/AuthContext";
import type { ApiError } from "../api/client";
import {
  McBrandPlate,
  McButton,
  McCard,
  McContent,
  McInput,
  McMuted,
  McSectionLabel,
  McSegmentRow,
  McThemeToggle,
  useThemedStyles,
} from "../ui/crm";
import { useCRM } from "../ThemeContext";

type AuthMode = "signin" | "signup";
type SignupKind = "customer" | "business";

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const c = useCRM();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [signupKind, setSignupKind] = useState<SignupKind>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const styles = useThemedStyles(makeStyles);

  function resetMessages() {
    setError(null);
    setInfo(null);
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    resetMessages();
  }

  async function onSignIn() {
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setError("Enter your email and password");
      return;
    }
    setBusy(true);
    resetMessages();
    try {
      await signIn(trimmed, password);
    } catch (e) {
      setError((e as ApiError)?.message ?? "Sign in failed. Check credentials and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onSignUp() {
    const trimmedEmail = email.trim();
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Enter your full name (at least 2 characters)");
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (signupKind === "business" && !companyName.trim()) {
      setError("Business name is required for dealer signup");
      return;
    }

    setBusy(true);
    resetMessages();
    try {
      const result = await signUp({
        email: trimmedEmail,
        password,
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        business_signup: signupKind === "business",
        company_name: signupKind === "business" ? companyName.trim() : undefined,
        city: city.trim() || undefined,
      });

      if (result.needsEmailConfirmation && !result.accessToken) {
        setInfo(
          "Account created. If email verification is required, verify via the link/code from Motorcart, then sign in. On local Docker with autoconfirm, sign in immediately."
        );
        setMode("signin");
        return;
      }

      if (signupKind === "business" && result.user) {
        setInfo("Business account submitted. Admin approval may be required — you can still explore the app.");
      }
    } catch (e) {
      setError((e as ApiError)?.message ?? "Sign up failed. Try again or use a different email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: c.navyDeep }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />
      <View style={styles.topBar}>
        <McThemeToggle />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <McContent style={styles.inner}>
          <View style={[styles.layout, desktop && styles.layoutDesktop]}>
            <View style={[styles.brandPane, desktop && styles.brandPaneDesktop]}>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.livePillText}>Live · Motorcart OS</Text>
              </View>
              <McBrandPlate variant="full" height={desktop ? 52 : 44} tone="dark" framed={false} />
              <Text style={styles.brandTitle}>Motorcart</Text>
              <Text style={styles.brandSub}>
                Premium automotive CRM for buyers, dealers, finance &amp; service — same APIs as Motorcart.in.
              </Text>
              <View style={styles.trustRow}>
                {["Secure JWT", "Role desks", "Live leads"].map((t) => (
                  <View key={t} style={styles.trustChip}>
                    <Text style={styles.trustChipText}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>

            <McCard style={[styles.form, desktop && styles.formDesktop]}>
              <McSegmentRow
                options={["signin", "signup"] as const}
                value={mode}
                onChange={switchMode}
                labels={{ signin: "Sign in", signup: "Sign up" }}
              />

              {mode === "signin" ? (
                <>
                  <McSectionLabel>Welcome back</McSectionLabel>
                  <Text style={styles.title}>Sign in to Motorcart</Text>
                  <McMuted>Use your Motorcart account email and password (same as motorcart.in).</McMuted>
                  <View style={{ height: 14 }} />
                  <McInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      resetMessages();
                    }}
                    placeholder="Email"
                  />
                  <McInput
                    secureTextEntry
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      resetMessages();
                    }}
                    placeholder="Password"
                    onSubmitEditing={() => void onSignIn()}
                  />
                  {error ? <Text style={styles.error}>{error}</Text> : null}
                  {info ? <Text style={styles.info}>{info}</Text> : null}
                  <McButton label="Sign in" busy={busy} onPress={() => void onSignIn()} />
                  <Pressable onPress={() => switchMode("signup")} style={styles.switchLink}>
                    <Text style={styles.switchLinkText}>
                      New here? <Text style={styles.switchLinkAccent}>Create an account</Text>
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void Linking.openURL(`${WEB_SITE_URL}/login`)}
                    style={styles.forgotLink}
                  >
                    <Text style={styles.forgotText}>Forgot password? Reset on motorcart.in</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <McSectionLabel>Create account</McSectionLabel>
                  <Text style={styles.title}>Join Motorcart</Text>
                  <McMuted>Customer accounts are instant. Business accounts may need approval.</McMuted>
                  <View style={{ height: 12 }} />
                  <McSegmentRow
                    options={["customer", "business"] as const}
                    value={signupKind}
                    onChange={(v) => {
                      setSignupKind(v);
                      resetMessages();
                    }}
                    labels={{ customer: "Customer", business: "Business" }}
                  />
                  <View style={{ height: 12 }} />
                  <McInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Full name"
                    autoCapitalize="words"
                  />
                  <McInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                  />
                  <McInput
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Mobile (optional)"
                  />
                  {signupKind === "business" ? (
                    <>
                      <McInput value={companyName} onChangeText={setCompanyName} placeholder="Business / company name" />
                      <McInput value={city} onChangeText={setCity} placeholder="City (optional)" />
                    </>
                  ) : null}
                  <McInput secureTextEntry value={password} onChangeText={setPassword} placeholder="Password (min 6)" />
                  <McInput
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm password"
                    onSubmitEditing={() => void onSignUp()}
                  />
                  {error ? <Text style={styles.error}>{error}</Text> : null}
                  {info ? <Text style={styles.info}>{info}</Text> : null}
                  <McButton label="Create account" busy={busy} onPress={() => void onSignUp()} />
                  <Pressable onPress={() => switchMode("signin")} style={styles.switchLink}>
                    <Text style={styles.switchLinkText}>
                      Already have an account? <Text style={styles.switchLinkAccent}>Sign in</Text>
                    </Text>
                  </Pressable>
                </>
              )}

              <View style={styles.legalRow}>
                <Pressable onPress={() => void Linking.openURL(`${WEB_SITE_URL}/privacy`)}>
                  <Text style={styles.legalLink}>Privacy</Text>
                </Pressable>
                <Text style={styles.legalSep}>·</Text>
                <Pressable onPress={() => void Linking.openURL(`${WEB_SITE_URL}/terms`)}>
                  <Text style={styles.legalLink}>Terms</Text>
                </Pressable>
                <Text style={styles.legalSep}>·</Text>
                <Pressable onPress={() => void Linking.openURL(WEB_SITE_URL)}>
                  <Text style={styles.legalLink}>motorcart.in</Text>
                </Pressable>
              </View>
              <Text style={styles.legalHint}>
                By continuing you agree to Motorcart Privacy Policy and Terms on motorcart.in.
              </Text>
            </McCard>
          </View>
        </McContent>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    glowTop: {
      position: "absolute",
      top: -80,
      left: -40,
      width: 280,
      height: 280,
      borderRadius: 999,
      backgroundColor: "rgba(37, 211, 102, 0.16)",
    },
    glowBottom: {
      position: "absolute",
      bottom: -100,
      right: -60,
      width: 260,
      height: 260,
      borderRadius: 999,
      backgroundColor: "rgba(59, 130, 246, 0.12)",
    },
    topBar: {
      position: "absolute",
      top: Platform.OS === "web" ? 12 : 8,
      right: 16,
      zIndex: 20,
    },
    scroll: { flexGrow: 1, justifyContent: "center", minHeight: "100%" as unknown as number },
    inner: { padding: 20, paddingTop: Platform.OS === "web" ? 48 : 36, paddingBottom: 36, width: "100%" },
    layout: { gap: 18, width: "100%" },
    layoutDesktop: { flexDirection: "row", alignItems: "stretch", gap: 36, minHeight: 520 },
    brandPane: { marginBottom: 4 },
    brandPaneDesktop: { flex: 1.15, justifyContent: "center", paddingRight: 16, paddingLeft: 8 },
    formDesktop: { flex: 1, maxWidth: 460, alignSelf: "center", width: "100%" },
    livePill: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 14,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: "rgba(37, 211, 102, 0.12)",
      borderWidth: 1,
      borderColor: "rgba(37, 211, 102, 0.35)",
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: c.primary,
    },
    livePillText: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: c.primary,
      textTransform: "uppercase",
    },
    brandTitle: {
      marginTop: 16,
      fontSize: 32,
      fontWeight: "800",
      color: "#ffffff",
      letterSpacing: -0.8,
    },
    brandSub: { marginTop: 10, fontSize: 15, lineHeight: 22, color: "rgba(226, 232, 240, 0.78)", maxWidth: 420 },
    trustRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
    legalRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 18,
    },
    legalLink: { fontSize: 13, fontWeight: "700", color: c.primary },
    legalSep: { fontSize: 13, color: c.muted },
    legalHint: {
      marginTop: 8,
      fontSize: 11,
      lineHeight: 16,
      color: c.muted,
      textAlign: "center",
    },
    trustChip: {
      borderWidth: 1,
      borderColor: "rgba(37, 211, 102, 0.28)",
      backgroundColor: "rgba(15, 23, 42, 0.45)",
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    trustChipText: { fontSize: 12, fontWeight: "700", color: "#e2e8f0" },
    form: { borderColor: c.borderStrong, gap: 0, ...c.shadowLg },
    title: { fontSize: 20, fontWeight: "800", color: c.text, marginBottom: 4, marginTop: 14, letterSpacing: -0.3 },
    error: { color: c.danger, marginBottom: 8, fontSize: 13, fontWeight: "600" },
    info: { color: c.primary, marginBottom: 8, fontSize: 13, fontWeight: "600", lineHeight: 19 },
    switchLink: { marginTop: 14, alignItems: "center" },
    switchLinkText: { fontSize: 13, color: c.muted, fontWeight: "600" },
    switchLinkAccent: { color: c.primary, fontWeight: "800" },
    forgotLink: { marginTop: 10, alignItems: "center" },
    forgotText: { fontSize: 12, color: c.muted, fontWeight: "600" },
  });
}
