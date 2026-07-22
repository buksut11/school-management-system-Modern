// Turns a database/PostgREST error into a message that's safe and clear
// to show a non-technical user. Raw Postgres errors name columns,
// constraints, and tables — useful to a developer, but confusing to a
// school clerk and a small information leak. This maps the common error
// codes to plain language and hides everything else behind a generic
// line (while still logging the real error on the server for debugging).
//
// One deliberate exception: our own database functions raise their own
// readable messages (SQLSTATE P0001) — e.g. "Payment exceeds the
// outstanding balance" or "That teacher already has a lesson then". Those
// are written for users, so they pass straight through.

type MaybeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
} | null | undefined;

function asError(error: unknown): MaybeError {
  if (error && typeof error === "object") return error as MaybeError;
  return null;
}

const BY_CODE: Record<string, string> = {
  // unique_violation — a record with the same key already exists
  "23505": "A record with these details already exists.",
  // foreign_key_violation — still linked to other records
  "23503": "This record is linked to other data, so it can't be changed or removed.",
  // check_violation — a value broke a rule (range, allowed set)
  "23514": "Some of the values entered aren't allowed. Please check and try again.",
  // not_null_violation — a required field was blank
  "23502": "A required field is missing.",
  // invalid_text_representation — bad number/uuid/etc.
  "22P02": "Some of the information isn't in the right format.",
  // datetime errors
  "22007": "A date wasn't entered correctly.",
  "22008": "A date wasn't entered correctly.",
  // numeric out of range
  "22003": "A number is too large.",
  // insufficient_privilege / RLS denial
  "42501": "You don't have permission to do that.",
};

export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const err = asError(error);
  const code = err?.code ?? undefined;

  // Our own RPCs raise messages meant for users — trust them.
  if (code === "P0001" && err?.message) return err.message;

  if (code && BY_CODE[code]) return BY_CODE[code];

  // Anything unrecognised: log the real thing server-side, show a safe
  // generic message. (No-op in the browser; visible in server logs.)
  if (err) console.error("Unhandled action error:", err);

  return fallback;
}
