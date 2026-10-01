"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Percent, Trash2, Pencil } from "lucide-react";

import { apiClient } from "@/src/lib/api-client";
import { useCurrentAdmin } from "@/src/lib/auth-client";
import { Discount, DiscountListResponse } from "@/src/lib/types/api";
import { formatNGN } from "@/src/lib/utils";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { Switch } from "@/src/components/ui/switch";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";

const optionalNumber = (inner: z.ZodNumber) =>
  z.preprocess(
    (val) => (val === "" || val === null || val === undefined || (typeof val === "number" && Number.isNaN(val)) ? undefined : Number(val)),
    inner.optional()
  );

const discountSchema = z
  .object({
    code: z
      .string()
      .trim()
      .transform((s) => s.toUpperCase())
      .pipe(z.string().regex(/^[A-Z0-9_-]{3,30}$/, "Use 3–30 letters, numbers, - or _")),
    discountType: z.enum(["percentage", "fixed_amount"]),
    value: z.preprocess(
      (val) => (val === "" || (typeof val === "number" && Number.isNaN(val)) ? undefined : Number(val)),
      z.number({ message: "Enter an amount" }).positive("Enter an amount above zero")
    ),
    minOrderAmount: optionalNumber(z.number().positive("Must be above zero")),
    maxUses: optionalNumber(z.number().int().positive("Must be a whole number above zero")),
    startsAt: z.string().optional(),
    expiresAt: z.string().optional(),
    isActive: z.boolean(),
  })
  .refine((d) => d.discountType !== "percentage" || d.value <= 100, {
    path: ["value"],
    message: "A percentage can't be more than 100",
  })
  .refine((d) => !d.startsAt || !d.expiresAt || d.expiresAt >= d.startsAt, {
    path: ["expiresAt"],
    message: "The last day must be on or after the first day",
  });

type DiscountFormValues = z.infer<typeof discountSchema>;

// Dates are picked as Lagos calendar days: a code runs from the start of its
// first day to the end of its last day.
const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const toLagosDay = (iso?: string | null) => (iso ? new Date(new Date(iso).getTime() + LAGOS_OFFSET_MS).toISOString().slice(0, 10) : "");
const startOfLagosDay = (day?: string) => (day ? `${day}T00:00:00+01:00` : null);
const endOfLagosDay = (day?: string) => (day ? `${day}T23:59:59+01:00` : null);

const STATE_BADGES: Record<Discount["state"], { label: string; variant: "success" | "secondary" | "warning" | "outline" }> = {
  active: { label: "Active", variant: "success" },
  paused: { label: "Paused", variant: "secondary" },
  scheduled: { label: "Starts later", variant: "warning" },
  expired: { label: "Ended", variant: "outline" },
  used_up: { label: "Used up", variant: "outline" },
};

const EMPTY_FORM: DiscountFormValues = {
  code: "",
  discountType: "percentage",
  value: 10,
  minOrderAmount: undefined,
  maxUses: undefined,
  startsAt: "",
  expiresAt: "",
  isActive: true,
};

export default function DiscountsPage() {
  const queryClient = useQueryClient();
  // Deleting is owner-only on the server; staff don't see the button.
  const { isSuperAdmin } = useCurrentAdmin();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [deleteDiscount, setDeleteDiscount] = useState<Discount | null>(null);

  const { data, isLoading, isError } = useQuery<DiscountListResponse>({
    queryKey: ["discounts"],
    queryFn: () => apiClient<DiscountListResponse>("/admin/discounts"),
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(discountSchema),
    defaultValues: EMPTY_FORM,
  });

  const openCreate = () => {
    setEditing(null);
    reset(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (d: Discount) => {
    setEditing(d);
    reset({
      code: d.code,
      discountType: d.discountType,
      value: d.value,
      minOrderAmount: d.minOrderAmount ?? undefined,
      maxUses: d.maxUses ?? undefined,
      startsAt: toLagosDay(d.startsAt),
      expiresAt: toLagosDay(d.expiresAt),
      isActive: d.isActive,
    });
    setModalOpen(true);
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["discounts"] });

  const saveMutation = useMutation({
    mutationFn: (values: DiscountFormValues) => {
      const payload = {
        ...values,
        // null clears a limit or date on edit.
        minOrderAmount: values.minOrderAmount ?? null,
        maxUses: values.maxUses ?? null,
        startsAt: startOfLagosDay(values.startsAt),
        expiresAt: endOfLagosDay(values.expiresAt),
      };
      return editing
        ? apiClient(`/admin/discounts/${editing.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
            showSuccessToast: true,
            successMessage: `${values.code} updated`,
          })
        : apiClient("/admin/discounts", {
            method: "POST",
            body: JSON.stringify(payload),
            showSuccessToast: true,
            successMessage: `${values.code} created`,
          });
    },
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (d: Discount) =>
      apiClient(`/admin/discounts/${d.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !d.isActive }),
        showSuccessToast: true,
        successMessage: d.isActive ? `${d.code} paused` : `${d.code} switched on`,
      }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/admin/discounts/${id}`, {
        method: "DELETE",
        showSuccessToast: true,
        successMessage: "Code deleted",
      }),
    onSuccess: () => {
      invalidate();
      setDeleteDiscount(null);
    },
  });

  const codeLocked = !!editing && editing.usedCount > 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Promo codes</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Percentage or fixed-amount codes shoppers enter at checkout. Dates are Lagos time.
          </p>
        </div>
        <Button variant="luxury" onClick={openCreate} className="font-semibold text-sm">
          <Plus className="mr-2 h-4 w-4" /> New code
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">All codes</CardTitle>
          <CardDescription className="text-xs">
            Switch a code off to pause it. Codes that have been used are kept for their orders and can&apos;t be deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : isError || !data ? (
            <p className="text-sm text-destructive">Couldn&apos;t load promo codes.</p>
          ) : data.discounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-3">
              <Percent className="h-10 w-10 opacity-40 text-amber-500" />
              <p className="text-base font-medium">No promo codes yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Min. order</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Runs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.discounts.map((d) => {
                  const badge = STATE_BADGES[d.state];
                  const from = toLagosDay(d.startsAt);
                  const to = toLagosDay(d.expiresAt);
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-bold font-mono text-amber-500 tracking-wider">{d.code}</TableCell>
                      <TableCell className="font-bold text-sm">
                        {d.discountType === "percentage" ? `${d.value}% off` : `${formatNGN(d.value)} off`}
                      </TableCell>
                      <TableCell className="text-xs">{d.minOrderAmount ? formatNGN(d.minOrderAmount) : "None"}</TableCell>
                      <TableCell className="text-xs">
                        {d.usedCount}
                        {d.maxUses ? ` of ${d.maxUses}` : ""}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {from || to ? `${from || "now"} → ${to || "no end"}` : "Always"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={d.isActive}
                          disabled={toggleMutation.isPending}
                          onCheckedChange={() => toggleMutation.mutate(d)}
                          aria-label={d.isActive ? `Pause ${d.code}` : `Switch on ${d.code}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(d)} aria-label={`Edit ${d.code}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isSuperAdmin && d.usedCount === 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteDiscount(d)}
                              aria-label={`Delete ${d.code}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.code}` : "New promo code"}</DialogTitle>
            <DialogDescription>
              {editing && editing.usedCount > 0
                ? `Used ${editing.usedCount} time${editing.usedCount === 1 ? "" : "s"}. Changes apply to future checkouts only.`
                : "Shoppers type the code at checkout."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit((values) => saveMutation.mutate(values as DiscountFormValues))} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="e.g. EID20"
                className="font-mono uppercase tracking-wider font-bold"
                readOnly={codeLocked}
                aria-describedby={codeLocked ? "code-locked" : undefined}
                {...register("code")}
              />
              {codeLocked && (
                <p id="code-locked" className="text-xs text-muted-foreground">
                  A used code can&apos;t be renamed. Pause it and create a new one instead.
                </p>
              )}
              {errors.code && <p className="text-xs font-medium text-destructive">{errors.code.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={watch("discountType")}
                  onValueChange={(val) => setValue("discountType", val as "percentage" | "fixed_amount", { shouldValidate: true })}
                >
                  <SelectTrigger aria-label="Discount type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Fixed amount (₦)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">{watch("discountType") === "percentage" ? "Percent off" : "Naira off"}</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder={watch("discountType") === "percentage" ? "15" : "5000"}
                  {...register("value", { valueAsNumber: true })}
                />
                {errors.value && <p className="text-xs font-medium text-destructive">{errors.value.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="minOrderAmount">Min. order (₦)</Label>
                <Input id="minOrderAmount" type="number" inputMode="numeric" placeholder="Optional" {...register("minOrderAmount", { valueAsNumber: true })} />
                {errors.minOrderAmount && <p className="text-xs font-medium text-destructive">{errors.minOrderAmount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUses">Use limit</Label>
                <Input id="maxUses" type="number" inputMode="numeric" placeholder="No limit" {...register("maxUses", { valueAsNumber: true })} />
                {errors.maxUses && <p className="text-xs font-medium text-destructive">{errors.maxUses.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startsAt">First day</Label>
                <Input id="startsAt" type="date" {...register("startsAt")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Last day</Label>
                <Input id="expiresAt" type="date" {...register("expiresAt")} />
                {errors.expiresAt && <p className="text-xs font-medium text-destructive">{errors.expiresAt.message}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="isActive" className="text-sm font-semibold">Switched on</Label>
              <Switch id="isActive" checked={watch("isActive")} onCheckedChange={(val) => setValue("isActive", val)} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="luxury" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editing ? "Save changes" : "Create code"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete (unused codes only) */}
      <Dialog open={!!deleteDiscount} onOpenChange={() => setDeleteDiscount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteDiscount?.code}?</DialogTitle>
            <DialogDescription>It has never been used. To stop it for now instead, switch it off.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDiscount(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDiscount && deleteMutation.mutate(deleteDiscount.id)}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
