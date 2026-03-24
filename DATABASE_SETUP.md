# Database Setup Instructions

The app stores all application data in **Supabase (PostgreSQL)**. The API uses the Supabase client with your project URL and anon key; apply the SQL in this repo once per project.

## Apply the schema (Supabase SQL Editor)

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL** → **New query**.
3. Paste the full contents of [`database-schema.sql`](./database-schema.sql) from this repository.
4. Run the query.

This creates tables, indexes, and RLS policies as defined in that file.

## Verify installation

In **Table Editor**, you should see (among others):

- `users`
- `user_credentials` (legacy rows for old local-password users; new Auth0-only users may not need rows here)
- `shows`
- `user_shows`
- `seasons`
- `episodes`
- `watch_progress`
- `import_history`

## Notes

- **Authentication in the app is Auth0**, not Supabase Auth. The `users` table links profiles to Auth0 via `auth0_id`. See [AUTH0_SETUP.md](./AUTH0_SETUP.md).
- **RLS**: The bundled schema may use broad or public policies. For production, tighten policies so each user can only access their own rows (or enforce access solely in your API and lock down anon usage accordingly).
- There is no `supabase/` migration folder in this repo; treat `database-schema.sql` as the source of truth unless you maintain your own migrations elsewhere.
