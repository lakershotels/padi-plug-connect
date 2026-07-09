import type { CapacitorConfig } from "@capacitor/cli";

/**
 * PadiPlug — Capacitor config for native iOS/Android builds.
 *
 * Development (hot-reload against the Lovable preview):
 *   The `server.url` below points to the Lovable preview URL so the native
 *   shell loads the live app while you iterate. For a store-ready build,
 *   remove the `server` block and run `bun run build` + `npx cap sync` so
 *   the app ships bundled web assets from `dist/`.
 */
const config: CapacitorConfig = {
  appId: "app.lovable.padiplug",
  appName: "PadiPlug",
  webDir: "dist",
  server: {
    url: "https://6bbef027-e176-4a83-b64b-97d077ac434a.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  ios: {
    contentInset: "always",
  },
  android: {
    backgroundColor: "#ffffff",
  },
};

export default config;
