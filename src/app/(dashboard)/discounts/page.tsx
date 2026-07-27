"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Percent,
  Trash2,
} from "lucide-react";

import { apiClient } from "@/src/lib/api-client";
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

const discountSchema = z.object({
  code: z
    .string()
    .min(1, "Promo code is required")
    .transform((s) => s.toUpperCase()),
  discountType: z.enum(["percentage", "fixed_amount"]),
  value: z.number().positive("Discount value must be positive"),
  minOrderAmount: z.number().positive().optional(),
  maxUses: z.number().int().positive().optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean(),
});

type DiscountFormValues = z.infer<typeof discountSchema>;

export default function DiscountsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
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
  } = useForm<DiscountFormValues>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      code: "",
      discountType: "percentage",
      value: 10,
      isActive: true,
    },
  });

  const openCreateModal = () => {
    reset({
      code: "",
      discountType: "percentage",
      value: 10,
      isActive: true,
    });
    setModalOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (values: DiscountFormValues) => {
      const payload = {
        ...values,
        code: values.code.toUpperCase(),
        minOrderAmount: values.minOrderAmount || undefined,
        maxUses: values.maxUses || undefined,
        startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : undefined,
        expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
      };
      return apiClient("/admin/discounts", {
        method: "POST",
        body: JSON.stringify(payload),
        showSuccessToast: true,
        successMessage: "Promo code created successfully",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      setModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/admin/discounts/${id}`, {
        method: "DELETE",
        showSuccessToast: true,
        successMessage: "Discount deleted",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      setDeleteDiscount(null);
    },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Discounts & Coupons
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
            Create promotional codes, percentage discounts, and fixed Naira coupons
          </p>
        </div>
        <Button variant="luxury" onClick={openCreateModal} className="font-semibold text-sm">
          <Plus className="mr-2 h-4 w-4" /> Create Coupon
        </Button>
      </div>

      {/* Discounts Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Active Promotions</CardTitle>
          <CardDescription className="text-xs">
            List of active and scheduled promo codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : isError || !data ? (
            <p className="text-sm text-destructive">Failed to load discounts.</p>
          ) : data.discounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-3">
              <Percent className="h-10 w-10 opacity-40 text-amber-500" />
              <p className="text-base font-medium">No discount coupons created yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Promo Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Min Order</TableHead>
                  <TableHead>Used / Max</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.discounts.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-bold font-mono text-amber-500 tracking-wider">
                      {d.code}
                    </TableCell>

                    <TableCell className="capitalize text-xs font-semibold">
                      {d.discountType.replace("_", " ")}
                    </TableCell>

                    <TableCell className="font-bold text-sm">
                      {d.discountType === "percentage"
                        ? `${d.value}% OFF`
                        : formatNGN(d.value)}
                    </TableCell>

                    <TableCell className="text-xs">
                      {d.minOrderAmount ? formatNGN(d.minOrderAmount) : "None"}
                    </TableCell>

                    <TableCell className="text-xs">
                      {d.usedCount} / {d.maxUses || "∞"}
                    </TableCell>

                    <TableCell>
                      <Badge variant={d.isActive ? "success" : "secondary"}>
                        {d.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteDiscount(d)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Coupon Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Promotional Coupon</DialogTitle>
            <DialogDescription>
              Set discount code, percentage or fixed Naira value, and usage limits.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Coupon Code *</Label>
              <Input
                id="code"
                placeholder="e.g. LUXURY20"
                className="font-mono uppercase tracking-wider font-bold"
                {...register("code")}
              />
              {errors.code && (
                <p className="text-xs font-medium text-destructive">
                  {errors.code.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={watch("discountType")}
                  onValueChange={(val) => setValue("discountType", val as "percentage" | "fixed_amount")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount (₦)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Discount Value *</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  placeholder={watch("discountType") === "percentage" ? "15" : "5000"}
                  {...register("value", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="minOrderAmount">Min Order (₦)</Label>
                <Input
                  id="minOrderAmount"
                  type="number"
                  placeholder="50000 (Optional)"
                  {...register("minOrderAmount", { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUses">Max Uses</Label>
                <Input
                  id="maxUses"
                  type="number"
                  placeholder="100 (Optional)"
                  {...register("maxUses", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Start Date</Label>
                <Input id="startsAt" type="date" {...register("startsAt")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expiry Date</Label>
                <Input id="expiresAt" type="date" {...register("expiresAt")} />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="isActive" className="text-sm font-semibold">Active Coupon</Label>
              <Switch
                id="isActive"
                checked={watch("isActive")}
                onCheckedChange={(val) => setValue("isActive", val)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="luxury" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Coupon"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={!!deleteDiscount} onOpenChange={() => setDeleteDiscount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Coupon?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete promo code &quot;{deleteDiscount?.code}&quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDiscount(null)}>
              Cancel
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
