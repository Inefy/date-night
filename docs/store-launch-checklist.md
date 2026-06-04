# Store Launch Checklist

Use this checklist before promoting Date Night Deck from internal testing to a public App Store or Google Play release.

## Repository Gates

- Run `npm test`.
- Run `npm run typecheck`.
- Run `npx expo install --check`.
- Run `npx expo-doctor`.
- Export bundles with `npx expo export --platform ios`, `npx expo export --platform android`, and `npx expo export --platform web`.
- Confirm no `.env`, signing key, App Store Connect API key, Google Play service account JSON, provisioning profile, or keystore file is staged.

## EAS Setup

- Run `npx eas-cli login`.
- Run `npx eas-cli init` if the project is not linked to an EAS project yet.
- Set `EXPO_PUBLIC_SUPABASE_URL` in the EAS `production` environment.
- Set `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the EAS `production` environment.
- Configure iOS signing credentials with `npx eas-cli credentials -p ios`.
- Configure Android signing credentials with `npx eas-cli credentials -p android`.
- Add App Store Connect and Google Play credentials through EAS secrets or the EAS dashboard. Do not commit credential files.

## Native Identifiers

- iOS bundle identifier: `com.inefy.datenightdeck`.
- Android package name: `com.inefy.datenightdeck`.
- URL scheme: `datenightdeck`.
- Universal/app link domain: `datenightdeck.app`.

Change these only before the first store upload. After the first upload, package and bundle identifiers become store identity.

## App Store Connect

- Create the App Store Connect app record for `com.inefy.datenightdeck`.
- Confirm the app category, age rating, support URL, marketing URL, and privacy policy URL.
- Complete App Privacy answers for account data, couple/date planning content, calendar access, diagnostics, and any analytics actually enabled in production.
- Add iPhone and iPad screenshots for all required device classes.
- Add launch copy from `docs/launch-copy.md`.
- Add reviewer notes that explain the invite flow, calendar permission prompt, and any account requirement.
- Confirm `usesNonExemptEncryption` remains `false` unless custom encryption is added.
- Upload a production iOS build with `npx eas-cli build --profile production --platform ios`.
- Submit with `npx eas-cli submit --platform ios --latest --profile production` after metadata and credentials are ready.

## Google Play Console

- Create the Play Console app record for `com.inefy.datenightdeck`.
- Complete app access, content rating, target audience, data safety, ads declaration, and privacy policy.
- Add phone and tablet screenshots for the Play listing.
- Add launch copy from `docs/launch-copy.md`.
- Start with internal testing and tester access before requesting production rollout.
- Upload a production Android app bundle with `npx eas-cli build --profile production --platform android`.
- Submit with `npx eas-cli submit --platform android --latest --profile production`. The production submit profile targets the internal track as a draft.

## Deep Links

- Serve the Apple App Site Association file for `datenightdeck.app`.
- Serve the Android Digital Asset Links file for `datenightdeck.app`.
- Test `https://datenightdeck.app/mystery/{token}` from Messages, Mail, Chrome, and Safari on physical devices.
- Confirm invalid, expired, and already claimed mystery links show useful fallback states.

## Device QA

- Test on at least one current iPhone and one current Android phone.
- Test on an iPad or iOS simulator because tablet support is enabled.
- Verify auth, sign out, invite creation, invite acceptance, mystery card reveal, and calendar save.
- Verify behavior when calendar permission is granted, denied, and changed later in system settings.
- Verify offline and poor-network states for auth, invite loading, and mystery card loading.
- Verify app resume after backgrounding during auth and invite flows.
- Verify text scaling and safe-area layout on small phones, large phones, and tablets.
- Verify release builds do not log secrets, Supabase service keys, or invite tokens unnecessarily.

## Release Path

- Run `npx eas-cli build --profile production --platform all` for a manual release candidate.
- Use the `Release` EAS workflow for tag-based release builds after credentials and store records are ready.
- Tag releases as `v1.0.0`, `v1.0.1`, and so on.
- Promote Android from internal testing to closed testing, open testing, then production when store checks and QA pass.
- Release iOS through TestFlight first, then submit the same build for App Review when QA passes.
