"use client";

import React, { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ShoppingCart,
  User,
  MapPin,
  CreditCard,
  PackageCheck,
  Loader2,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/src/lib/api-client";
import { Order, OrderListResponse } from "@/src/lib/types/api";
import { formatNGN, formatDate } from "@/lib/utils";
import { useCurrentAdmin } from "@/src/lib/auth-client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Skeleton } from "@/src/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useCurrentAdmin();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: order, isLoading, isError } = useQuery<Order | null>({
    queryKey: ["orders-detail", id],
    queryFn: async () => {
      // Strategy 1: Direct ID lookup from backend
      try {
        const res = await apiClient<Order | { order?: Order }>(
          `/admin/orders/${encodeURIComponent(id)}`,
          { showErrorToast: false }
        );
        if (res) {
          const item = "order" in res && res.order ? res.order : (res as Order);
          if (item?.id || item?.orderNumber) return item;
        }
      } catch {}

      // Strategy 2: Search by ID or order number
      try {
        const res = await apiClient<OrderListResponse | Order[] | { order?: Order; orders?: Order[] }>(
          `/admin/orders?search=${encodeURIComponent(id)}`,
          { showErrorToast: false }
        );
        const list: Order[] = Array.isArray(res)
          ? res
          : res && "orders" in res && Array.isArray(res.orders)
          ? res.orders
          : [];
        const found = list.find((o) => o.id === id || o.orderNumber === id);
        if (found) return found;
      } catch {}

      // Strategy 3: General list fallback
      try {
        const res = await apiClient<OrderListResponse | Order[]>(
          `/admin/orders?limit=100`,
          { showErrorToast: false }
        );
        const list: Order[] = Array.isArray(res)
          ? res
          : res && "orders" in res && Array.isArray(res.orders)
          ? res.orders
          : [];
        const found = list.find((o) => o.id === id || o.orderNumber === id);
        if (found) return found;
      } catch {}

      return null;
    },
  });

  const [selectedStatus, setSelectedStatus] = useState<Order["status"] | "">("");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<Order["paymentStatus"] | "">("");

  const updateOrderMutation = useMutation({
    mutationFn: (data: { status?: Order["status"]; paymentStatus?: Order["paymentStatus"] }) => {
      const payload: { orderId: string; status?: Order["status"]; paymentStatus?: Order["paymentStatus"] } = {
        orderId: order!.id,
        ...data,
      };
      // If setting fulfillment status to paid and payment is unpaid, automatically mark payment as paid
      if (data.status === "paid" && (!data.paymentStatus && order?.paymentStatus === "unpaid")) {
        payload.paymentStatus = "paid";
      }
      return apiClient("/admin/orders", {
        method: "PUT",
        body: JSON.stringify(payload),
        showSuccessToast: true,
        successMessage: `Order updated successfully`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["analytics-overview"] });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: () =>
      apiClient(`/admin/orders/${id}`, {
        method: "DELETE",
        showSuccessToast: true,
        successMessage: "Order deleted successfully",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-overview"] });
      router.push("/orders");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-rose-500" />
        <h3 className="text-lg font-semibold">Order Not Found</h3>
        <Button onClick={() => router.push("/orders")} variant="outline">
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight ">
                Order #{order.orderNumber}
              </h1>
              <Badge variant={order.status === "delivered" || order.status === "paid" ? "success" : "warning"}>
                {order.status}
              </Badge>
              <Badge variant={order.paymentStatus === "paid" ? "success" : "destructive"}>
                Payment: {order.paymentStatus}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        {/* Status Quick Updaters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Fulfillment:</span>
            <Select
              value={selectedStatus || order.status}
              onValueChange={(val) => {
                const newStatus = val as Order["status"];
                setSelectedStatus(newStatus);
                updateOrderMutation.mutate({ status: newStatus });
              }}
            >
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Fulfillment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Payment:</span>
            <Select
              value={selectedPaymentStatus || order.paymentStatus}
              onValueChange={(val) => {
                const newPay = val as Order["paymentStatus"];
                setSelectedPaymentStatus(newPay);
                updateOrderMutation.mutate({ paymentStatus: newPay });
              }}
            >
              <SelectTrigger className="w-32 h-8 text-xs font-semibold">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isSuperAdmin && (
            <Button
              variant="destructive"
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Order
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Customer Info */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-amber-500" /> Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <p className="font-semibold text-sm text-foreground">
              {order.customerName || "Guest Customer"}
            </p>
            <p className="text-muted-foreground">{order.customerEmail || order.guestEmail || "No email"}</p>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card className="glass-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-500" /> Payment Summary
            </CardTitle>
            <Badge variant={order.paymentStatus === "paid" ? "success" : "warning"}>
              {order.paymentStatus}
            </Badge>
          </CardHeader>
          <CardContent className="text-xs space-y-3">
            <p className="font-bold text-base text-foreground">
              {formatNGN(order.totalAmount)}
            </p>
            <div className="space-y-1 pt-1 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Change Payment Status:</span>
              <Select
                value={order.paymentStatus}
                onValueChange={(val) =>
                  updateOrderMutation.mutate({ paymentStatus: val as Order["paymentStatus"] })
                }
              >
                <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid (Includes in Revenue)</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" /> Shipping Destination
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1 text-muted-foreground">
            {order.shippingAddress ? (
              <>
                <p className="font-medium text-foreground">{order.shippingAddress.street}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                <p>{order.shippingAddress.country} {order.shippingAddress.postalCode}</p>
              </>
            ) : (
              <p>Standard Delivery Address</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-amber-500" /> Order Line Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!order.items || order.items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No line item breakdown available.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Unit Price (₦)</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="text-right">Total Price (₦)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold">{item.productName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.size && <span>Size: {item.size} </span>}
                      {item.color && <span>Color: {item.color}</span>}
                    </TableCell>
                    <TableCell>{formatNGN(item.unitPrice)}</TableCell>
                    <TableCell className="font-bold">{item.quantity}</TableCell>
                    <TableCell className="text-right font-bold">
                      {formatNGN(item.totalPrice)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Order Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Delete Order #{order.orderNumber}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this order? This action cannot be undone and will remove all associated line items and financial metrics.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteOrderMutation.isPending}
              onClick={() => deleteOrderMutation.mutate()}
            >
              {deleteOrderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                "Permanently Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
