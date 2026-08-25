const TOKEN_KEY = "stolikqr.staffToken";
const STAFF_KEY = "stolikqr.staffInfo";

export interface StoredStaff {
  id: string;
  name: string;
  email: string;
  restaurantId: string;
}

export function getStaffToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredStaff(): StoredStaff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STAFF_KEY);
    return raw ? (JSON.parse(raw) as StoredStaff) : null;
  } catch {
    return null;
  }
}

export function storeStaffSession(token: string, staff: StoredStaff): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
  } catch {
    // Storage may be unavailable - the caller will just have to re-login next time.
  }
}

export function clearStaffSession(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(STAFF_KEY);
  } catch {
    // ignore
  }
}
