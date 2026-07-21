-- TV Tracker Database Schema for Supabase

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

-- Season information
CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  name TEXT,
  overview TEXT,
  poster_path TEXT,
  air_date TEXT,
  episode_count INTEGER,
  UNIQUE(show_id, season_number)
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

-- Import history
CREATE TABLE IF NOT EXISTS import_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  file_name TEXT,
  total_shows INTEGER,
  matched_shows INTEGER,
  unmatched_shows INTEGER,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed'))
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_shows_user_id ON user_shows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shows_status ON user_shows(status);
CREATE INDEX IF NOT EXISTS idx_watch_progress_user_id ON watch_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_progress_show_id ON watch_progress(show_id);
CREATE INDEX IF NOT EXISTS idx_import_history_user_id ON import_history(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public access for now, can be restricted based on auth)
CREATE POLICY "Public access to users" ON users FOR ALL USING (true);
CREATE POLICY "Public access to user_credentials" ON user_credentials FOR ALL USING (true);
CREATE POLICY "Public access to shows" ON shows FOR ALL USING (true);
CREATE POLICY "Public access to user_shows" ON user_shows FOR ALL USING (true);
CREATE POLICY "Public access to watch_progress" ON watch_progress FOR ALL USING (true);
CREATE POLICY "Public access to import_history" ON import_history FOR ALL USING (true);

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

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access to device_tokens" ON device_tokens FOR ALL USING (true);

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

GRANT EXECUTE ON FUNCTION count_aired_watched_episodes(TEXT, INTEGER[], TEXT) TO anon, authenticated;
