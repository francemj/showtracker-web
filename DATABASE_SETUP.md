# Database Setup Instructions

This application uses Supabase (PostgreSQL) for data persistence. Follow these steps to set up the database:

## Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor tab (in the left sidebar)
3. Click "New Query"
4. Copy the entire contents of `database-schema.sql` from this project
5. Paste into the SQL editor
6. Click "Run" to execute the schema

This will create all necessary tables, indexes, and policies.

## Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db push
```

## Verify Installation

After running the schema, you should see these tables in your Supabase database:

- users
- user_credentials
- shows
- user_shows
- seasons
- episodes
- watch_progress
- import_history

## Notes

- The schema includes Row Level Security (RLS) policies set to public access
- In production, you should configure proper RLS policies based on user authentication
- The current setup uses simplified authentication with password hashing
- For production use, consider implementing proper OAuth with Auth0 or Supabase Auth
