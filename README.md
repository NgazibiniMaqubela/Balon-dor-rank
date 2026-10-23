# Balon Dor Rank

React + Vite community football rankings app, deployed to GitHub Pages and connected to Firebase.

## Local development

1. Install Node.js 22 LTS (or a current supported Node.js release).
2. Copy `.env.example` to `.env.local` and fill in the Firebase Web App configuration.
3. Run `npm install`.
4. Run `npm run dev`.

## GitHub Pages deployment

The repository is configured for the project URL:

`https://ngazibinimaqubela.github.io/Balon-dor-rank/`

The `.github/workflows/deploy.yml` workflow builds and publishes the app when code is pushed to `main`. In GitHub, open **Settings → Pages** and set the build/deployment source to **GitHub Actions**.

Add these repository Actions secrets under **Settings → Secrets and variables → Actions**:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Firebase voter code setup

The voting code is looked up by document ID. In Firestore, create a document under `voterCodes` whose **document ID is exactly the code**, for example `BALON26-DEMO`. Add fields:

- `year` — number `2026`
- `status` — string `available`

An optional `code` string field can also be included, but the document ID must match the code entered by the voter. A document created with Auto-ID will not be found by the current app's direct lookup.

Enable Anonymous Authentication and publish `firestore.rules`. Do not put a Firebase service-account JSON file or private key in this repository.

## Routing and ballot

The app uses `HashRouter` so refreshing an in-app page works on GitHub Pages. The voting page uses player cards with rank selectors. Duplicate ranks prompt the voter to swap positions, replace the current holder (leaving that player unranked), or cancel. Submission requires all 30 players to have distinct ranks.

Portrait thumbnails are requested from Wikipedia when available; a neutral fallback avatar appears if no thumbnail is available.
