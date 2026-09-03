// When a student reports "it said it could not save my answer", there was
// previously nothing anywhere to look at — the route returned a friendly
// message and threw the real reason away. Vercel captures anything written
// to stderr and keeps it in the Runtime Logs, so a single structured line at
// each failure point is the whole of this project's error monitoring: free,
// no extra service, and enough to tell a broken database apart from a broken
// query.
//
// Never log a value that could be personal or secret. IDs are fine — they
// mean nothing without database access. Answer text, email addresses and API
// keys are not.

interface ErrorContext {
  [key: string]: string | number | boolean | null | undefined;
}

export function logServerError(where: string, error: unknown, context: ErrorContext = {}): void {
  const detail =
    error instanceof Error
      ? { message: error.message, name: error.name }
      : typeof error === "object" && error !== null
        ? { message: JSON.stringify(error).slice(0, 500), name: "object" }
        : { message: String(error), name: typeof error };

  console.error(
    `[quizo] ${where} failed: ${detail.message}`,
    JSON.stringify({ where, error: detail, ...context })
  );
}
