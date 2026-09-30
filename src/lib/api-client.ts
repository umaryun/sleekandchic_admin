import { toast } from "sonner";
import { getStoredToken, removeStoredToken } from "./auth-client";
import { API_BASE_URL } from "./config";

export interface RequestOptions extends RequestInit {
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    showErrorToast = true,
    showSuccessToast = false,
    successMessage,
    headers: customHeaders,
    ...restOptions
  } = options;

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const token = getStoredToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...restOptions,
      headers,
    });

    if (res.status === 401 || res.status === 403) {
      removeStoredToken();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        toast.error("Session expired or unauthorized. Please log in again.");
        window.location.href = "/login";
      }
      throw new Error("Unauthorized");
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data?.error || data?.message || `Request failed with status ${res.status}`;
      if (showErrorToast) {
        toast.error(errorMsg);
      }
      throw new Error(errorMsg);
    }

    if (showSuccessToast && successMessage) {
      toast.success(successMessage);
    }

    // Backend responds with { success: true, data: T } or raw object T
    if (data && typeof data === "object" && "success" in data && "data" in data) {
      return data.data as T;
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Unauthorized") {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Network error occurred";
    if (showErrorToast && !message.includes("Unauthorized")) {
      toast.error(message);
    }
    throw err;
  }
}

/**
 * Upload file to Supabase Storage via presigned URL returned by POST /admin/media/upload-url
 */
export async function uploadMedia(
  file: File,
  bucket: "products" | "categories" | "banners"
): Promise<{ publicUrl: string; path: string }> {
  try {
    // 1. Get signed upload URL from backend
    const uploadRes = await apiClient<{
      uploadUrl: string;
      publicUrl: string;
      path: string;
    }>("/admin/media/upload-url", {
      method: "POST",
      body: JSON.stringify({
        bucket,
        filename: file.name,
        contentType: file.type,
      }),
    });

    // 2. Upload directly to Supabase Storage via PUT
    const putRes = await fetch(uploadRes.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!putRes.ok) {
      throw new Error("Failed to upload image file to storage");
    }

    toast.success("Image uploaded successfully");
    return {
      publicUrl: uploadRes.publicUrl,
      path: uploadRes.path,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    toast.error(msg);
    throw err;
  }
}
