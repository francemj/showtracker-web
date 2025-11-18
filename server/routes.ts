import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import Papa from "papaparse";
import { supabase } from "./lib/supabase";
import { searchTVShows, getTVShowDetails, getTVShowSeason } from "./lib/tmdb";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

interface AuthRequest extends Request {
  userId?: string;
}

const authMiddleware = async (req: AuthRequest, res: Response, next: Function) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.userId = req.session.userId;
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "tv-tracker-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // Auth routes
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if user exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const { data: user, error } = await supabase
        .from("users")
        .insert({
          email,
          name,
          auth0_id: `local_${Date.now()}`, // Simplified auth
          picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366F1&color=fff`,
        })
        .select()
        .single();

      if (error || !user) {
        return res.status(500).json({ message: "Failed to create user" });
      }

      // Store password separately (in production, use proper auth service)
      await supabase.from("user_credentials").insert({
        user_id: user.id,
        password_hash: hashedPassword,
      });

      req.session.userId = user.id;
      res.json({ user });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get user
      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Get password hash
      const { data: credentials } = await supabase
        .from("user_credentials")
        .select("password_hash")
        .eq("user_id", user.id)
        .single();

      if (!credentials) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, credentials.password_hash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      res.json({ user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", req.session.userId)
        .single();

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  // Search shows
  app.get("/api/search/shows/:query", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { query } = req.params;
      if (!query) {
        return res.status(400).json({ message: "Query parameter required" });
      }

      const results = await searchTVShows(query);
      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Failed to search shows" });
    }
  });

  // Get user stats
  app.get("/api/stats", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { data: userShows } = await supabase
        .from("user_shows")
        .select("status")
        .eq("user_id", req.userId);

      const { data: watchProgress } = await supabase
        .from("watch_progress")
        .select("*")
        .eq("user_id", req.userId)
        .eq("watched", true);

      const stats = {
        totalShows: userShows?.length || 0,
        watchingShows: userShows?.filter((s) => s.status === "watching").length || 0,
        completedShows: userShows?.filter((s) => s.status === "completed").length || 0,
        episodesWatched: watchProgress?.length || 0,
      };

      res.json(stats);
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Get user shows
  app.get("/api/user/shows", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { data: userShows } = await supabase
        .from("user_shows")
        .select("show_id, status")
        .eq("user_id", req.userId);

      // Map snake_case to camelCase for frontend
      const mappedShows = (userShows || []).map((us: any) => ({
        showId: us.show_id,
        status: us.status,
      }));

      res.json(mappedShows);
    } catch (error) {
      console.error("Get user shows error:", error);
      res.status(500).json({ message: "Failed to get user shows" });
    }
  });

  // Add show to user collection
  app.post("/api/user/shows", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { showId } = req.body;

      // Get show details from TMDB
      const tmdbShow = await getTVShowDetails(showId);

      // Upsert show to database
      const { error: showError } = await supabase.from("shows").upsert({
        id: tmdbShow.id,
        name: tmdbShow.name,
        overview: tmdbShow.overview,
        poster_path: tmdbShow.poster_path,
        backdrop_path: tmdbShow.backdrop_path,
        first_air_date: tmdbShow.first_air_date,
        vote_average: tmdbShow.vote_average?.toString(),
        number_of_seasons: tmdbShow.number_of_seasons,
        number_of_episodes: tmdbShow.number_of_episodes,
        status: tmdbShow.status,
        genres: tmdbShow.genres?.map((g: any) => g.name),
        tmdb_data: tmdbShow,
      });

      if (showError) {
        console.error("Show upsert error:", showError);
      }

      // Add to user's collection with want_to_watch status by default
      // Status will be automatically inferred based on watch progress
      const { data: userShow, error } = await supabase
        .from("user_shows")
        .insert({
          user_id: req.userId,
          show_id: showId,
          status: 'want_to_watch',  // Default status for new shows
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ message: "Failed to add show" });
      }

      // Cache episodes in background to enable status inference
      // Then run status inference once episodes are cached
      (async () => {
        try {
          // Fetch and cache all seasons/episodes for this show
          if (tmdbShow.number_of_seasons) {
            const seasons = await Promise.all(
              Array.from({ length: tmdbShow.number_of_seasons }, (_, i) => i + 1).map(async (seasonNum) => {
                return await getTVShowSeason(showId, seasonNum);
              })
            );
            
            await cacheEpisodesInDatabase(showId, seasons);
            
            // Now run status inference with cached data
            await updateInferredStatus(req.userId!, showId);
          }
        } catch (err) {
          console.error("Background episode caching/inference failed:", err);
        }
      })();

      res.json(userShow);
    } catch (error) {
      console.error("Add show error:", error);
      res.status(500).json({ message: "Failed to add show" });
    }
  });

  // Update show status
  app.patch("/api/user/shows/:showId", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { showId } = req.params;
      const { status } = req.body;

      const { data, error } = await supabase
        .from("user_shows")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("user_id", req.userId)
        .eq("show_id", parseInt(showId))
        .select()
        .single();

      if (error) {
        return res.status(500).json({ message: "Failed to update show" });
      }

      // If status is set to "Completed", mark all episodes as watched
      if (status === "completed") {
        markShowEpisodesWatched(req.userId!, parseInt(showId), true)
          .then(() => updateInferredStatus(req.userId!, parseInt(showId)))
          .catch(err => console.error("Background episode marking failed:", err));
      }

      res.json(data);
    } catch (error) {
      console.error("Update show error:", error);
      res.status(500).json({ message: "Failed to update show" });
    }
  });

  // Get shows by status
  app.get("/api/shows/watching", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const shows = await getShowsWithProgress(req.userId!, "watching");
      res.json(shows);
    } catch (error) {
      console.error("Get watching shows error:", error);
      res.status(500).json({ message: "Failed to get shows" });
    }
  });

  app.get("/api/shows/completed", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const shows = await getShowsWithProgress(req.userId!, "completed");
      res.json(shows);
    } catch (error) {
      console.error("Get completed shows error:", error);
      res.status(500).json({ message: "Failed to get shows" });
    }
  });

  app.get("/api/shows/want-to-watch", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const shows = await getShowsWithProgress(req.userId!, "want_to_watch");
      res.json(shows);
    } catch (error) {
      console.error("Get want to watch shows error:", error);
      res.status(500).json({ message: "Failed to get shows" });
    }
  });

  app.get("/api/shows/recent", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { data: userShows } = await supabase
        .from("user_shows")
        .select("*, shows(*)")
        .eq("user_id", req.userId)
        .order("added_at", { ascending: false })
        .limit(8);

      const shows = await Promise.all(
        (userShows || []).map(async (us: any) => {
          const progress = await calculateShowProgress(req.userId!, us.show_id);
          const show = us.shows;
          
          // Map snake_case database fields to camelCase for frontend
          return {
            id: show.id,
            name: show.name,
            overview: show.overview,
            posterPath: show.poster_path,
            backdropPath: show.backdrop_path,
            firstAirDate: show.first_air_date,
            voteAverage: show.vote_average,
            numberOfSeasons: show.number_of_seasons,
            numberOfEpisodes: show.number_of_episodes,
            status: show.status,
            genres: show.genres,
            tmdbData: show.tmdb_data,
            lastUpdated: show.last_updated,
            userShow: {
              id: us.id,
              userId: us.user_id,
              showId: us.show_id,
              status: us.status,
              rating: us.rating,
              notes: us.notes,
              addedAt: us.added_at,
              updatedAt: us.updated_at,
            },
            ...progress,
          };
        })
      );

      res.json(shows);
    } catch (error) {
      console.error("Get recent shows error:", error);
      res.status(500).json({ message: "Failed to get shows" });
    }
  });

  app.get("/api/shows/continue-watching", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const shows = await getShowsWithProgress(req.userId!, "watching");
      const continueWatching = shows.filter((s: any) => s.progress > 0 && s.progress < 100);
      res.json(continueWatching.slice(0, 4));
    } catch (error) {
      console.error("Get continue watching error:", error);
      res.status(500).json({ message: "Failed to get shows" });
    }
  });

  // Get show details
  app.get("/api/shows/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data: show } = await supabase
        .from("shows")
        .select("*")
        .eq("id", parseInt(id))
        .single();

      if (!show) {
        return res.status(404).json({ message: "Show not found" });
      }

      const { data: userShow } = await supabase
        .from("user_shows")
        .select("*")
        .eq("user_id", req.userId)
        .eq("show_id", parseInt(id))
        .single();

      const progress = await calculateShowProgress(req.userId!, parseInt(id));

      // Map snake_case database fields to camelCase for frontend
      res.json({
        id: show.id,
        name: show.name,
        overview: show.overview,
        posterPath: show.poster_path,
        backdropPath: show.backdrop_path,
        firstAirDate: show.first_air_date,
        voteAverage: show.vote_average,
        numberOfSeasons: show.number_of_seasons,
        numberOfEpisodes: show.number_of_episodes,
        status: show.status,
        genres: show.genres,
        tmdbData: show.tmdb_data,
        lastUpdated: show.last_updated,
        userShow: userShow ? {
          id: userShow.id,
          userId: userShow.user_id,
          showId: userShow.show_id,
          status: userShow.status,
          rating: userShow.rating,
          notes: userShow.notes,
          addedAt: userShow.added_at,
          updatedAt: userShow.updated_at,
        } : null,
        ...progress,
      });
    } catch (error) {
      console.error("Get show error:", error);
      res.status(500).json({ message: "Failed to get show" });
    }
  });

  // Get show seasons with episodes
  app.get("/api/shows/:id/seasons", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data: show } = await supabase
        .from("shows")
        .select("number_of_seasons")
        .eq("id", parseInt(id))
        .single();

      if (!show || !show.number_of_seasons) {
        return res.json([]);
      }

      const seasons = await Promise.all(
        Array.from({ length: show.number_of_seasons }, (_, i) => i + 1).map(async (seasonNum) => {
          return await getTVShowSeason(parseInt(id), seasonNum);
        })
      );

      // Cache episodes in database for faster status inference
      // This runs in background and doesn't block the response
      cacheEpisodesInDatabase(parseInt(id), seasons).catch(err =>
        console.error("Failed to cache episodes:", err)
      );

      res.json(seasons);
    } catch (error) {
      console.error("Get seasons error:", error);
      res.status(500).json({ message: "Failed to get seasons" });
    }
  });

  // Get watch progress
  app.get("/api/shows/:id/progress", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data: progress } = await supabase
        .from("watch_progress")
        .select("season_number, episode_number, watched")
        .eq("user_id", req.userId)
        .eq("show_id", parseInt(id));

      // Map snake_case to camelCase for frontend
      const mappedProgress = (progress || []).map((p: any) => ({
        seasonNumber: p.season_number,
        episodeNumber: p.episode_number,
        watched: p.watched,
      }));

      res.json(mappedProgress);
    } catch (error) {
      console.error("Get progress error:", error);
      res.status(500).json({ message: "Failed to get progress" });
    }
  });

  // Toggle episode watched status
  app.post("/api/shows/:id/progress", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { seasonNumber, episodeNumber, watched } = req.body;

      const { error } = await supabase
        .from("watch_progress")
        .upsert({
          user_id: req.userId,
          show_id: parseInt(id),
          season_number: seasonNumber,
          episode_number: episodeNumber,
          watched,
          watched_at: watched ? new Date().toISOString() : null,
        }, {
          onConflict: 'user_id,show_id,season_number,episode_number'
        });

      if (error) {
        return res.status(500).json({ message: "Failed to update progress" });
      }

      // Update inferred status in background (don't wait)
      updateInferredStatus(req.userId!, parseInt(id)).catch(err => 
        console.error("Background status update failed:", err)
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Update progress error:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Mark all episodes in season as watched/unwatched
  app.post("/api/shows/:id/season/:seasonNumber/mark-all", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id, seasonNumber } = req.params;
      const { watched } = req.body;

      // Get season details to know episode count
      const season = await getTVShowSeason(parseInt(id), parseInt(seasonNumber));

      if (!season.episodes) {
        return res.status(404).json({ message: "Season not found" });
      }

      // Only mark aired episodes
      const now = new Date();
      const airedEpisodes = season.episodes.filter((ep: any) => 
        ep.air_date && new Date(ep.air_date) <= now
      );

      // Upsert aired episodes only
      const progressRecords = airedEpisodes.map((ep: any) => ({
        user_id: req.userId,
        show_id: parseInt(id),
        season_number: parseInt(seasonNumber),
        episode_number: ep.episode_number,
        watched,
        watched_at: watched ? new Date().toISOString() : null,
      }));

      const { error } = await supabase
        .from("watch_progress")
        .upsert(progressRecords, {
          onConflict: 'user_id,show_id,season_number,episode_number'
        });

      if (error) {
        return res.status(500).json({ message: "Failed to update season" });
      }

      // Update inferred status in background (don't wait)
      updateInferredStatus(req.userId!, parseInt(id)).catch(err => 
        console.error("Background status update failed:", err)
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Mark season error:", error);
      res.status(500).json({ message: "Failed to mark season" });
    }
  });

  // Bulk update episode progress
  app.post("/api/shows/:id/progress/bulk", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { episodes } = req.body;

      if (!Array.isArray(episodes) || episodes.length === 0) {
        return res.status(400).json({ message: "Episodes array is required" });
      }

      // Create progress records for all episodes
      const progressRecords = episodes.map((ep: any) => ({
        user_id: req.userId,
        show_id: parseInt(id),
        season_number: ep.seasonNumber,
        episode_number: ep.episodeNumber,
        watched: ep.watched,
        watched_at: ep.watched ? new Date().toISOString() : null,
      }));

      // Batch upsert all episodes (specify composite key for conflict resolution)
      const { error } = await supabase
        .from("watch_progress")
        .upsert(progressRecords, { 
          onConflict: 'user_id,show_id,season_number,episode_number'
        });

      if (error) {
        console.error("Bulk progress update error:", error);
        return res.status(500).json({ message: "Failed to update progress" });
      }

      // Update inferred status in background (don't wait)
      updateInferredStatus(req.userId!, parseInt(id)).catch(err => 
        console.error("Background status update failed:", err)
      );

      res.json({ success: true, count: episodes.length });
    } catch (error) {
      console.error("Bulk update progress error:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Import from TV Time
  app.post("/api/import/tv-time", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.files || !req.files.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.files.file as any;
      const csvContent = file.data.toString("utf-8");

      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
      });

      const shows = new Map<string, any>();

      // Extract unique shows from CSV
      for (const row of parsed.data as any[]) {
        const showName = row["TV Show Name"] || row["tv_show_name"] || row["show_name"];
        if (showName && !shows.has(showName)) {
          shows.set(showName, row);
        }
      }

      let matched = 0;
      let unmatched = 0;
      const unmatchedShows: string[] = [];

      // Try to match and add each show
      for (const [showName, _] of Array.from(shows)) {
        try {
          const results = await searchTVShows(showName);
          if (results && results.length > 0) {
            const bestMatch = results[0];
            
            // Add show to database
            await supabase.from("shows").upsert({
              id: bestMatch.id,
              name: bestMatch.name,
              overview: bestMatch.overview,
              poster_path: bestMatch.poster_path,
              backdrop_path: bestMatch.backdrop_path,
              first_air_date: bestMatch.first_air_date,
              vote_average: bestMatch.vote_average?.toString(),
              genres: [],
            });

            // Add to user's collection
            await supabase.from("user_shows").upsert({
              user_id: req.userId,
              show_id: bestMatch.id,
              status: "watching",
            });

            matched++;
          } else {
            unmatched++;
            unmatchedShows.push(showName);
          }
        } catch (error) {
          unmatched++;
          unmatchedShows.push(showName);
        }
      }

      // Save import history
      await supabase.from("import_history").insert({
        user_id: req.userId,
        source: "tv_time",
        file_name: file.name,
        total_shows: shows.size,
        matched_shows: matched,
        unmatched_shows: unmatched,
        status: "completed",
      });

      res.json({
        total: shows.size,
        matched,
        unmatched,
        unmatchedShows: unmatchedShows.slice(0, 20),
      });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ message: "Failed to import data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function getShowsWithProgress(userId: string, status: string) {
  const { data: userShows } = await supabase
    .from("user_shows")
    .select("*, shows(*)")
    .eq("user_id", userId)
    .eq("status", status)
    .order("updated_at", { ascending: false });

  const shows = await Promise.all(
    (userShows || []).map(async (us: any) => {
      const progress = await calculateShowProgress(userId, us.show_id);
      const show = us.shows;
      
      // Map snake_case database fields to camelCase for frontend
      return {
        id: show.id,
        name: show.name,
        overview: show.overview,
        posterPath: show.poster_path,
        backdropPath: show.backdrop_path,
        firstAirDate: show.first_air_date,
        voteAverage: show.vote_average,
        numberOfSeasons: show.number_of_seasons,
        numberOfEpisodes: show.number_of_episodes,
        status: show.status,
        genres: show.genres,
        tmdbData: show.tmdb_data,
        lastUpdated: show.last_updated,
        userShow: {
          id: us.id,
          userId: us.user_id,
          showId: us.show_id,
          status: us.status,
          rating: us.rating,
          notes: us.notes,
          addedAt: us.added_at,
          updatedAt: us.updated_at,
        },
        ...progress,
      };
    })
  );

  return shows;
}

async function findNextUnwatchedEpisode(userId: string, showId: number) {
  try {
    // Get show details to know how many seasons
    const { data: show } = await supabase
      .from("shows")
      .select("number_of_seasons")
      .eq("id", showId)
      .single();

    if (!show || !show.number_of_seasons) {
      return null;
    }

    // Get all watched episodes for this show
    const { data: watchedProgress } = await supabase
      .from("watch_progress")
      .select("season_number, episode_number")
      .eq("user_id", userId)
      .eq("show_id", showId)
      .eq("watched", true);

    const watchedSet = new Set(
      (watchedProgress || []).map((w: any) => `${w.season_number}-${w.episode_number}`)
    );

    // Iterate through seasons to find first unwatched episode
    for (let seasonNum = 1; seasonNum <= show.number_of_seasons; seasonNum++) {
      try {
        const seasonData = await getTVShowSeason(showId, seasonNum);
        if (seasonData.episodes && seasonData.episodes.length > 0) {
          for (const episode of seasonData.episodes) {
            const key = `${seasonNum}-${episode.episode_number}`;
            if (!watchedSet.has(key)) {
              return {
                seasonNumber: seasonNum,
                episodeNumber: episode.episode_number,
                name: episode.name,
                airDate: episode.air_date,
              };
            }
          }
        }
      } catch (error) {
        console.error(`Failed to fetch season ${seasonNum} for next episode search:`, error);
      }
    }

    return null;
  } catch (error) {
    console.error("Error finding next unwatched episode:", error);
    return null;
  }
}

async function calculateShowProgress(userId: string, showId: number) {
  const { data: show } = await supabase
    .from("shows")
    .select("number_of_episodes")
    .eq("id", showId)
    .single();

  const { data: progress } = await supabase
    .from("watch_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("show_id", showId)
    .eq("watched", true);

  const watchedEpisodes = progress?.length || 0;
  const totalEpisodes = show?.number_of_episodes || 1;
  const progressPercent = (watchedEpisodes / totalEpisodes) * 100;

  // Find next unwatched episode
  const nextEpisode = await findNextUnwatchedEpisode(userId, showId);

  return {
    watchedEpisodes,
    totalEpisodes,
    progress: progressPercent,
    nextEpisode,
  };
}

async function markShowEpisodesWatched(userId: string, showId: number, watched: boolean = true) {
  try {
    // Get show details including number of seasons
    const { data: show } = await supabase
      .from("shows")
      .select("number_of_seasons")
      .eq("id", showId)
      .single();

    if (!show || !show.number_of_seasons) {
      console.warn(`Show ${showId} has no season data`);
      return;
    }

    // Fetch all episodes for all seasons from TMDB
    const allEpisodes: Array<{ seasonNumber: number; episodeNumber: number }> = [];
    
    for (let seasonNum = 1; seasonNum <= show.number_of_seasons; seasonNum++) {
      try {
        const seasonData = await getTVShowSeason(showId, seasonNum);
        if (seasonData.episodes && seasonData.episodes.length > 0) {
          seasonData.episodes.forEach((episode: any) => {
            allEpisodes.push({
              seasonNumber: seasonNum,
              episodeNumber: episode.episode_number,
            });
          });
        }
      } catch (error) {
        console.error(`Failed to fetch season ${seasonNum} for show ${showId}:`, error);
      }
    }

    if (allEpisodes.length === 0) {
      console.warn(`No episodes found for show ${showId}`);
      return;
    }

    // Prepare watch_progress records for bulk upsert
    const watchProgressRecords = allEpisodes.map(ep => ({
      user_id: userId,
      show_id: showId,
      season_number: ep.seasonNumber,
      episode_number: ep.episodeNumber,
      watched,
      watched_at: watched ? new Date().toISOString() : null,
    }));

    // Batch upsert in chunks of 100 to respect Supabase limits
    const CHUNK_SIZE = 100;
    for (let i = 0; i < watchProgressRecords.length; i += CHUNK_SIZE) {
      const chunk = watchProgressRecords.slice(i, i + CHUNK_SIZE);
      
      const { error } = await supabase
        .from("watch_progress")
        .upsert(chunk, {
          onConflict: 'user_id,show_id,season_number,episode_number',
        });

      if (error) {
        console.error(`Failed to upsert watch progress chunk:`, error);
        throw error;
      }
    }

    console.log(`Successfully marked ${allEpisodes.length} episodes as ${watched ? 'watched' : 'unwatched'} for show ${showId}`);
  } catch (error) {
    console.error(`Error in markShowEpisodesWatched:`, error);
    throw error;
  }
}

// Cache episodes in the database for faster lookups
async function cacheEpisodesInDatabase(showId: number, seasons: any[]) {
  try {
    const episodesToCache: any[] = [];

    for (const season of seasons) {
      if (!season.episodes || season.season_number === 0) continue;

      for (const episode of season.episodes) {
        episodesToCache.push({
          show_id: showId,
          season_number: season.season_number,
          episode_number: episode.episode_number,
          name: episode.name,
          air_date: episode.air_date,
          runtime: episode.runtime,
          overview: episode.overview,
          still_path: episode.still_path,
        });
      }
    }

    if (episodesToCache.length > 0) {
      // Upsert episodes in batches with error handling
      const CHUNK_SIZE = 100;
      for (let i = 0; i < episodesToCache.length; i += CHUNK_SIZE) {
        const chunk = episodesToCache.slice(i, i + CHUNK_SIZE);
        
        const { error } = await supabase
          .from("episodes")
          .upsert(chunk, {
            onConflict: 'show_id,season_number,episode_number',
          });

        if (error) {
          console.error(`Failed to cache episodes chunk for show ${showId}:`, error);
          throw error;
        }
      }
      console.log(`✓ Cached ${episodesToCache.length} episodes for show ${showId}`);
    }
  } catch (error) {
    console.error(`Error caching episodes for show ${showId}:`, error);
    throw error;
  }
}

// Update show status based on watch progress and show details
// This is called whenever progress changes to keep the stored status in sync
// Uses cached episodes from the database for accurate aired episode counting
async function updateInferredStatus(userId: string, showId: number) {
  try {
    // Get show status
    const { data: show } = await supabase
      .from("shows")
      .select("status")
      .eq("id", showId)
      .single();

    if (!show) {
      console.log(`⚠ Show ${showId} not found, skipping status update`);
      return;
    }

    // Count watched episodes
    const { data: watchedProgress } = await supabase
      .from("watch_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("show_id", showId)
      .eq("watched", true);

    const watchedCount = watchedProgress?.length || 0;

    // Count aired episodes from cached episodes table
    const now = new Date().toISOString();
    const { data: airedEpisodes, count: airedCount, error: countError } = await supabase
      .from("episodes")
      .select("*", { count: 'exact' })
      .eq("show_id", showId)
      .neq("season_number", 0) // Skip special seasons
      .lte("air_date", now) // Only count aired episodes
      .not("air_date", "is", null);

    if (countError) {
      console.error(`Error counting aired episodes for show ${showId}:`, countError);
      return;
    }

    const totalAiredEpisodes = airedCount || 0;

    // If no episodes cached yet, skip status update
    if (totalAiredEpisodes === 0) {
      console.log(`⚠ No cached episodes for show ${showId}, skipping status update`);
      return;
    }

    // Determine new status based on aired episodes
    let newStatus: string;

    if (watchedCount === 0) {
      // No episodes watched → Want to Watch
      newStatus = "want_to_watch";
    } else if (show.status === "Ended" && totalAiredEpisodes > 0 && watchedCount >= totalAiredEpisodes) {
      // Show ended and all aired episodes watched → Completed
      newStatus = "completed";
    } else {
      // Otherwise → Watching
      newStatus = "watching";
    }

    // Update the status in the database
    const { error: updateError } = await supabase
      .from("user_shows")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("show_id", showId);

    if (updateError) {
      console.error(`Error updating user_shows status for show ${showId}:`, updateError);
      return;
    }

    console.log(`✓ Auto-updated show ${showId} status to "${newStatus}" (${watchedCount}/${totalAiredEpisodes} aired episodes watched, show status: ${show.status})`);
  } catch (error) {
    console.error(`Error updating inferred status:`, error);
    // Don't throw - we don't want status updates to fail progress tracking
  }
}
