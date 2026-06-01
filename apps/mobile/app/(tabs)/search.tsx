import React, { useState, useMemo, useRef } from "react"
import {
  View,
  FlatList,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator as RNActivityIndicator,
} from "react-native"
import { Text, Menu, ActivityIndicator } from "react-native-paper"
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiRequest } from "@showtracker/api-client"
import type { TMDBShow, UserShow, SearchResponse } from "@showtracker/shared"
import {
  useAppTheme,
  STATUS_COLORS,
  StatusKey,
  STATUS_LABELS,
  SERIF,
  SANS,
  SANS_600,
  SANS_700,
  MONO,
  MONO_500,
} from "../../lib/theme"

const TMDB_W200 = "https://image.tmdb.org/t/p/w200"


function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function CollectionBadge({ status }: { status: StatusKey }) {
  const sp = STATUS_COLORS[status]
  return (
    <View style={[styles.collectionBadge, { backgroundColor: sp.light.solid }]}>
      <Text style={styles.collectionBadgeText}>✓</Text>
    </View>
  )
}

function SearchResultRow({
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
  const t = useAppTheme()
  const router = useRouter()
  const [menuVisible, setMenuVisible] = useState(false)

  const { data: showDetail } = useQuery<{ status?: string }>({
    queryKey: ["/api/shows", show.id],
    enabled: menuVisible && show.status == null,
  })

  const effectiveStatus = show.status ?? showDetail?.status
  const isEnded = effectiveStatus === "Ended" || effectiveStatus === "Canceled"
  const isReturning = effectiveStatus === "Returning Series"

  const collectionStatus = userShow?.status as StatusKey | undefined

  return (
    <TouchableOpacity
      style={[styles.resultRow, { borderBottomColor: t.border }]}
      onPress={() => router.push(`/shows/${show.id}`)}
      activeOpacity={0.7}
    >
      {/* Poster */}
      <View style={styles.posterWrap}>
        {show.poster_path ? (
          <Image
            source={{ uri: `${TMDB_W200}${show.poster_path}` }}
            style={styles.poster}
          />
        ) : (
          <View style={[styles.poster, { backgroundColor: t.surfaceAlt }]} />
        )}
        {collectionStatus && <CollectionBadge status={collectionStatus} />}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.showTitle, { color: t.fg }]} numberOfLines={2}>
          {show.name}
        </Text>
        <View style={styles.metaRow}>
          {show.first_air_date && (
            <Text style={[styles.metaText, { color: t.fgMuted }]}>
              {show.first_air_date.slice(0, 4)}
            </Text>
          )}
          {show.vote_average > 0 && (
            <>
              <View style={[styles.metaDot, { backgroundColor: t.fgFaint }]} />
              <Text style={[styles.metaText, { color: t.fgMuted }]}>
                ★ {show.vote_average.toFixed(1)}
              </Text>
            </>
          )}
          {collectionStatus && (
            <>
              <View style={[styles.metaDot, { backgroundColor: t.fgFaint }]} />
              <Text
                style={[
                  styles.metaText,
                  {
                    color: STATUS_COLORS[collectionStatus].light.fg,
                    fontFamily: MONO_500,
                  },
                ]}
              >
                In {STATUS_LABELS[collectionStatus]}
              </Text>
            </>
          )}
        </View>
        {show.overview ? (
          <Text
            style={[styles.overview, { color: t.fgMuted }]}
            numberOfLines={2}
          >
            {show.overview}
          </Text>
        ) : null}
        {!userShow && (
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={[styles.addBtn, { borderColor: t.fg }]}
                onPress={() => {
                  if (isPending) return
                  setMenuVisible(true)
                }}
                activeOpacity={0.7}
              >
                {isPending ? (
                  <RNActivityIndicator size="small" color={t.fg} />
                ) : (
                  <Text style={[styles.addBtnText, { color: t.fg }]}>
                    + Add
                  </Text>
                )}
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => {
                onAdd(show.id, "want_to_watch")
                setMenuVisible(false)
              }}
              title="Want to Watch"
            />
            <Menu.Item
              onPress={() => {
                onAdd(show.id, "watching")
                setMenuVisible(false)
              }}
              title="Watching"
            />
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
        )}
      </View>
    </TouchableOpacity>
  )
}

export default function SearchScreen() {
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 400)
  const t = useAppTheme()
  const qc = useQueryClient()
  const insets = useSafeAreaInsets()
  const inputRef = useRef<TextInput>(null)

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery<SearchResponse>({
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
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text style={[styles.title, { color: t.fg }]}>Search</Text>
      </View>

      {/* Search input */}
      <View style={styles.inputWrap}>
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: t.surface, borderColor: t.border },
          ]}
        >
          <Text style={[styles.searchIcon, { color: t.fgMuted }]}>⌕</Text>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: t.fg, fontFamily: SANS }]}
            placeholder="Search TV shows…"
            placeholderTextColor={t.fgFaint}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery("")}
              style={styles.clearBtn}
            >
              <Text style={[styles.clearBtnText, { color: t.fgMuted }]}>✕</Text>
            </TouchableOpacity>
          )}
          {isLoading && debouncedQuery.length >= 2 && (
            <ActivityIndicator size="small" color={t.fgMuted} />
          )}
        </View>
      </View>

      {/* Empty / no-query state */}
      {!debouncedQuery && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: t.fg }]}>
            Start Searching
          </Text>
          <Text style={[styles.emptyBody, { color: t.fgMuted }]}>
            Enter a TV show name to search and add to your collection.
          </Text>
        </View>
      )}

      {!isLoading && debouncedQuery.length >= 2 && results.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: t.fg }]}>No Results</Text>
          <Text style={[styles.emptyBody, { color: t.fgMuted }]}>
            Nothing found for "{debouncedQuery}".
          </Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <SearchResultRow
            show={item}
            userShow={findUserShow(item.id)}
            onAdd={(showId, status) => addMutation.mutate({ showId, status })}
            isPending={addMutation.isPending}
          />
        )}
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
  header: {
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 44,
    letterSpacing: -0.8,
    lineHeight: 44,
  },
  inputWrap: {
    paddingHorizontal: 22,
    paddingBottom: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    fontSize: 13,
  },
  emptyState: {
    padding: 24,
  },
  emptyTitle: {
    fontFamily: SERIF,
    fontSize: 24,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  emptyBody: {
    fontFamily: SANS,
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: 22,
  },
  resultRow: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    alignItems: "flex-start",
  },
  posterWrap: {
    position: "relative",
    flexShrink: 0,
  },
  poster: {
    width: 68,
    height: 102,
    borderRadius: 6,
  },
  collectionBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  collectionBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: SANS_700,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  showTitle: {
    fontFamily: SERIF,
    fontSize: 22,
    letterSpacing: -0.2,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  metaText: {
    fontFamily: MONO,
    fontSize: 11,
  },
  metaDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
  },
  overview: {
    fontFamily: SANS,
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 4,
  },
  addBtn: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 60,
    alignItems: "center",
  },
  addBtnText: {
    fontFamily: SANS_600,
    fontSize: 12.5,
  },
  loadingMore: {
    marginVertical: 16,
  },
})
