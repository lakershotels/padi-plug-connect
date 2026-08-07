type ErrorReportOptions = {
  boundary?: string;
  metadata?: Record<string, unknown>;
};

export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  const prefix = context.boundary ? `[${context.boundary}] ` : "";
  if (error instanceof Error) {
    console.error(`${prefix}${error.message}`, { ...context, error });
  } else {
    console.error(`${prefix}Unknown error`, { ...context, error });
  }
}
