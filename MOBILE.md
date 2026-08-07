# PadiPlug — Mobile (iOS / Android) via Capacitor

The web app is the source of truth. Capacitor wraps it into native iOS and
Android shells so you can publish to the App Store and Google Play.

## First-time setup

1. Clone the repository locally.
2. `cd padiplug && npm install`.
3. Add the native platforms once:
   ```bash
   npx cap add ios
   npx cap add android
   ```
4. Pull in the latest web build every time:
   ```bash
   npm run build && npx cap sync
   ```
5. Open in the native IDEs:
   ```bash
   npx cap open ios       # Xcode (requires macOS)
   npx cap open android   # Android Studio
   ```
6. Run on a device / simulator with the usual **Run** button.

## Hot-reload during development

For local development, set `CAPACITOR_SERVER_URL` to a running local or
remote dev server. For a production/App-Store build, remove the `server`
block so the app ships its own bundled assets from `dist/`.

## App identity

- Bundle ID: `app.padiplug.connect`
- Display name: `PadiPlug`

Update both in `capacitor.config.ts` before your first store submission.

## Store submission checklist

- App icons + splash — generate with `@capacitor/assets` or Xcode / Android
  Studio asset tools.
- Privacy policy URL: `https://<your-domain>/privacy`
- Terms URL: `https://<your-domain>/terms`
- iOS: Apple Developer account, App Store Connect entry, TestFlight build.
- Android: Play Console account, signed AAB via Android Studio.

## Requirements

- macOS + Xcode 15+ for iOS builds.
- Android Studio Hedgehog+ with SDK 34 for Android builds.
- Node 20+ and Bun (this repo uses Bun by default).
