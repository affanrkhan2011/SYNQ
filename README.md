<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SYNQ

Team project management site for student groups.

## Local dev

**Prerequisites:** Node.js + a Firebase project (Auth)

1. Install deps: `npm install`
2. Create `.env.local` using `.env.example` and fill in the `VITE_FIREBASE_*` values from Firebase Console.
3. Run: `npm run dev`

## Deploy (Render)

- Build command: `npm run render-build`
- Start command: `npm start`

### Environment variables (Render frontend + API)

Set these in Render service Environment:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (optional)
- `VITE_API_BASE_URL` (optional, leave empty when frontend and API are same service)
- `DATABASE_URL` (Render Postgres connection string)
- `FIREBASE_SERVICE_ACCOUNT_JSON` (full Firebase service account JSON as one-line string)

Also add your Render domain in Firebase Console -> Authentication -> Settings -> Authorized domains.

## Migration note

- Firebase Auth remains active.
- Project persistence (`/api/projects`) now runs through Render API + Postgres.
- Group tasks/chat/docs are still on Firestore and can be migrated in a follow-up pass.
