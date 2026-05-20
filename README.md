<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SYNQ

Team project management site for student groups.

## Local dev

**Prerequisites:** Node.js + a Firebase project (Auth + Firestore)

1. Install deps: `npm install`
2. Create `.env.local` using `.env.example` and fill in the `VITE_FIREBASE_*` values from Firebase Console.
3. Run: `npm run dev`

## Firestore rules

Deploy `firestore.rules` in Firebase Console (or via the Firebase CLI) so tasks/chat/docs/admin features can read/write.

## Vercel

- Build: `npm run build`
- Output: `dist`
- SPA routing: `vercel.json` includes a rewrite so deep links like `/groups/:groupId` work on refresh.
