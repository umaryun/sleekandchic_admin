import { useState, useEffect } from "react";
import { createAuthClient } from "better-auth/client";
import { bearer } from "better-auth/plugins";
import { AdminUser } from "./types/api";
import { API_BASE_URL, API_ORIGIN } from "./config";

export const authClient = createAuthClient({
  baseURL: API_ORIGIN,
  plugins: [bearer()],
});

export const TOKEN_KEY = "slickandchick_admin_token";
export const ADMIN_USER_KEY = "slickandchick_admin_user";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

/** With `remember` off, the session ends when the browser is closed. */
export function setStoredToken(token: string, remember: boolean) {
  if (typeof window === "undefined") return;
  removeStoredToken();
  (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

export function removeStoredToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
  sessionStorage.removeItem(ADMIN_USER_KEY);
}

/** The staff member last confirmed by the server, or null. Never guessed. */
export function getStoredAdmin(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ADMIN_USER_KEY) || sessionStorage.getItem(ADMIN_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

/** Stored alongside the token, in the same storage. */
export function setStoredAdmin(admin: AdminUser) {
  if (typeof window === "undefined") return;
  const storage = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
  storage.setItem(ADMIN_USER_KEY, JSON.stringify(admin));
}

export class NotStaffError extends Error {
  constructor() {
    super("This account doesn't have access to the admin console.");
  }
}

/**
 * Asks the server who the token belongs to. Throws NotStaffError for a
 * customer account and an Error with status 401 for an expired session.
 */
export async function fetchCurrentAdmin(token: string): Promise<AdminUser> {
  const res = await fetch(`${API_BASE_URL}/admin/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 403) throw new NotStaffError();
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(body?.error || "Couldn't check your session"), { status: res.status });
  }
  return body.data as AdminUser;
}

/** Ends the session on the server, not just in this browser. */
export async function signOut(token = getStoredToken()) {
  if (token) {
    await fetch(`${API_ORIGIN}/api/auth/sign-out`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}",
    }).catch(() => {
      // Offline: the session still expires on the server within 12 hours.
    });
  }
  removeStoredToken();
}

export function isSuperAdmin(user?: AdminUser | null): boolean {
  const admin = user ?? getStoredAdmin();
  return admin?.role === "super_admin";
}

export function useCurrentAdmin() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAdmin(getStoredAdmin());
    setLoading(false);
  }, []);

  return {
    admin,
    loading,
    isSuperAdmin: admin?.role === "super_admin",
  };
}
