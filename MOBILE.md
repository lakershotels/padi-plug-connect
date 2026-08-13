# PadiPlug — Mobile (iOS / Android) via Capacitor

The web app is the source of truth. Capacitor wraps it into native iOS and
Android shells so you can publish to the App Store and Google Play.

## First-time setup (on your own laptop, not in Lovable)

1. In Lovable click **GitHub → Export to GitHub**, then `git clone` the repo.
2. `cd padiplug && bun install` (or `npm install`).
3. Add the native platforms once:
   ```bash
   npx cap add ios
   npx cap add android
   ```
4. Pull in the latest web build every time:
   ```bash
   bun run build && npx cap sync
   ```
5. Open in the native IDEs:
   ```bash
   npx cap open ios       # Xcode (requires macOS)
   npx cap open android   # Android Studio
   ```
6. Run on a device / simulator with the usual **Run** button.

## Hot-reload during development

`capacitor.config.ts` already points `server.url` at the Lovable preview so
the native shell hot-reloads while you make changes here. For a
production/App-Store build **delete the `server` block** so the app ships
its own bundled assets from `dist/`.

## App identity

- Bundle ID: `app.lovable.padiplug`
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
