# Balon Dor Rank

A mobile-first community football ranking PWA for the 2024–2026 editions.

## Stack
- React + Vite
- React Router
- Firebase Authentication + Firestore
- GitHub Pages
- PWA-ready

## 2026 voting rules
30 nominees are ranked from #1 to #30. #1 receives 30 points and #30 receives 1 point. A full ballot therefore contributes 465 points.

## Local test
```bash
npm install
npm run dev -- --host 0.0.0.0
```
Open the shown LAN URL on your phone while the phone and computer are on the same Wi-Fi. With no Firebase environment variables, submissions run in **demo mode** and are saved only for the current device/session behavior.

## Firebase production setup
1. Create a Firebase project.
2. Create a Web app and copy its config into `.env.local` using `.env.example`.
3. Enable Authentication > Sign-in method > Anonymous.
4. Create Firestore in production/test mode, then apply `firestore.rules`.
5. Create 2026 voter-code documents under `voterCodes`, e.g. document ID `BALON26-A7F2` with `{year: 2026, status: 'available'}`.
6. Add the same environment variables to GitHub Actions repository secrets or variables.
7. Build/deploy with `npm run build` and publish `dist` to GitHub Pages.

## Production notes
- The public Admin page is intentionally a demo control surface. Do not use client-side admin controls to manage a real election.
- For production administration, use Firebase Authentication plus custom claims or a protected server-side admin process to publish/close results.
- Results should remain hidden while voting is open to reduce voter influence.

## GitHub Pages deployment
1. Push this project to a GitHub repository on the `main` branch.
2. In GitHub: Settings > Pages > Source: GitHub Actions.
3. Add these repository Actions secrets under Settings > Secrets and variables > Actions:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. Push to `main`; the workflow builds and deploys the `dist` folder.
5. If the repository is named `balon-dor-rank`, Vite's relative base is already configured for a project-page URL.

## First real-vote test
Create one Firestore document in `voterCodes` with ID `BALON26-DEMO` and fields:
`year: 2026`, `status: "available"`.
Enable Firebase Authentication > Sign-in method > Anonymous. Then open the app and submit a full 30-player ballot with `BALON26-DEMO`. The vote document will be private; it cannot be read by the public client.
# Balon-dor-rank
