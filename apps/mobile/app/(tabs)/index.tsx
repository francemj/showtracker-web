import React from "react"
import {
  ScrollView,
  View,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
} from "react-native"
import { Text, ActivityIndicator } from "react-native-paper"
import { LinearGradient } from "expo-linear-gradient"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Image } from "react-native"
import { apiRequest } from "@showtracker/api-client"
import type { ShowWithProgress } from "@showtracker/shared"
import {
  useAppTheme,
  STATUS_COLORS,
  SERIF,
  SERIF_ITALIC,
  SANS,
  SANS_600,
  SANS_700,
  MONO,
  MONO_500,
} from "../../lib/theme"

const TMDB_W300 = "https://image.tmdb.org/t/p/w300"
const TMDB_W780 = "https://image.tmdb.org/t/p/w780"
const DASHBOARD_LIMIT = 6

type Stats = {
  totalShows: number
  watchingShows: number
  completedShows: number
  episodesWatched: number
}

type ShowsResponse = {
  shows: ShowWithProgress[]
  total: number
}

function StatusDot({ color }: { color: string }) {
  return (
    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
  )
}

function HeroSection({
  show,
  onMarkWatched,
  isPending,
}: {
  show: ShowWithProgress
  onMarkWatched: () => void
  isPending: boolean
}) {
  const t = useAppTheme()
  const insets = useSafeAreaInsets()
  const sp = STATUS_COLORS.watching
  const next = show.nextEpisode
  const backdropUri = show.backdropPath
    ? `${TMDB_W780}${show.backdropPath}`
    : show.posterPath
      ? `${TMDB_W780}${show.posterPath}`
      : null

  return (
    <View style={styles.heroContainer}>
      {backdropUri ? (
        <ImageBackground source={{ uri: backdropUri }} style={styles.heroImage} resizeMode="cover">
          <LinearGradient
            colors={["rgba(0,0,0,0.55)", "transparent", "transparent", "rgba(0,0,0,0.75)", t.bg]}
            locations={[0, 0.25, 0.4, 0.75, 1]}
            style={StyleSheet.absoluteFill}
          />
          <HeroContent show={show} next={next} sp={sp} onMarkWatched={onMarkWatched} isPending={isPending} insets={insets} t={t} />
        </ImageBackground>
      ) : (
        <View style={[styles.heroImage, { backgroundColor: t.surfaceAlt }]}>
          <HeroContent show={show} next={next} sp={sp} onMarkWatched={onMarkWatched} isPending={isPending} insets={insets} t={t} />
        </View>
      )}
    </View>
  )
}

function HeroContent({ show, next, sp, onMarkWatched, isPending, insets, t }: any) {
  const router = useRouter()
  return (
    <>
      {/* Top bar */}
      <View style={[styles.heroTopBar, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.heroLogo}>Showtracker</Text>
        <TouchableOpacity style={styles.glassButton} onPress={() => {}}>
          <Text style={{ color: "#fff", fontSize: 16 }}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom info */}
      <View style={styles.heroBottom}>
        <View style={styles.heroEyebrow}>
          <StatusDot color={sp.light.solid} />
          <Text style={styles.heroShowName}>{show.name?.toUpperCase()}</Text>
        </View>
        {next ? (
          <Text style={styles.heroEpisodeTitle} numberOfLines={2}>
            "{next.title ?? `S${next.season} · E${next.episode}`}"
          </Text>
        ) : (
          <Text style={styles.heroEpisodeTitle}>{show.name}</Text>
        )}
        <Text style={styles.heroMeta}>
          {next ? `S${next.season} · E${next.episode}` : ""}
          {show.watchedEpisodes != null && show.totalEpisodes != null
            ? `  ·  ${show.watchedEpisodes}/${show.totalEpisodes} watched`
            : ""}
        </Text>
        <View style={styles.heroActions}>
          <TouchableOpacity
            style={styles.heroMarkBtn}
            onPress={onMarkWatched}
            disabled={isPending || !next}
            activeOpacity={0.8}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.heroMarkBtnText}>✓  Mark watched</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.heroDetailsBtn}
            onPress={() => router.push(`/shows/${show.id}`)}
            activeOpacity={0.8}
          >
            <Text style={styles.heroDetailsBtnText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  )
}

function StatsRow({ stats }: { stats: Stats }) {
  const t = useAppTheme()
  const items = [
    { v: stats.totalShows, l: "Shows" },
    { v: stats.watchingShows, l: "Watching" },
    { v: stats.completedShows, l: "Done" },
    { v: stats.episodesWatched.toLocaleString(), l: "Episodes" },
  ]
  return (
    <View style={styles.statsRow}>
      {items.map((s, i) => (
        <View key={i} style={styles.statItem}>
          <Text style={[styles.statValue, { color: t.fg }]}>{s.v}</Text>
          <Text style={[styles.statLabel, { color: t.fgMuted }]}>{s.l}</Text>
        </View>
      ))}
    </View>
  )
}

function CarouselSection({
  title,
  shows,
  status,
  isLoading,
  total,
  href,
}: {
  title: string
  shows: ShowWithProgress[] | undefined
  status: "watching" | "want_to_watch" | "caught_up"
  isLoading: boolean
  total?: number
  href: string
}) {
  const t = useAppTheme()
  const router = useRouter()
  const sp = STATUS_COLORS[status]
  const solidColor = sp.light.solid

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: t.fg }]}>{title}</Text>
        {total != null && total > DASHBOARD_LIMIT && (
          <TouchableOpacity onPress={() => router.push(href as any)}>
            <Text style={[styles.seeAll, { color: solidColor }]}>See all →</Text>
          </TouchableOpacity>
        )}
      </View>
      {isLoading ? (
        <ActivityIndicator style={{ marginLeft: 22 }} color={t.fgMuted} />
      ) : shows && shows.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {shows.map((show) => (
            <CarouselCard key={show.id} show={show} status={status} solidColor={solidColor} />
          ))}
        </ScrollView>
      ) : (
        <Text style={[styles.emptyText, { color: t.fgFaint }]}>Nothing here yet</Text>
      )}
    </View>
  )
}

function CarouselCard({
  show,
  status,
  solidColor,
}: {
  show: ShowWithProgress
  status: "watching" | "want_to_watch" | "caught_up"
  solidColor: string
}) {
  const t = useAppTheme()
  const router = useRouter()
  const posterUri = show.posterPath ? `${TMDB_W300}${show.posterPath}` : null
  const isCaughtUp = status === "caught_up"
  const progress =
    show.watchedEpisodes != null && show.totalEpisodes != null && show.totalEpisodes > 0
      ? show.watchedEpisodes / show.totalEpisodes
      : null

  return (
    <TouchableOpacity
      style={styles.carouselCard}
      onPress={() => router.push(`/shows/${show.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.carouselPosterWrap}>
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.carouselPoster} />
        ) : (
          <View style={[styles.carouselPoster, { backgroundColor: t.surfaceAlt }]} />
        )}
        {isCaughtUp && show.nextEpisode && (
          <View style={styles.upcomingBadge}>
            <Text style={styles.upcomingBadgeText}>
              S{show.nextEpisode.season}E{show.nextEpisode.episode}{" "}
              {show.nextEpisode.daysUntil === 0
                ? "today"
                : `in ${show.nextEpisode.daysUntil}d`}
            </Text>
          </View>
        )}
        {!isCaughtUp && progress != null && (
          <View style={styles.progressOverlay}>
            <View style={[styles.progressTrack]}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: solidColor }]} />
            </View>
          </View>
        )}
      </View>
      <Text style={[styles.carouselTitle, { color: t.fg }]} numberOfLines={1}>
        {show.name}
      </Text>
      <Text style={[styles.carouselMeta, { color: t.fgMuted }]}>
        {isCaughtUp
          ? show.firstAirDate?.slice(0, 4) ?? ""
          : show.watchedEpisodes != null && show.totalEpisodes != null
            ? `${show.watchedEpisodes}/${show.totalEpisodes} eps`
            : show.firstAirDate?.slice(0, 4) ?? ""}
      </Text>
    </TouchableOpacity>
  )
}

export default function DashboardScreen() {
  const t = useAppTheme()
  const qc = useQueryClient()

  const { data: stats } = useQuery<Stats>({ queryKey: ["/api/stats"] })

  const { data: watching, isLoading: watchingLoading } = useQuery<ShowsResponse>({
    queryKey: [`/api/shows/watching?page=1&limit=${DASHBOARD_LIMIT}`],
  })
  const { data: wantToWatch, isLoading: wtwLoading } = useQuery<ShowsResponse>({
    queryKey: [`/api/shows/want-to-watch?page=1&limit=${DASHBOARD_LIMIT}`],
  })
  const { data: caughtUp, isLoading: cuLoading } = useQuery<ShowsResponse>({
    queryKey: [`/api/shows/caught-up?page=1&limit=${DASHBOARD_LIMIT}`],
  })

  const featuredShow = watching?.shows?.[0]

  const markWatched = useMutation({
    mutationFn: () => {
      const next = featuredShow?.nextEpisode
      if (!next || !featuredShow) throw new Error("No next episode")
      return apiRequest("POST", `/api/shows/${featuredShow.id}/progress`, {
        seasonNumber: next.season,
        episodeNumber: next.episode,
        watched: true,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/shows", String(featuredShow?.id)] })
      qc.invalidateQueries({ queryKey: ["/api/shows", String(featuredShow?.id), "progress"] })
      qc.invalidateQueries({ queryKey: [`/api/shows/watching?page=1&limit=${DASHBOARD_LIMIT}`] })
      qc.invalidateQueries({ queryKey: ["/api/stats"] })
    },
  })

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      {featuredShow ? (
        <HeroSection
          show={featuredShow}
          onMarkWatched={() => markWatched.mutate()}
          isPending={markWatched.isPending}
        />
      ) : (
        <View style={[styles.heroPlaceholder, { backgroundColor: t.surfaceAlt }]} />
      )}

      {stats && <StatsRow stats={stats} />}

      <CarouselSection
        title="Watching"
        shows={watching?.shows}
        status="watching"
        isLoading={watchingLoading}
        total={watching?.total}
        href="/(tabs)/library/watching"
      />
      <CarouselSection
        title="Want to Watch"
        shows={wantToWatch?.shows}
        status="want_to_watch"
        isLoading={wtwLoading}
        total={wantToWatch?.total}
        href="/(tabs)/library/want-to-watch"
      />
      <CarouselSection
        title="Caught Up"
        shows={caughtUp?.shows}
        status="caught_up"
        isLoading={cuLoading}
        total={caughtUp?.total}
        href="/(tabs)/library/caught-up"
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  heroContainer: {
    height: 420,
  },
  heroImage: {
    width: "100%",
    height: 420,
    justifyContent: "space-between",
  },
  heroPlaceholder: {
    height: 420,
  },
  heroTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  heroLogo: {
    fontFamily: SERIF_ITALIC,
    fontSize: 20,
    color: "rgba(255,255,255,0.95)",
  },
  glassButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBottom: {
    paddingHorizontal: 22,
    paddingBottom: 22,
  },
  heroEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  heroShowName: {
    fontFamily: SANS_700,
    fontSize: 10.5,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 1.6,
  },
  heroEpisodeTitle: {
    fontFamily: SERIF_ITALIC,
    fontSize: 28,
    color: "#fff",
    letterSpacing: -0.3,
    lineHeight: 32,
    marginBottom: 6,
  },
  heroMeta: {
    fontFamily: MONO,
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 14,
  },
  heroActions: {
    flexDirection: "row",
    gap: 8,
  },
  heroMarkBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  heroMarkBtnText: {
    fontFamily: SANS_700,
    fontSize: 13.5,
    color: "#000",
    letterSpacing: -0.1,
  },
  heroDetailsBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroDetailsBtnText: {
    fontFamily: SANS_600,
    fontSize: 13.5,
    color: "#fff",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 4,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontFamily: SERIF,
    fontSize: 26,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  statLabel: {
    fontFamily: SANS,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 4,
  },
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontFamily: SERIF,
    fontSize: 24,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontFamily: SANS_600,
    fontSize: 12,
  },
  emptyText: {
    fontFamily: SANS,
    fontSize: 13,
    paddingHorizontal: 22,
  },
  carousel: {
    paddingHorizontal: 22,
    gap: 14,
  },
  carouselCard: {
    width: 130,
  },
  carouselPosterWrap: {
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
  },
  carouselPoster: {
    width: 130,
    height: 195,
    borderRadius: 10,
  },
  upcomingBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  upcomingBadgeText: {
    fontFamily: MONO_500,
    fontSize: 9.5,
    color: "#fff",
    letterSpacing: 0.2,
  },
  progressOverlay: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
  },
  progressTrack: {
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  carouselTitle: {
    fontFamily: SANS_600,
    fontSize: 13,
    letterSpacing: -0.1,
    lineHeight: 18,
    marginTop: 8,
  },
  carouselMeta: {
    fontFamily: MONO,
    fontSize: 11,
    marginTop: 2,
  },
})
