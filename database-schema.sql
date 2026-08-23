-- TV Tracker Database Schema (PostgreSQL)
--
-- Row-level security was removed with the move off Supabase. Every policy was
-- USING (true), so it granted nothing, and the app now connects as the owning
-- role, which bypasses RLS regardless. Authorization is enforced in the API:
-- every query filters by the authenticated user's id.

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  auth0_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  picture TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- User credentials table (for simplified auth)
CREATE TABLE IF NOT EXISTS user_credentials (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- TV Shows table
CREATE TABLE IF NOT EXISTS shows (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  first_air_date TEXT,
  vote_average TEXT,
  number_of_seasons INTEGER,
  number_of_episodes INTEGER,
  status TEXT,
  genres TEXT[],
  tmdb_data JSONB,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- User's show collection
CREATE TABLE IF NOT EXISTS user_shows (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('want_to_watch', 'watching', 'completed', 'caught_up', 'stopped')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  notes TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, show_id)
);

-- Episode information
CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  name TEXT,
  overview TEXT,
  still_path TEXT,
  air_date TEXT,
  runtime INTEGER,
  UNIQUE(show_id, season_number, episode_number)
);

-- Watch progress tracking
CREATE TABLE IF NOT EXISTS watch_progress (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  watched BOOLEAN DEFAULT FALSE NOT NULL,
  watched_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, show_id, season_number, episode_number)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_shows_user_id ON user_shows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shows_status ON user_shows(status);
CREATE INDEX IF NOT EXISTS idx_watch_progress_user_id ON watch_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_progress_show_id ON watch_progress(show_id);

-- Device tokens for push notifications (mobile app)
CREATE TABLE IF NOT EXISTS device_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL, -- 'ios' | 'android'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);

-- Counts a user's watched episodes that have aired, restricted to a set of shows.
-- Does the watch_progress/episodes join and count in the DB so results aren't
-- subject to PostgREST's default row cap on the underlying tables.
CREATE OR REPLACE FUNCTION count_aired_watched_episodes(
  p_user_id TEXT,
  p_show_ids INTEGER[],
  p_now TEXT
)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM watch_progress wp
  JOIN episodes e
    ON e.show_id = wp.show_id
   AND e.season_number = wp.season_number
   AND e.episode_number = wp.episode_number
  WHERE wp.user_id = p_user_id
    AND wp.watched = true
    AND wp.show_id = ANY(p_show_ids)
    AND e.air_date IS NOT NULL
    AND e.air_date <= p_now
$$;

-- Sort-support views for the library list.
--
-- These existed only in the previously hosted project and in no repo file until
-- they were read back out of the catalog on 2026-08-22. server/routes.ts
-- queries both, so losing them breaks the "recent watch" and "next air date"
-- sort modes. Reproduced here verbatim from pg_dump.

CREATE OR REPLACE VIEW user_shows_with_last_watch AS
  SELECT id, user_id, show_id, status, rating, notes, added_at, updated_at,
         (SELECT max(wp.watched_at)
            FROM watch_progress wp
           WHERE wp.user_id = us.user_id
             AND wp.show_id = us.show_id
             AND wp.watched = true) AS last_watch_at
    FROM user_shows us;

-- season_number <> 0 skips specials, which otherwise surface as the "next"
-- episode. air_date is TEXT, so the comparison against now() is a string
-- comparison that only holds because the values are ISO YYYY-MM-DD.
CREATE OR REPLACE VIEW user_shows_with_next_air AS
  SELECT us.id, us.user_id, us.show_id, us.status, us.rating, us.notes,
         us.added_at, us.updated_at,
         next_ep.next_air_date, next_ep.next_season_number, next_ep.next_episode_number
    FROM user_shows us
    LEFT JOIN LATERAL (
      SELECT e.air_date AS next_air_date,
             e.season_number AS next_season_number,
             e.episode_number AS next_episode_number
        FROM episodes e
       WHERE e.show_id = us.show_id
         AND e.season_number <> 0
         AND e.air_date IS NOT NULL
         AND e.air_date > ((now() AT TIME ZONE 'utc'))::text
       ORDER BY e.air_date
       LIMIT 1
    ) next_ep ON true;

-- Dropped 2026-08-22: seasons and import_history both held zero rows and were
-- never read or written by any code path. The /api/shows/:id/seasons endpoint
-- reads shows.number_of_seasons and falls back to TMDB or the episodes cache.
-- On an existing database:
--
--   DROP TABLE IF EXISTS seasons, import_history;
