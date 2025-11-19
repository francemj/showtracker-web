# TV Tracker - TV Show Tracking Application

## Overview
TV Tracker is a comprehensive web-based application enabling users to search for TV shows, track their watching progress across seasons and episodes, manage their collection, and import watch history from TV Time. The project aims to provide a seamless and intuitive experience for TV enthusiasts to organize and monitor their viewing habits.

## User Preferences
I prefer simple language. I want iterative development. Ask before making major changes. I prefer detailed explanations. Do not make changes to the folder Z. Do not make changes to the file Y.

## System Architecture

### UI/UX Decisions
The application features a modern and responsive design with a customizable dark/light theme toggle. It utilizes card-based layouts with subtle shadows, rounded corners, and hover elevation effects. The primary color scheme uses Indigo, Purple for accents, and Emerald for success/progress states. Typography is managed with Poppins for headings and Inter for body text. Loading skeletons and empty states are implemented for improved user experience.

### Technical Implementations
The frontend is built with React 18 and TypeScript, utilizing Wouter for routing, TanStack Query for state management, and Tailwind CSS with Shadcn UI for styling. Forms are handled with React Hook Form and Zod validation. The backend uses Express.js with TypeScript, with Supabase serving as the PostgreSQL database. Authentication is managed via Auth0, with a gradual migration strategy for legacy users from bcrypt. Session management is handled by `express-session`, and CSV parsing for import functionality uses PapaParse.

### Feature Specifications
- **Authentication**: User signup/login via Auth0, session-based authentication, protected routes, and user profile management.
- **Show Management**: Search, add, update, and categorize shows (Want to Watch, Watching, Completed).
- **Progress Tracking**: Mark episodes/seasons as watched, visual progress bars, dashboard statistics, smart auto-completion (show status updates based on episode progress), and reciprocal auto-update (episode progress updates show status).
- **Data Import**: TV Time CSV import with automatic show matching and import result reporting.
- **Smart Auto-Complete (Status → Episodes)**: When a user marks a show as "Completed", all episodes are automatically marked as watched, efficiently handling large numbers of episodes.
- **Reciprocal Auto-Update (Episodes → Status)**: When all episodes are manually marked watched, the show status automatically updates to "Completed".
- **Episode Caching and Status Inference**: Episodes are cached in the database with air dates. Show status is inferred based on watch progress and aired episodes (not total episodes), accurately handling ongoing, ended, and limited series.
- **Bulk Unwatch Functionality**: Users can unmark episodes as unwatched, with smart prompts to unmark succeeding episodes. Similarly, prompts appear to mark previous episodes when marking an episode watched.

### System Design Choices
- **Data Field Mapping**: Consistent mapping from snake_case database column names to camelCase in API responses across all endpoints.
- **Cache Management**: Comprehensive cache invalidation implemented for all mutations to ensure real-time UI updates across various views.
- **Gradual Authentication Migration**: Auth0 integration supports new user signups directly and provides a robust, idempotent migration path for existing users from a bcrypt-based system.

## External Dependencies

-   **Auth0**: User authentication and authorization.
-   **Supabase**: PostgreSQL database and real-time capabilities.
-   **TMDB API**: Provides TV show data, including search, details, seasons, and episodes.