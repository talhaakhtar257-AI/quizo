// A Server Action's thrown Error only survives the client boundary as a
// plain Error with just `.message` — custom Error subclasses don't survive
// serialization, so a distinguishable string prefix is the only reliable way
// for a form to tell "you hit a plan limit, show the upgrade prompt" apart
// from an ordinary validation error. Same pattern the signup trigger already
// uses for its own prefixed Postgres exceptions (see actions/pages that
// split on ":").
const PLAN_LIMIT_PREFIX = "PLAN_LIMIT:";

export function planLimitError(message: string): Error {
  return new Error(`${PLAN_LIMIT_PREFIX}${message}`);
}

// Returns the plain-English message with the prefix stripped, or null if
// this error isn't a plan-limit error (an ordinary error should render as
// plain red text, not the upgrade prompt).
export function parsePlanLimitError(error: unknown): string | null {
  if (error instanceof Error && error.message.startsWith(PLAN_LIMIT_PREFIX)) {
    return error.message.slice(PLAN_LIMIT_PREFIX.length);
  }
  return null;
}
