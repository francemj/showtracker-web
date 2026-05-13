import React, { useState, useMemo } from "react"
import { View, FlatList, StyleSheet, Image } from "react-native"
import {
  Searchbar,
  Card,
  Text,
  Button,
  Chip,
  Menu,
  ActivityIndicator,
  useTheme,
} from "react-native-paper"
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { apiRequest } from "@showtracker/api-client"
import type { TMDBShow, UserShow } from "@showtracker/shared"

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w200"

interface SearchResponse {
  results: TMDBShow[]
  page: number
  totalPages: number
  totalResults: number
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function AddButton({
  show,
  userShow,
  onAdd,
  isPending,
}: {
  show: TMDBShow
  userShow: UserShow | undefined
  onAdd: (showId: number, status?: string) => void
  isPending: boolean
}) {
  const [menuVisible, setMenuVisible] = useState(false)

  const { data: showDetail, isLoading: detailLoading } = useQuery<{
    status?: string
  }>({
    queryKey: ["/api/shows", show.id],
    enabled: menuVisible && show.status == null,
  })

  const effectiveStatus = show.status ?? showDetail?.status
  const isEnded =
    effectiveStatus === "Ended" || effectiveStatus === "Canceled"
  const isReturning = effectiveStatus === "Returning Series"

  if (userShow) {
    return (
      <Chip icon="check" style={styles.inCollectionChip} compact>
        In Collection
      </Chip>
    )
  }

  return (
    <View style={styles.addRow}>
      <Button
        mode="outlined"
        compact
        onPress={() => onAdd(show.id)}
        loading={isPending}
        disabled={isPending}
        style={styles.addButton}
      >
        Add
      </Button>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            compact
            onPress={() => setMenuVisible(true)}
            disabled={isPending}
            style={styles.chevronButton}
          >
            ▾
          </Button>
        }
      >
        <Menu.Item
          onPress={() => {
            onAdd(show.id, "want_to_watch")
            setMenuVisible(false)
          }}
          title="Want to Watch"
        />
        {detailLoading && <Menu.Item title="Loading…" disabled />}
        {isEnded && (
          <Menu.Item
            onPress={() => {
              onAdd(show.id, "completed")
              setMenuVisible(false)
            }}
            title="Mark as Completed"
          />
        )}
        {isReturning && (
          <Menu.Item
            onPress={() => {
              onAdd(show.id, "caught_up")
              setMenuVisible(false)
            }}
            title="Mark as Caught Up"
          />
        )}
      </Menu>
    </View>
  )
}

export default function SearchScreen() {
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 400)
  const router = useRouter()
  const theme = useTheme()
  const qc = useQueryClient()

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery<SearchResponse>({
    queryKey: ["/api/search/shows", debouncedQuery],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await apiRequest(
        "GET",
        `/api/search/shows/${encodeURIComponent(debouncedQuery)}?page=${pageParam}`
      )
      return res.json()
    },
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: debouncedQuery.length >= 2,
  })

  const results = useMemo(
    () => data?.pages.flatMap((p) => p.results) ?? [],
    [data]
  )

  const { data: userShows } = useQuery<UserShow[]>({
    queryKey: ["/api/user/shows"],
  })

  const addMutation = useMutation({
    mutationFn: async ({
      showId,
      status,
    }: {
      showId: number
      status?: string
    }) => {
      await apiRequest("POST", "/api/user/shows", {
        showId,
        status: status ?? "want_to_watch",
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/user/shows"] })
      qc.invalidateQueries({ queryKey: ["/api/stats"] })
    },
  })

  const findUserShow = (showId: number) =>
    userShows?.find((us) => us.showId === showId)

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

      {!debouncedQuery && (
        <View style={styles.emptyState}>
          <Text variant="titleMedium">Start Searching</Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
          >
            Enter a TV show name to search and add to your collection.
          </Text>
        </View>
      )}

      {!isLoading &&
        debouncedQuery.length >= 2 &&
        results.length === 0 && (
          <View style={styles.emptyState}>
            <Text variant="titleMedium">No Results</Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
            >
              No shows found for "{debouncedQuery}". Try a different search
              term.
            </Text>
          </View>
        )}

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const userShow = findUserShow(item.id)
          return (
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
                  <View style={styles.badgeRow}>
                    {item.first_air_date && (
                      <Chip compact style={styles.badge}>
                        {item.first_air_date.slice(0, 4)}
                      </Chip>
                    )}
                    {item.vote_average > 0 && (
                      <Chip compact icon="star" style={styles.badge}>
                        {item.vote_average.toFixed(1)}
                      </Chip>
                    )}
                  </View>
                  {item.overview ? (
                    <Text
                      variant="bodySmall"
                      numberOfLines={2}
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {item.overview}
                    </Text>
                  ) : null}
                  <AddButton
                    show={item}
                    userShow={userShow}
                    onAdd={(showId, status) =>
                      addMutation.mutate({ showId, status })
                    }
                    isPending={addMutation.isPending}
                  />
                </View>
              </View>
            </Card>
          )
        }}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage()
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={styles.loadingMore} />
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchbar: { margin: 12 },
  emptyState: { margin: 24 },
  list: { padding: 12, gap: 8 },
  card: { overflow: "hidden" },
  cardRow: { flexDirection: "row" },
  poster: { width: 70, height: 105 },
  cardInfo: { flex: 1, padding: 10, gap: 4, minWidth: 0 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  badge: { alignSelf: "flex-start" },
  addRow: { flexDirection: "row", gap: 4, marginTop: 4 },
  addButton: { alignSelf: "flex-start" },
  chevronButton: { alignSelf: "flex-start", minWidth: 0, paddingHorizontal: 4 },
  inCollectionChip: { alignSelf: "flex-start", marginTop: 4 },
  loadingMore: { marginVertical: 16 },
})
