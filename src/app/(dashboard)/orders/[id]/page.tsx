"use client";

import React, { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  User,
  MapPin,
  CreditCard,
  PackageCheck,
  Loader2,
  AlertTriangle,
  Trash2,
  Phone,
  MessageCircle,
  Mail,
  Truck,
} from "lucide-react";

import { apiClient } from "@/src/lib/api-client";
import { Order } from "@/src/lib/types/api";
import { formatNGN, formatDate } from "@/lib/utils";
import { useCurrentAdmin } from "@/src/lib/auth-client";

import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";

const STATUS_LABELS: Record<Order["status"], string> = {
  pending: "Pending",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** wa.me link for a Nigerian number written any way ("0803…", "+234 803…"). */
function whatsappTo(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "234");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{children}</span>
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useCurrentAdmin();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [draft, setDraft] = useState<{ status?: Order["status"]; paymentStatus?: Order["paymentStatus"] }>({});

  const { data: order, isLoading, isError } = useQuery<Order>({
    queryKey: ["orders-detail", id],
    queryFn: () => apiClient<Order>(`/admin/orders/${encodeURIComponent(id)}`, { showErrorToast: false }),
  });

  const updateOrder = useMutation({
    mutationFn: (changes: { status?: Order["status"]; paymentStatus?: Order["paymentStatus"] }) =>
      apiClient("/admin/orders", {
        method: "PUT",
        body: JSON.stringify({ orderId: order!.id, ...changes }),
        showSuccessToast: true,
        successMessage: "Order updated",
      }),
    onSuccess: () => {
      setDraft({});
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["analytics-overview"] });
    },
  });

  const deleteOrder = useMutation({
    mutationFn: () =>
      apiClient(`/admin/orders/${id}`, { method: "DELETE", showSuccessToast: true, successMessage: "Order deleted" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-overview"] });
      router.push("/orders");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
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
        <h3 className="text-lg font-semibold">Order not found</h3>
        <Button onClick={() => router.push("/orders")} variant="outline">
          Back to Orders
        </Button>
      </div>
    );
  }

  const address = order.shippingAddress;
  const phone = order.customerPhone ?? address?.phone ?? null;
  const firstName = address?.firstName ?? order.customerName?.split(" ")[0] ?? "";
  const nextStatus = draft.status ?? order.status;
  const nextPayment = draft.paymentStatus ?? order.paymentStatus;
  const hasChanges = nextStatus !== order.status || nextPayment !== order.paymentStatus;
  const isCod = order.paymentMethod === "cod";

  const save = () => {
    if (nextStatus === "cancelled" && order.status !== "cancelled") {
      setConfirmCancelOpen(true);
      return;
    }
    updateOrder.mutate({
      ...(nextStatus !== order.status ? { status: nextStatus } : {}),
      ...(nextPayment !== order.paymentStatus ? { paymentStatus: nextPayment } : {}),
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push("/orders")} className="rounded-full" aria-label="Back to orders">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Order {order.orderNumber}</h1>
              <Badge variant={order.status === "cancelled" ? "destructive" : order.status === "delivered" ? "success" : "warning"}>
                {STATUS_LABELS[order.status]}
              </Badge>
              <Badge variant={order.paymentStatus === "paid" ? "success" : order.paymentStatus === "refunded" ? "secondary" : "warning"}>
                {order.paymentStatus === "paid" ? "Paid" : order.paymentStatus === "refunded" ? "Refunded" : isCod ? "Pay on delivery" : "Unpaid"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Placed {formatDate(order.createdAt)}</p>
          </div>
        </div>
        {isSuperAdmin && (
          <Button variant="outline" size="sm" className="h-8 text-xs text-destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        )}
      </div>

      {/* Update status */}
      <Card className="glass-card">
        <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground" id="status-label">Order status</label>
            <Select value={nextStatus} onValueChange={(v) => setDraft((d) => ({ ...d, status: v as Order["status"] }))} disabled={order.status === "cancelled"}>
              <SelectTrigger className="w-44" aria-labelledby="status-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as Order["status"][]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground" id="payment-label">Payment</label>
            <Select value={nextPayment} onValueChange={(v) => setDraft((d) => ({ ...d, paymentStatus: v as Order["paymentStatus"] }))}>
              <SelectTrigger className="w-44" aria-labelledby="payment-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">{isCod ? "Not collected yet" : "Unpaid"}</SelectItem>
                <SelectItem value="paid">{isCod ? "Collected (paid)" : "Paid"}</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={!hasChanges || updateOrder.isPending}>
              {updateOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
            {hasChanges && (
              <Button variant="ghost" onClick={() => setDraft({})}>
                Undo
              </Button>
            )}
          </div>
          {order.status === "cancelled" && (
            <p className="text-xs text-muted-foreground sm:ml-auto">Cancelled orders can&apos;t be reopened; their stock was returned.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Customer */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-amber-500" /> Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p className="font-semibold text-foreground">{order.customerName || "No name given"}</p>
            {order.userId ? (
              <p className="text-xs text-muted-foreground">Has an account{order.accountName && order.accountName !== order.customerName ? ` (${order.accountName})` : ""}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Guest checkout</p>
            )}
            {phone && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                  <a href={`tel:${phone}`}>
                    <Phone className="h-3.5 w-3.5 mr-1" /> {phone}
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                  <a href={whatsappTo(phone, `Hello ${firstName}, this is Sleekandchic about your order ${order.orderNumber}.`)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                  </a>
                </Button>
              </div>
            )}
            {order.customerEmail && (
              <a href={`mailto:${order.customerEmail}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground break-all">
                <Mail className="h-3.5 w-3.5 shrink-0" /> {order.customerEmail}
              </a>
            )}
          </CardContent>
        </Card>

        {/* Delivery */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" /> Delivery
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {address ? (
              <>
                <p className="font-medium text-foreground">{address.street}</p>
                <p className="text-muted-foreground">{address.city}, {address.state}</p>
              </>
            ) : (
              <p className="text-muted-foreground">No address recorded</p>
            )}
            <div className="pt-2 flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              {order.shippingMethod ? (
                <Badge variant={order.shippingMethod === "express" ? "warning" : "outline"}>
                  {order.shippingMethod === "express" ? "Express" : "Standard"}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">Method not recorded</span>
              )}
              <span className="text-xs text-muted-foreground">
                {order.shippingFee === 0 ? "Free delivery" : order.shippingFee !== undefined ? formatNGN(order.shippingFee) : ""}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Payment */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-500" /> Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs">
            <Row label="Method">
              {order.paymentMethod === "cod" ? "Pay on delivery" : order.paymentMethod === "paystack" ? "Paystack" : "Not recorded"}
            </Row>
            {order.subtotal !== null && order.subtotal !== undefined && <Row label="Subtotal">{formatNGN(order.subtotal)}</Row>}
            {!!order.discountAmount && order.discountAmount > 0 && (
              <Row label={`Discount${order.discountCode ? ` (${order.discountCode})` : ""}`}>-{formatNGN(order.discountAmount)}</Row>
            )}
            {order.shippingFee !== undefined && <Row label="Delivery">{order.shippingFee === 0 ? "Free" : formatNGN(order.shippingFee)}</Row>}
            <div className="border-t border-border/50 mt-1 pt-1">
              <Row label={order.paymentStatus === "paid" ? "Paid" : isCod ? "To collect" : "Total"}>
                <span className="text-base font-bold">{formatNGN(order.totalAmount)}</span>
              </Row>
            </div>
            {order.paidAt && <Row label="Paid on">{formatDate(order.paidAt)}</Row>}
            {order.paymentReference && <Row label="Paystack ref">{order.paymentReference}</Row>}
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-amber-500" /> Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!order.items || order.items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No items recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Size / colour</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold">{item.productName}</TableCell>
                    <TableCell className="text-sm">
                      {[item.size && `Size ${item.size}`, item.color].filter(Boolean).join(" · ") || (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>{formatNGN(item.unitPrice)}</TableCell>
                    <TableCell className="font-bold">{item.quantity}</TableCell>
                    <TableCell className="text-right font-bold">{formatNGN(item.totalPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirm cancel */}
      <Dialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel order {order.orderNumber}?</DialogTitle>
            <DialogDescription>
              Its items go back into stock and its promo code use is released. A cancelled order can&apos;t be reopened.
              {order.paymentStatus === "paid" && " This order was paid: refund the customer through Paystack, then set payment to Refunded."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancelOpen(false)}>
              Keep order
            </Button>
            <Button
              variant="destructive"
              disabled={updateOrder.isPending}
              onClick={() => {
                setConfirmCancelOpen(false);
                updateOrder.mutate({
                  status: "cancelled",
                  ...(nextPayment !== order.paymentStatus ? { paymentStatus: nextPayment } : {}),
                });
              }}
            >
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Delete order {order.orderNumber}
            </DialogTitle>
            <DialogDescription>
              This permanently removes the order and its items from your records. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Keep
            </Button>
            <Button variant="destructive" disabled={deleteOrder.isPending} onClick={() => deleteOrder.mutate()}>
              {deleteOrder.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
