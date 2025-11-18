import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  auth0Id: text("auth0_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  picture: text("picture"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
});

// User's show collection
export const userShows = pgTable("user_shows", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  showId: integer("show_id").notNull().references(() => shows.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // "want_to_watch", "watching", "caught_up", "completed"
  rating: integer("rating"), // 1-10
  notes: text("notes"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Season information
export const seasons = pgTable("seasons", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  showId: integer("show_id").notNull().references(() => shows.id, { onDelete: "cascade" }),
  seasonNumber: integer("season_number").notNull(),
  name: text("name"),
  overview: text("overview"),
  posterPath: text("poster_path"),
  airDate: text("air_date"),
  episodeCount: integer("episode_count"),
});

// Episode information
export const episodes = pgTable("episodes", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  showId: integer("show_id").notNull().references(() => shows.id, { onDelete: "cascade" }),
  seasonNumber: integer("season_number").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  name: text("name"),
  overview: text("overview"),
  stillPath: text("still_path"),
  airDate: text("air_date"),
  runtime: integer("runtime"),
});

// Watch progress tracking
export const watchProgress = pgTable("watch_progress", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  showId: integer("show_id").notNull().references(() => shows.id, { onDelete: "cascade" }),
  seasonNumber: integer("season_number").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  watched: boolean("watched").default(false).notNull(),
  watchedAt: timestamp("watched_at"),
});

// Import history
export const importHistory = pgTable("import_history", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  source: text("source").notNull(), // "tv_time", "trakt", etc.
  fileName: text("file_name"),
  totalShows: integer("total_shows"),
  matchedShows: integer("matched_shows"),
  unmatchedShows: integer("unmatched_shows"),
  importedAt: timestamp("imported_at").defaultNow().notNull(),
  status: text("status").notNull(), // "processing", "completed", "failed"
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertShowSchema = createInsertSchema(shows).omit({ lastUpdated: true });
export const insertUserShowSchema = createInsertSchema(userShows).omit({ id: true, addedAt: true, updatedAt: true });
export const insertSeasonSchema = createInsertSchema(seasons).omit({ id: true });
export const insertEpisodeSchema = createInsertSchema(episodes).omit({ id: true });
export const insertWatchProgressSchema = createInsertSchema(watchProgress).omit({ id: true, watchedAt: true });
export const insertImportHistorySchema = createInsertSchema(importHistory).omit({ id: true, importedAt: true });

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Show = typeof shows.$inferSelect;
export type InsertShow = z.infer<typeof insertShowSchema>;

export type UserShow = typeof userShows.$inferSelect;
export type InsertUserShow = z.infer<typeof insertUserShowSchema>;

export type Season = typeof seasons.$inferSelect;
export type InsertSeason = z.infer<typeof insertSeasonSchema>;

export type Episode = typeof episodes.$inferSelect;
export type InsertEpisode = z.infer<typeof insertEpisodeSchema>;

export type WatchProgress = typeof watchProgress.$inferSelect;
export type InsertWatchProgress = z.infer<typeof insertWatchProgressSchema>;

export type ImportHistory = typeof importHistory.$inferSelect;
export type InsertImportHistory = z.infer<typeof insertImportHistorySchema>;

// Additional types for frontend
export type NextEpisode = {
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  airDate?: string;
};

export type ShowWithProgress = Show & {
  userShow?: UserShow;
  watchedEpisodes?: number;
  totalEpisodes?: number;
  progress?: number;
  nextEpisode?: NextEpisode;
};

export type TMDBShow = {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  genres?: Array<{ id: number; name: string }>;
};

export type TMDBSeason = {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string;
  episode_count: number;
  episodes?: TMDBEpisode[];
};

export type TMDBEpisode = {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  runtime: number;
};
