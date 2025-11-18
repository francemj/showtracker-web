# TV Tracker - TV Show Tracking Application

## Overview
A comprehensive web-based TV show tracking application built with React, Express, TypeScript, and Supabase. Users can search for shows, track their watching progress across seasons and episodes, manage their collection, and import watch history from TV Time.

## Features Implemented

### Authentication
- User signup and login with email/password
- Session-based authentication
- Protected routes requiring authentication
- User profile management

### Show Management
- Search TV shows using TMDB API
- Add shows to collection with status (Want to Watch/Watching/Completed)
- View show details with seasons and episodes
- Update show status
- Categorized collections (Currently Watching, Completed)

### Progress Tracking
- Mark individual episodes as watched/unwatched
- Bulk mark entire seasons
- Visual progress bars showing completion percentage
- Episode-level tracking with air dates and runtime
- Dashboard with statistics (total shows, watching, completed, episodes watched)
- **Smart Auto-Complete**: When a show is marked as "Completed", all episodes are automatically marked as watched
- **Reciprocal Auto-Update**: When all episodes are manually marked watched, the show status automatically updates to "Completed"

### Data Import
- TV Time CSV import functionality
- Automatic show matching using TMDB search
- Import result reporting (matched/unmatched shows)
- Import history tracking

### UI/UX Features
- Beautiful sidebar navigation with user profile
- Dark/light theme toggle
- Responsive design (mobile, tablet, desktop)
- Loading skeletons for async content
- Empty states with helpful messages
- Show cards with posters and progress indicators
- Accordion-based season/episode lists

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **Styling**: Tailwind CSS + Shadcn UI components
- **Forms**: React Hook Form with Zod validation
- **Typography**: Inter (body), Poppins (headings)

### Backend
- **Server**: Express.js with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Session Management**: express-session
- **Authentication**: bcrypt for password hashing
- **File Upload**: express-fileupload
- **CSV Parsing**: PapaParse

### External APIs
- **TMDB API**: TV show data, search, seasons, episodes
- **Supabase**: Data persistence and real-time capabilities

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # Shadcn UI components
│   │   │   ├── app-sidebar.tsx  # App navigation sidebar
│   │   │   ├── show-card.tsx    # Show display card
│   │   │   ├── theme-provider.tsx
│   │   │   └── theme-toggle.tsx
│   │   ├── hooks/
│   │   │   ├── use-debounce.ts
│   │   │   └── use-toast.ts
│   │   ├── lib/
│   │   │   ├── auth.tsx         # Authentication context
│   │   │   ├── queryClient.ts   # React Query setup
│   │   │   └── utils.ts
│   │   ├── pages/
│   │   │   ├── auth.tsx         # Login/signup page
│   │   │   ├── dashboard.tsx    # Main dashboard
│   │   │   ├── search.tsx       # Show search
│   │   │   ├── watching.tsx     # Currently watching list
│   │   │   ├── completed.tsx    # Completed shows list
│   │   │   ├── show-detail.tsx  # Show detail with episodes
│   │   │   └── import.tsx       # TV Time import
│   │   ├── App.tsx
│   │   ├── index.css            # Global styles
│   │   └── main.tsx
│   └── index.html
├── server/
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client
│   │   └── tmdb.ts              # TMDB API helpers
│   ├── routes.ts                # All API routes
│   └── index.ts                 # Express server setup
├── shared/
│   └── schema.ts                # Shared TypeScript types
├── database-schema.sql          # Supabase database schema
└── DATABASE_SETUP.md            # Database setup instructions
```

## Database Schema

### Tables
- **users**: User accounts with auth information
- **user_credentials**: Password hashes (for simplified auth)
- **shows**: TV show information from TMDB
- **user_shows**: User's show collection with status
- **seasons**: Season information
- **episodes**: Episode details
- **watch_progress**: Episode watch tracking
- **import_history**: Import operation logs

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Shows
- `GET /api/search/shows` - Search TV shows (TMDB)
- `GET /api/stats` - Get user statistics
- `GET /api/user/shows` - Get user's show collection
- `POST /api/user/shows` - Add show to collection
- `PATCH /api/user/shows/:showId` - Update show status
- `GET /api/shows/watching` - Get watching shows
- `GET /api/shows/completed` - Get completed shows
- `GET /api/shows/recent` - Get recently added shows
- `GET /api/shows/continue-watching` - Get shows in progress
- `GET /api/shows/:id` - Get show details
- `GET /api/shows/:id/seasons` - Get show seasons with episodes
- `GET /api/shows/:id/progress` - Get watch progress
- `POST /api/shows/:id/progress` - Toggle episode watched
- `POST /api/shows/:id/season/:seasonNumber/mark-all` - Mark season watched

### Import
- `POST /api/import/tv-time` - Import TV Time CSV

## Environment Variables Required

```
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# TMDB API
TMDB_API_KEY=your_tmdb_api_key

# Session (optional, has default)
SESSION_SECRET=your_session_secret
```

## Design System

### Colors
- **Primary**: Indigo (#6366F1) - Main brand color
- **Secondary**: Purple (#8B5CF6) - Accent actions
- **Accent**: Emerald (#10B981) - Success/progress states
- **Background**: Light grey (#F8FAFC) / Dark slate (dark mode)
- **Text**: Dark slate (#1E293B)

### Typography
- **Headings**: Poppins, 600-700 weight
- **Body**: Inter, 400-500 weight
- **Sizing**: text-4xl (h1), text-2xl (h2), text-base (body)

### Components
- Card-based layouts with subtle shadows
- Rounded corners (rounded-lg, rounded-md)
- Hover elevation effects
- Progress bars with emerald accent
- Sidebar navigation with indigo background
- Badge components for status indicators

## User Preferences
None specified yet.

## Recent Changes
- Initial project setup (Nov 18, 2025)
- Implemented complete authentication system
- Built all frontend pages and components
- Created backend API with Supabase integration
- Added TMDB API integration for show data
- Implemented episode tracking system
- Added TV Time CSV import feature
- Designed and implemented UI with indigo/purple/emerald color scheme
- Fixed data consistency: All API endpoints now properly convert snake_case database fields to camelCase (Nov 18, 2025)
- Fixed show detail page: Thumbnails and status section now display correctly with complete TMDB metadata (Nov 18, 2025)
- Implemented comprehensive cache invalidation: All mutations now invalidate related queries ensuring real-time UI updates across all views without manual refresh (Nov 18, 2025)
- Implemented smart auto-complete feature: Setting status to "Completed" automatically marks all episodes as watched, and marking all episodes watched auto-updates status to "Completed" (Nov 18, 2025)
- Enhanced responsive design: ShowCard component now uses horizontal layout on mobile devices (w-32 poster on left, content on right) and vertical layout on larger screens (Nov 18, 2025)
- Redesigned dashboard: Replaced "Recently Added" section with "Start Watching" section showing Want to Watch shows; fixed stats card alignment with min-h-8 ensuring figures stay aligned when titles wrap (Nov 18, 2025)
- Updated default show status: New shows from search now default to "Want to Watch" instead of "Watching" for better user workflow (Nov 18, 2025)
- Added episode marking confirmation: When marking an episode watched, users are now prompted with option to mark all previous episodes as watched, improving batch tracking efficiency (Nov 18, 2025)
- Updated cache invalidation strategy: All mutations now invalidate /api/shows/want-to-watch instead of deprecated /api/shows/recent endpoint (Nov 18, 2025)
- **Implemented complete episode caching and status inference system** (Nov 18, 2025):
  - Episodes are automatically cached in database with air dates when shows are added
  - Status is automatically inferred based on watch progress and aired episodes (not total episodes)
  - Status inference: No watched episodes → "Want to Watch", some watched → "Watching", all aired watched + ended show → "Completed"
  - System accurately handles ongoing shows, ended shows, and limited series
  - Runs efficiently without blocking API responses using background tasks

## Known Issues
- Database schema must be manually executed in Supabase (see DATABASE_SETUP.md)
- Import feature requires user to have CSV file from TV Time export
- RLS policies currently set to public access (should be restricted for production)

## Technical Implementation Notes

### Data Field Mapping
The application uses a consistent pattern for API responses:
- **Database**: Uses snake_case column names (poster_path, first_air_date, user_id, etc.)
- **API Responses**: All endpoints map to camelCase (posterPath, firstAirDate, userId, etc.)
- **Helper Functions**: `getShowsWithProgress()` and `calculateShowProgress()` centralize field mapping logic
- **Consistent Mapping**: Every API endpoint (show detail, progress, lists) returns uniform camelCase JSON

### Cache Management
All mutations implement comprehensive cache invalidation:
- **Adding Shows**: Invalidates `/api/user/shows`, `/api/stats`, `/api/shows/watching`, `/api/shows/completed`, `/api/shows/want-to-watch`, `/api/shows/continue-watching`
- **Updating Status**: Invalidates all of the above plus `/api/shows/:id`
- **Progress Updates**: Invalidates `/api/shows/:id/progress`, `/api/shows/:id`, and all list queries
- This ensures the UI stays synchronized across all views without requiring manual page refreshes

### Auto-Complete Feature
The application implements intelligent episode tracking to reduce manual work:

**Smart Auto-Complete (Status → Episodes)**:
- When a user marks a show as "Completed", the system automatically marks all episodes as watched
- Implementation: `markShowEpisodesWatched()` fetches all seasons/episodes from TMDB and bulk upserts watch_progress records
- Uses chunked batch processing (100 records per batch) to respect Supabase limits
- Handles shows with hundreds of episodes efficiently (e.g., Breaking Bad with 62 episodes, The Office with 186 episodes)

**Reciprocal Auto-Update (Episodes → Status)**:
- When all episodes are manually marked watched (via individual toggles or "Mark All" for seasons), the show status automatically updates to "Completed"
- Implementation: `checkAndUpdateCompletedStatus()` compares watched episode count to total episodes after each progress update
- Ensures the show appears in the Completed collection and statistics reflect accurate episode counts

This bidirectional sync keeps the UI consistent and reduces the need for users to manually update both status and individual episodes.

## Future Enhancements
- Additional import sources (Trakt.tv, MyAnimeList)
- Show recommendations based on viewing history
- Social features for sharing lists
- Calendar view for upcoming episodes
- Email notifications for new episodes
- Better search with filters (genre, year, rating)
- User ratings and notes for shows
- Export functionality
