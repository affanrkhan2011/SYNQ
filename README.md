# SYNQ

SYNQ is a student-focused team project management app for organizing projects, tasks, chat, and shared resources.

## Tech stack
- Vite + React + TypeScript
- Supabase Auth for Google sign-in
- Supabase Postgres for persistent user/project data

## Getting started
1. Install dependencies: `npm install`
2. Create a local environment file:
   - copy `.env.example` to `.env.local`
3. Fill in your Supabase credentials:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Run the app: `npm run dev`

## Build
- `npm run build`
- `npm run preview`

## Deploying to Vercel
Set these environment variables in your Vercel project:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then redeploy the site.

## Supabase setup
Run `supabase/schema.sql` in the Supabase SQL editor to create the tables and policies the app expects.

The database stores personalized user data such as:
- user profiles
- projects
- memberships
- tasks
- messages
- documents

## OAuth setup
In Supabase Auth:
- enable Google provider
- add your Vercel domain to allowed redirect URLs, including `/auth/callback`

## Notes
- The app automatically creates/updates the signed-in user's profile in Supabase.
- If the site shows a connection screen, check that the Vercel environment variables match the active Supabase project.
