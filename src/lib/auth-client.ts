import { useState, useEffect } from "react";
import { createAuthClient } from "better-auth/client";
import { bearer } from "better-auth/plugins";
import { AdminUser, AdminRole } from "./types/api";
import { API_ORIGIN } from "./config";

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

export function setStoredToken(token: string, remember: boolean = true) {
  if (typeof window === "undefined") return;
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
}

export function removeStoredToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
  sessionStorage.removeItem(ADMIN_USER_KEY);
}

export function getStoredAdmin(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ADMIN_USER_KEY) || sessionStorage.getItem(ADMIN_USER_KEY);
  if (!raw) {
    // Default fallback super admin if token exists but no profile stored yet
    const token = getStoredToken();
    if (token) {
      return {
        id: "admin-super",
        name: "Admin Manager",
        email: "admin@slickandchic.com",
        role: "super_admin",
        status: "active",
        createdAt: new Date().toISOString(),
      };
    }
    return null;
  }
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function setStoredAdmin(admin: AdminUser, remember: boolean = true) {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(admin);
  if (remember) {
    localStorage.setItem(ADMIN_USER_KEY, serialized);
  } else {
    sessionStorage.setItem(ADMIN_USER_KEY, serialized);
  }
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

  const updateAdminRole = (role: AdminRole) => {
    if (admin) {
      const updated = { ...admin, role };
      setStoredAdmin(updated);
      setAdmin(updated);
    }
  };

  return {
    admin,
    loading,
    isSuperAdmin: admin?.role === "super_admin",
    role: admin?.role || ("admin" as AdminRole),
    updateAdminRole,
  };
}
