import type { CapacitorConfig } from "@capacitor/cli";

/**
 * PadiPlug — Capacitor config for native iOS/Android builds.
 *
 * Development (hot-reload against local web dev):
 *   The native shell can point to the local Vite dev server while you iterate.
 *   For a store-ready build, remove the `server` block and run `bun run build`
 *   + `npx cap sync` so the app ships bundled web assets from `dist/`.
 */
const config: CapacitorConfig = {
  appId: "app.my.padiplug",
  appName: "PadiPlug",
  webDir: "dist",
  ios: {
    contentInset: "always",
  },
  android: {
    backgroundColor: "#ffffff",
  },
};

export default config;
