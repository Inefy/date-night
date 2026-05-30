# Date Night Deck

MVP foundation for a React Native app built with Expo, TypeScript, and Expo Router.

## Setup

```bash
npm install
npm run start
```

## Environment

Create a local `.env` from `.env.example` and set:

```bash
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
```

The Supabase publishable key is allowed in client apps only when Row Level Security is enforced. Legacy anon keys are still supported as a fallback during migration. Never add a service role or secret key to the app.

For EAS builds, create the same variables in the matching EAS environment (`development`, `preview`, or `production`). Do not commit real `.env` files, service role keys, signing keys, or store credentials.

## Internal Builds

The Expo config uses placeholder native identifiers:

```text
iOS bundle identifier: com.inefy.datenightdeck
Android package: com.inefy.datenightdeck
URL scheme: datenightdeck
```

Replace the identifiers before store submission if a different production namespace is needed.

Build profiles are defined in `eas.json`:

```bash
npx eas-cli login
npx eas-cli init
npx eas-cli build --profile development --platform ios
npx eas-cli build --profile preview --platform all
npx eas-cli build --profile production --platform all
```

Use `preview` for internal installable testing builds. The `development` profile is configured for an iOS simulator build and Android APK without bundling secrets in source control.

## Useful Commands

```bash
npm run android
npm run ios
npm run web
npm test
npm run typecheck
```

## QA and Launch Notes

- Manual MVP QA checklist: `docs/mvp-qa-checklist.md`
- Launch copy and store positioning: `docs/launch-copy.md`
- Run `npm test` and `npm run typecheck` before sharing an internal build.
