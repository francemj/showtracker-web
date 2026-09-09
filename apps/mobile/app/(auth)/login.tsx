import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native"
import { Redirect } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import { StatusBar } from "expo-status-bar"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "../../lib/auth"
import {
  useAppTheme,
  SERIF_ITALIC,
  SANS,
  SANS_600,
  SANS_700,
  MONO_600,
} from "../../lib/theme"
import { CONTENT_MAX_WIDTH, SCREEN_PADDING } from "../../lib/layout"

type Mode = "signIn" | "signUp" | "forgot"

const COPY: Record<Mode, { eyebrow: string; heading: string; blurb: string }> =
  {
    signIn: {
      eyebrow: "Welcome back",
      heading: "Pick up where you left off.",
      blurb: "Sign in to see what's next in every show you're watching.",
    },
    signUp: {
      eyebrow: "Create an account",
      heading: "Never lose your place again.",
      blurb: "Track every series, season and episode in one place.",
    },
    forgot: {
      eyebrow: "Reset password",
      heading: "Let's get you back in.",
      blurb: "We'll email you a link. It works once and expires in an hour.",
    },
  }

export default function LoginScreen() {
  const t = useAppTheme()
  const insets = useSafeAreaInsets()
  const {
    user,
    isLoading,
    signIn,
    signUp,
    signInWithPasskey,
    requestPasswordReset,
    passkeysSupported,
    hasLocalPasskey,
  } = useAuth()

  const [mode, setMode] = useState<Mode>("signIn")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [pending, setPending] = useState<null | "form" | "passkey">(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (user) return <Redirect href="/(tabs)" />

  const copy = COPY[mode]
  const busy = pending !== null

  const switchTo = (next: Mode) => {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  const submit = async () => {
    setError(null)
    setNotice(null)
    setPending("form")
    try {
      if (mode === "signIn") {
        await signIn(email.trim(), password)
      } else if (mode === "signUp") {
        await signUp(email.trim(), password, name.trim() || undefined)
      } else {
        await requestPasswordReset(email.trim())
        setNotice("If that account exists, a reset link is on its way.")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.")
    } finally {
      setPending(null)
    }
  }

  const usePasskey = async () => {
    setError(null)
    setNotice(null)
    setPending("passkey")
    try {
      await signInWithPasskey()
    } catch (e) {
      // Dismissing the system sheet is a deliberate "not now", and on Android
      // the back gesture makes it a routine one — so it stays silent.
      const message = e instanceof Error ? e.message : ""
      if (/cancel|abort|UserCancelled|NotAllowed/i.test(message)) return
      setError(message || "That passkey didn't work.")
    } finally {
      setPending(null)
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    )
  }

  const canSubmit =
    email.trim().length > 0 && (mode === "forgot" || password.length >= 8)

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Same recipe as the Home hero: dark artwork up top fading into the
              themed surface the content sits on. */}
          <View style={[styles.band, { paddingTop: insets.top + 28 }]}>
            <LinearGradient
              colors={["#0d3d28", "#121a17", "#0E0F12"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={["transparent", t.bg]}
              locations={[0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.bandInner}>
              <Text style={styles.wordmark}>SHOWTRACKER</Text>
              <Text style={styles.bandTitle}>
                Every episode,{"\n"}accounted for.
              </Text>
            </View>
          </View>

          <View style={styles.form}>
            <Text style={[styles.eyebrow, { color: t.fgMuted }]}>
              {copy.eyebrow.toUpperCase()}
            </Text>
            <Text style={[styles.heading, { color: t.fg }]}>
              {copy.heading}
            </Text>
            <Text style={[styles.blurb, { color: t.fgMuted }]}>
              {copy.blurb}
            </Text>

            {mode === "signUp" && (
              <>
                <Text style={[styles.label, { color: t.fgMuted }]}>Name</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: t.fg,
                      borderColor: t.border,
                      backgroundColor: t.surface,
                    },
                  ]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Optional"
                  placeholderTextColor={t.fgFaint}
                  editable={!busy}
                />
              </>
            )}

            <Text style={[styles.label, { color: t.fgMuted }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: t.fg,
                  borderColor: t.border,
                  backgroundColor: t.surface,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={t.fgFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              editable={!busy}
            />

            {mode !== "forgot" && (
              <>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: t.fgMuted }]}>
                    Password
                  </Text>
                  {mode === "signIn" && (
                    <TouchableOpacity onPress={() => switchTo("forgot")}>
                      <Text style={[styles.inlineLink, { color: t.fgMuted }]}>
                        Forgot?
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: t.fg,
                      borderColor: t.border,
                      backgroundColor: t.surface,
                    },
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor={t.fgFaint}
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType={
                    mode === "signIn" ? "password" : "newPassword"
                  }
                  editable={!busy}
                />
              </>
            )}

            {error && (
              <Text style={[styles.message, { color: "#e06060" }]}>
                {error}
              </Text>
            )}
            {notice && (
              <Text style={[styles.message, { color: t.fg }]}>{notice}</Text>
            )}

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: t.accent },
                (!canSubmit || busy) && styles.btnDisabled,
              ]}
              onPress={submit}
              disabled={!canSubmit || busy}
              activeOpacity={0.85}
            >
              {pending === "form" ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {mode === "signIn"
                    ? "Sign in"
                    : mode === "signUp"
                      ? "Create account"
                      : "Email me a link"}
                </Text>
              )}
            </TouchableOpacity>

            {mode === "signIn" && passkeysSupported && (
              <>
                <View style={styles.dividerRow}>
                  <View style={[styles.rule, { backgroundColor: t.border }]} />
                  <Text style={[styles.dividerText, { color: t.fgFaint }]}>
                    OR
                  </Text>
                  <View style={[styles.rule, { backgroundColor: t.border }]} />
                </View>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: t.border }]}
                  onPress={usePasskey}
                  disabled={busy}
                  activeOpacity={0.85}
                >
                  {pending === "passkey" ? (
                    <ActivityIndicator size="small" color={t.fg} />
                  ) : (
                    <>
                      <Ionicons
                        name="finger-print"
                        size={17}
                        color={t.fg}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={[styles.secondaryBtnText, { color: t.fg }]}>
                        {hasLocalPasskey
                          ? "Sign in with Face ID"
                          : "Use a passkey"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.switchRow}
              onPress={() =>
                switchTo(
                  mode === "signUp"
                    ? "signIn"
                    : mode === "forgot"
                      ? "signIn"
                      : "signUp"
                )
              }
            >
              <Text style={[styles.switchText, { color: t.fgMuted }]}>
                {mode === "signIn" ? "New here? " : ""}
                <Text style={[styles.switchLink, { color: t.fg }]}>
                  {mode === "signIn"
                    ? "Create an account"
                    : mode === "signUp"
                      ? "Already have an account? Sign in"
                      : "Back to sign in"}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { flexGrow: 1, paddingBottom: 48 },
  band: { paddingBottom: 44, overflow: "hidden" },
  bandInner: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: SCREEN_PADDING,
  },
  wordmark: {
    fontFamily: MONO_600,
    fontSize: 11,
    letterSpacing: 2,
    color: "#6de0b0",
  },
  bandTitle: {
    fontFamily: SERIF_ITALIC,
    fontSize: 38,
    lineHeight: 40,
    color: "#F4F4F0",
    marginTop: 14,
  },
  form: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
  },
  eyebrow: { fontFamily: MONO_600, fontSize: 11, letterSpacing: 1.6 },
  heading: {
    fontFamily: SERIF_ITALIC,
    fontSize: 34,
    lineHeight: 36,
    marginTop: 8,
  },
  blurb: { fontFamily: SANS, fontSize: 14, lineHeight: 21, marginTop: 10 },
  label: { fontFamily: SANS_600, fontSize: 12, marginTop: 20, marginBottom: 7 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  inlineLink: { fontFamily: SANS, fontSize: 12, marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: SANS,
    fontSize: 15,
  },
  message: { fontFamily: SANS, fontSize: 13, lineHeight: 19, marginTop: 14 },
  primaryBtn: {
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  primaryBtnText: { fontFamily: SANS_700, fontSize: 15, color: "#fff" },
  btnDisabled: { opacity: 0.5 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  rule: { flex: 1, height: 1 },
  dividerText: { fontFamily: MONO_600, fontSize: 10, letterSpacing: 1.6 },
  secondaryBtn: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { fontFamily: SANS_600, fontSize: 15 },
  switchRow: { marginTop: 28, alignItems: "center" },
  switchText: { fontFamily: SANS, fontSize: 13 },
  switchLink: { fontFamily: SANS_600, fontSize: 13 },
})
