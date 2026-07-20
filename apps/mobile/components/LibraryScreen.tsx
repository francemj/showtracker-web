import React from "react"
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
} from "react-native"
import { PosterGrid } from "./PosterGrid"
import { useLibraryShows } from "../lib/useLibraryShows"
import { useAppTheme, SANS, type StatusKey } from "../lib/theme"

type Props = {
  endpoint: string
  status: StatusKey
}

export function LibraryScreen({ endpoint, status }: Props) {
  const t = useAppTheme()
  const lib = useLibraryShows(endpoint)

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={styles.filterWrap}>
        <View
          style={[
            styles.filterBox,
            { backgroundColor: t.surface, borderColor: t.border },
          ]}
        >
          <Text style={[styles.filterIcon, { color: t.fgMuted }]}>⌕</Text>
          <TextInput
            style={[styles.filterInput, { color: t.fg }]}
            placeholder="Filter library…"
            placeholderTextColor={t.fgFaint}
            value={lib.search}
            onChangeText={lib.setSearch}
            autoCorrect={false}
          />
          {lib.search.length > 0 && (
            <TouchableOpacity
              onPress={() => lib.setSearch("")}
              style={styles.clearBtn}
            >
              <Text style={[styles.clearText, { color: t.fgMuted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <PosterGrid
        shows={lib.shows}
        isLoading={lib.isLoading}
        status={status}
        onEndReached={lib.onEndReached}
        isFetchingNextPage={lib.isFetchingNextPage}
        onRefresh={lib.refetch}
        refreshing={lib.isRefetching}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterWrap: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 4,
  },
  filterBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  filterIcon: {
    fontSize: 16,
    lineHeight: 20,
  },
  filterInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: SANS,
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearText: {
    fontSize: 12,
  },
})
