"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Crown, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { API_ORIGIN } from "@/src/lib/config";

const MIN_LENGTH = 10;

function SetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!token) {
    return (
      <p className="text-sm text-muted-foreground text-center">
        This link is incomplete. Open the link from your invitation email again, or ask the store owner to send a new one.
      </p>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`${API_ORIGIN}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.code === "INVALID_TOKEN"
            ? "This link has expired or was already used. Ask the store owner to send a new invitation."
            : data.message || "Couldn't save your password. Please try again."
        );
        return;
      }
      toast.success("Password saved. Sign in to continue.");
      router.push("/login");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            className="pl-9"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="password-hint"
          />
        </div>
        <p id="password-hint" className="text-xs text-muted-foreground">
          At least {MIN_LENGTH} characters. A short phrase is easier to remember than random symbols.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Repeat password</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" variant="luxury" className="w-full h-10" disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save password"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Already set one? <Link href="/login" className="text-amber-600 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl glass-card border border-border/60">
        <CardHeader className="space-y-3 text-center pb-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gold-gradient-bg text-black shadow-lg">
            <Crown className="h-8 w-8 fill-current" aria-hidden />
          </div>
          <CardTitle className="text-2xl font-serif font-bold tracking-tight">Choose your password</CardTitle>
          <CardDescription>You&apos;ll use it with your email to sign in to the Sleekandchic admin.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />}>
            <SetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
