"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/src/components/dashboard/sidebar";
import { Header } from "@/src/components/dashboard/header";
import { NotStaffError, fetchCurrentAdmin, getStoredToken, removeStoredToken, setStoredAdmin } from "@/src/lib/auth-client";
import { Button } from "@/src/components/ui/button";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Confirms the session and role with the server once per visit (and on
  // retry), so a removed or demoted staff member doesn't keep a stale view.
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    fetchCurrentAdmin(token)
      .then((admin) => {
        if (cancelled) return;
        setStoredAdmin(admin);
        setAuthorized(true);
      })
      .catch((err: Error & { status?: number }) => {
        if (cancelled) return;
        if (err instanceof NotStaffError || err.status === 401) {
          // Expired session, or no longer staff.
          removeStoredToken();
          router.replace("/login");
          return;
        }
        // Network or server trouble: keep the session and offer a retry.
        setCheckFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  if (checkFailed) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">Couldn&apos;t reach the server to check your session.</p>
          <Button
            variant="outline"
            onClick={() => {
              setCheckFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
            Verifying Admin Session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
