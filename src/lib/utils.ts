import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { API_ORIGIN } from "./config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format amount in Nigerian Naira (NGN)
 * Example: 150000 -> ₦150,000.00
 */
export function formatNGN(amount: number | string | null | undefined): string {
  const numericAmount = Number(amount || 0);
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

/**
 * Format ISO date string into readable format
 */
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "N/A";
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return "N/A";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Format relative date time (e.g. "2 hours ago")
 */
export function formatRelativeTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "N/A";
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return "N/A";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(dateStr);
}

/**
 * Helper to resolve full image URLs.
 * Relative paths like "/product-1.jpeg" are served by the storefront.
 */
export function getImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}
