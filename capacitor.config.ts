import type { CapacitorConfig } from "@capacitor/cli";

/**
 * PadiPlug — Capacitor config for native iOS/Android builds.
 *
 * Development:
 *   Set `CAPACITOR_SERVER_URL` to a running local or remote dev server for
 *   hot reload. For production builds, remove the `server` block so the app
 *   ships its bundled assets from `dist/`.
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: "app.padiplug.connect",
  appName: "PadiPlug",
  webDir: "dist",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: true,
        },
      }
    : {}),
  ios: {
    contentInset: "always",
  },
  android: {
    backgroundColor: "#ffffff",
  },
};

export default config;
