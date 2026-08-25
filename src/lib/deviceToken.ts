const STORAGE_KEY = "stolikqr.deviceToken";

/**
 * A stable per-browser identifier, separate from any GuestSession id.
 * Persists indefinitely (not scoped to one table/visit) so the backend can
 * recognize "this is the same phone coming back" and resume the right
 * session after a reload — see backend GuestSessionsService.createOrResume.
 */
export function getOrCreateDeviceToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    // Storage may be unavailable - fall back to a per-call token; resumption
    // just won't work across reloads in that case.
    return crypto.randomUUID();
  }
}
