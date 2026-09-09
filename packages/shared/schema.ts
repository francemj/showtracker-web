import { sql } from "drizzle-orm"
import {
  pgTable,
  pgView,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core"
import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"

export * from "./episode-utils"
export * from "./episode-progress"

// Users table.
//
// auth0Id is nullable: accounts created since auth moved in-house have no Auth0
// subject, and the column survives only to identify pre-existing rows during
// the migration.
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  auth0Id: text("auth0_id").unique(),
  email: text("email").notNull().unique(),
  name: text("name"),
  picture: text("picture"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// TV Shows table - from TMDB
export const shows = pgTable("shows", {
  id: integer("id").primaryKey(), // TMDB ID
  name: text("name").notNull(),
  overview: text("overview"),
  posterPath: text("poster_path"),
  backdropPath: text("backdrop_path"),
  firstAirDate: text("first_air_date"),
  voteAverage: text("vote_average"),
  numberOfSeasons: integer("number_of_seasons"),
  numberOfEpisodes: integer("number_of_episodes"),
  status: text("status"),
  genres: text("genres").array(),
  tmdbData: jsonb("tmdb_data"), // Store full TMDB response
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
})

// User's show collection
export const userShows = pgTable("user_shows", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  showId: integer("show_id")
    .notNull()
    .references(() => shows.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // "want_to_watch", "watching", "caught_up", "completed", "stopped"
  rating: integer("rating"), // 1-10
  notes: text("notes"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Episode information
export const episodes = pgTable("episodes", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  showId: integer("show_id")
    .notNull()
    .references(() => shows.id, { onDelete: "cascade" }),
  seasonNumber: integer("season_number").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  name: text("name"),
  overview: text("overview"),
  stillPath: text("still_path"),
  airDate: text("air_date"),
  runtime: integer("runtime"),
})

// Watch progress tracking
export const watchProgress = pgTable("watch_progress", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  showId: integer("show_id")
    .notNull()
    .references(() => shows.id, { onDelete: "cascade" }),
  seasonNumber: integer("season_number").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  watched: boolean("watched").default(false).notNull(),
  watchedAt: timestamp("watched_at"),
})

// Device tokens for push notifications (mobile app)
export const deviceTokens = pgTable("device_tokens", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  platform: text("platform").notNull(), // "ios" | "android"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * Sort-support views, declared with .existing() because their SQL lives in
 * database-schema.sql rather than being generated from here.
 *
 * Both existed only inside the hosted project until they were read back out of
 * the catalog during the migration; the shapes below come from those recovered
 * definitions.
 */
export const userShowsWithLastWatch = pgView("user_shows_with_last_watch", {
  id: text("id"),
  userId: text("user_id"),
  showId: integer("show_id"),
  status: text("status"),
  rating: integer("rating"),
  notes: text("notes"),
  addedAt: timestamp("added_at"),
  updatedAt: timestamp("updated_at"),
  lastWatchAt: timestamp("last_watch_at"),
}).existing()

export const userShowsWithNextAir = pgView("user_shows_with_next_air", {
  id: text("id"),
  userId: text("user_id"),
  showId: integer("show_id"),
  status: text("status"),
  rating: integer("rating"),
  notes: text("notes"),
  addedAt: timestamp("added_at"),
  updatedAt: timestamp("updated_at"),
  // TEXT rather than a date, matching the episodes.air_date column the view
  // reads. The view compares it to now() as a string, which holds only because
  // the values are ISO YYYY-MM-DD.
  nextAirDate: text("next_air_date"),
  nextSeasonNumber: integer("next_season_number"),
  nextEpisodeNumber: integer("next_episode_number"),
}).existing()

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
})
export const insertShowSchema = createInsertSchema(shows).omit({
  lastUpdated: true,
})
export const insertUserShowSchema = createInsertSchema(userShows).omit({
  id: true,
  addedAt: true,
  updatedAt: true,
})
export const insertEpisodeSchema = createInsertSchema(episodes).omit({
  id: true,
})
export const insertWatchProgressSchema = createInsertSchema(watchProgress).omit(
  { id: true, watchedAt: true }
)

// TypeScript types
export type User = typeof users.$inferSelect
export type InsertUser = z.infer<typeof insertUserSchema>

export type Show = typeof shows.$inferSelect
export type InsertShow = z.infer<typeof insertShowSchema>

export type UserShow = typeof userShows.$inferSelect
export type InsertUserShow = z.infer<typeof insertUserShowSchema>

export type Episode = typeof episodes.$inferSelect
export type InsertEpisode = z.infer<typeof insertEpisodeSchema>

export type WatchProgress = typeof watchProgress.$inferSelect
export type InsertWatchProgress = z.infer<typeof insertWatchProgressSchema>

export type DeviceToken = typeof deviceTokens.$inferSelect

// Additional types for frontend
export type StatusKey =
  | "watching"
  | "want_to_watch"
  | "caught_up"
  | "completed"
  | "stopped"

export type PaginatedShowsResponse = {
  shows: ShowWithProgress[]
  total: number
  page: number
  totalPages: number
}

export type SearchResponse = {
  results: TMDBShow[]
  page: number
  totalPages: number
  totalResults: number
}

export type NextEpisode = {
  season: number
  episode: number
  name?: string
  airDate: string | null
  daysUntil: number | null
}

export type EpisodeProgress = {
  season: number
  episode: number
  watched: boolean
}

export type ShowStats = {
  totalShows: number
  watchingShows: number
  completedShows: number
  episodesWatched: number
}

export type ShowWithProgress = Show & {
  userShow?: UserShow
  watchedEpisodes?: number
  totalEpisodes?: number
  progress?: number
  nextEpisode?: NextEpisode
}

export type TMDBShow = {
  id: number
  name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  vote_average: number
  number_of_seasons?: number
  number_of_episodes?: number
  status?: string
  genres?: Array<{ id: number; name: string }>
}

export type TMDBSeason = {
  id: number
  season_number: number
  name: string
  overview: string
  poster_path: string | null
  air_date: string
  episode_count: number
  episodes?: TMDBEpisode[]
}

export type TMDBEpisode = {
  id: number
  episode_number: number
  season_number: number
  name: string
  overview: string
  still_path: string | null
  air_date: string
  runtime: number
}
