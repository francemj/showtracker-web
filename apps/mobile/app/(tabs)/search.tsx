import React, { useState } from "react"
import { View, FlatList, StyleSheet } from "react-native"
import { Searchbar, Card, Text, Button, useTheme } from "react-native-paper"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { apiRequest } from "@showtracker/api-client"
import type { TMDBShow } from "@showtracker/shared"
import { Image } from "react-native"

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w200"

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function SearchScreen() {
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 400)
  const router = useRouter()
  const theme = useTheme()
  const qc = useQueryClient()

  const { data, isLoading, error } = useQuery<{ results: TMDBShow[] }>({
    queryKey: [`/api/search/shows/${encodeURIComponent(debouncedQuery)}`],
    enabled: debouncedQuery.length >= 2,
  })

  const addMutation = useMutation({
    mutationFn: async (showId: number) => {
      await apiRequest("POST", "/api/user/shows", {
        showId,
        status: "want_to_watch",
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/stats"] })
    },
  })

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Searchbar
        placeholder="Search TV shows..."
        value={query}
        onChangeText={setQuery}
        style={styles.searchbar}
        loading={isLoading && debouncedQuery.length >= 2}
      />
      <FlatList
        data={data?.results ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            onPress={() => router.push(`/shows/${item.id}`)}
          >
            <View style={styles.cardRow}>
              {item.poster_path ? (
                <Image
                  source={{ uri: `${TMDB_IMAGE_BASE}${item.poster_path}` }}
                  style={styles.poster}
                />
              ) : (
                <View
                  style={[
                    styles.poster,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                />
              )}
              <View style={styles.cardInfo}>
                <Text variant="titleSmall" numberOfLines={2}>
                  {item.name}
                </Text>
                {item.first_air_date && (
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {item.first_air_date.slice(0, 4)}
                  </Text>
                )}
                {item.overview && (
                  <Text
                    variant="bodySmall"
                    numberOfLines={2}
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {item.overview}
                  </Text>
                )}
                <Button
                  mode="outlined"
                  compact
                  onPress={() => addMutation.mutate(item.id)}
                  loading={addMutation.isPending}
                  style={styles.addButton}
                >
                  Add
                </Button>
              </View>
            </View>
          </Card>
        )}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchbar: { margin: 12 },
  list: { padding: 12, gap: 8 },
  card: { overflow: "hidden" },
  cardRow: { flexDirection: "row" },
  poster: { width: 70, height: 105 },
  cardInfo: { flex: 1, padding: 10, gap: 4 },
  addButton: { alignSelf: "flex-start", marginTop: 4 },
})
