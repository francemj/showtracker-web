import React, { useState } from "react"
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from "react-native"
import { Text, ActivityIndicator } from "react-native-paper"
import { useRouter } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiRequest } from "@showtracker/api-client"
import { useAuth } from "../lib/auth"
import {
  useAppTheme,
  STATUS_COLORS,
  SERIF,
  SANS,
  SANS_600,
  SANS_700,
} from "../lib/theme"

export default function ProfileScreen() {
  const router = useRouter()
  const t = useAppTheme()
  const insets = useSafeAreaInsets()
  const { user, logout, refreshUser } = useAuth()
  const destructive = STATUS_COLORS.stopped.light.solid

  const [name, setName] = useState(user?.name ?? "")
  const [picture, setPicture] = useState(user?.picture ?? "")

  const updateProfile = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", "/api/user/profile", { name, picture }),
    onSuccess: () => refreshUser(),
    onError: () =>
      Alert.alert("Error", "Failed to update profile. Please try again."),
  })

  const deleteAccount = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/user"),
    onSuccess: () => logout(),
    onError: () =>
      Alert.alert("Error", "Failed to delete account. Please try again."),
  })

  const confirmDelete = () => {
    Alert.alert(
      "Delete your account?",
      "This will permanently delete your account, library, and watch history. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => deleteAccount.mutate(),
        },
      ]
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.8}
        >
          <Text style={[styles.backBtnText, { color: t.fg }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.fg }]}>Profile</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.avatarRow}>
          {picture ? (
            <Image source={{ uri: picture }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarFallback,
                { backgroundColor: t.surfaceAlt },
              ]}
            >
              <Text style={[styles.avatarFallbackText, { color: t.fgMuted }]}>
                {name?.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
          )}
          <Text style={[styles.email, { color: t.fgMuted }]}>
            {user?.email}
          </Text>
        </View>

        <Text style={[styles.label, { color: t.fgMuted }]}>Name</Text>
        <TextInput
          style={[
            styles.input,
            { color: t.fg, borderColor: t.border, backgroundColor: t.surface },
          ]}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={t.fgFaint}
        />

        <Text style={[styles.label, { color: t.fgMuted }]}>Avatar URL</Text>
        <TextInput
          style={[
            styles.input,
            { color: t.fg, borderColor: t.border, backgroundColor: t.surface },
          ]}
          value={picture}
          onChangeText={setPicture}
          placeholder="https://…"
          placeholderTextColor={t.fgFaint}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: t.accent },
            (updateProfile.isPending || !name.trim() || !picture.trim()) &&
              styles.btnDisabled,
          ]}
          onPress={() => updateProfile.mutate()}
          disabled={updateProfile.isPending || !name.trim() || !picture.trim()}
          activeOpacity={0.85}
        >
          {updateProfile.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: t.border }]}
          onPress={logout}
          activeOpacity={0.85}
        >
          <Text style={[styles.signOutBtnText, { color: t.fg }]}>Sign Out</Text>
        </TouchableOpacity>

        <View style={[styles.dangerZone, { borderColor: destructive }]}>
          <Text style={[styles.dangerTitle, { color: t.fg }]}>Danger Zone</Text>
          <Text style={[styles.dangerDescription, { color: t.fgMuted }]}>
            Permanently delete your account and all associated data, including
            your library, watch history, and ratings.
          </Text>
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: destructive }]}
            onPress={confirmDelete}
            disabled={deleteAccount.isPending}
            activeOpacity={0.85}
          >
            {deleteAccount.isPending ? (
              <ActivityIndicator size="small" color={destructive} />
            ) : (
              <Text style={[styles.deleteBtnText, { color: destructive }]}>
                Delete Account
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingBottom: 16,
    gap: 14,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontSize: 28,
    lineHeight: 28,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 32,
    letterSpacing: -0.5,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  avatarRow: {
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontFamily: SANS_700,
    fontSize: 26,
  },
  email: {
    fontFamily: SANS,
    fontSize: 13,
  },
  label: {
    fontFamily: SANS_600,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: SANS,
    fontSize: 14.5,
  },
  saveBtn: {
    marginTop: 24,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontFamily: SANS_700,
    fontSize: 14.5,
    color: "#fff",
  },
  signOutBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutBtnText: {
    fontFamily: SANS_600,
    fontSize: 14.5,
  },
  dangerZone: {
    marginTop: 32,
    marginBottom: 40,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  dangerTitle: {
    fontFamily: SANS_700,
    fontSize: 15,
    marginBottom: 6,
  },
  dangerDescription: {
    fontFamily: SANS,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  deleteBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: {
    fontFamily: SANS_700,
    fontSize: 14,
  },
})
