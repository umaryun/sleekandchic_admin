// NEXT_PUBLIC_* values are inlined at build time, so a missing value would ship
// an admin that silently talks to localhost. Fail the production build instead.
const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!configuredApiUrl && process.env.NODE_ENV === "production") {
  throw new Error("NEXT_PUBLIC_API_URL must be set, e.g. https://sleekandchic.com/api/v1");
}

/** Storefront API base, e.g. https://sleekandchic.com/api/v1 */
export const API_BASE_URL = (configuredApiUrl || "http://localhost:3000/api/v1").replace(/\/$/, "");

/** Storefront origin, e.g. https://sleekandchic.com (auth endpoints and relative image paths) */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, "");
