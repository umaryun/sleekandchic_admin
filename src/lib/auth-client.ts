import { createAuthClient } from "better-auth/client";
import { bearer } from "better-auth/plugins";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, "") ||
  "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  plugins: [bearer()],
});

export const TOKEN_KEY = "slickandchick_admin_token";

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
}
