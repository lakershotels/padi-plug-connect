import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/start-server-core";

function getClientShellHtml() {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>PadiPlug</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
}

type ServerEntry = {
  fetch: (
    request: Request,
    env: unknown,
    ctx: unknown,
  ) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

// Try to import the framework-provided server entry, but don't let a hung
// transport block the dev server. In dev we fallback to a CSR page so the
// app can load while preserving SSR behavior for production.
async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    // Import the server helper directly to avoid a circular import that
    // resolves to the virtual server-entry module. Build a simple handler
    // using the official helpers.
    const importPromise = import("@tanstack/react-start/server").then((m) => {
      const createStartHandler = (m as any).createStartHandler;
      const defaultStreamHandler = (m as any).defaultStreamHandler;

      if (typeof createStartHandler !== "function") {
        throw new Error("createStartHandler not found");
      }

      const fetchFn = createStartHandler(defaultStreamHandler);

      return { fetch: fetchFn } as ServerEntry;
    });

    const timeoutPromise = new Promise<never>((_, rej) =>
      setTimeout(
        () => rej(new Error("server-entry import timeout")),
        20_000,
      ),
    );

    serverEntryPromise = Promise.race([
      importPromise,
      timeoutPromise,
    ]);
  }

  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(
  response: Response,
): Promise<Response> {
  if (response.status < 500) {
    return response;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return response;
  }

  const body = await response.clone().text();

  if (!isH3SwallowedErrorBody(body)) {
    return response;
  }

  console.error(
    consumeLastCapturedError() ??
      new Error(`h3 swallowed SSR error: ${body}`),
  );

  return new Response(renderErrorPage(), {
    status: 500,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as {
      unhandled?: unknown;
      message?: unknown;
    };

    return (
      payload.unhandled === true &&
      payload.message === "HTTPError"
    );
  } catch {
    return false;
  }
}

export default {
  async fetch(
    request: Request,
    env: unknown,
    ctx: unknown,
  ) {
    // In dev, prefer a resilient import with a fast fallback to CSR.
    try {
      const handler = await getServerEntry();

      const response = await handler.fetch(
        request,
        env,
        ctx,
      );

      return await normalizeCatastrophicSsrResponse(
        response,
      );
    } catch (error) {
      console.error("SSR disabled or failed:", error);

      // If we are in the Vite dev server, serve a client-side shell to keep
      // the app usable during development while avoiding the virtual-module
      // transport hang. Production builds will still use SSR.
      try {
        const metaEnv = (import.meta as any).env as
          | Record<string, any>
          | undefined;

        const isDev = !!(
          metaEnv &&
          (
            metaEnv.TSS_DEV_SERVER === "true" ||
            metaEnv.DEV === true
          )
        );

        const envFlag =
          isDev ||
          (typeof process !== "undefined" &&
            process.env?.TSS_DEV_SERVER === "true");

        if (envFlag) {
          return new Response(
            getClientShellHtml(),
            {
              status: 200,
              headers: {
                "content-type":
                  "text/html; charset=utf-8",
              },
            },
          );
        }
      } catch {
        // Ignore environment detection errors and
        // fall through to the normal error page.
      }

      return new Response(renderErrorPage(), {
        status: 500,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });
    }
  },
};