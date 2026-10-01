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
  History,
  Phone,
  MessageCircle,
  Mail,
  Truck,
} from "lucide-react";

import { apiClient } from "@/src/lib/api-client";
import { Order, OrderEvent, UpdateOrderInput } from "@/src/lib/types/api";
import { formatNGN, formatDate } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Textarea } from "@/src/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { ORDER_STATUS_LABELS } from "@/src/components/dashboard/order-status-badge";

const STATUS_LABELS = ORDER_STATUS_LABELS as Record<Order["status"], string>;

const PAYMENT_LABELS: Record<string, string> = { unpaid: "Unpaid", paid: "Paid", refunded: "Refunded" };

function describeEvent(e: OrderEvent): string {
  const status = (s: string | null) => (s ? STATUS_LABELS[s as Order["status"]] ?? s : "");
  const payment = (s: string | null) => (s ? PAYMENT_LABELS[s] ?? s : "");
  switch (e.type) {
    case "placed":
      return "Order placed";
    case "payment_received":
      return "Payment received";
    case "status_changed":
      return `${status(e.fromStatus)} → ${status(e.toStatus)}`;
    case "payment_status_changed":
      return `Payment: ${payment(e.fromStatus)} → ${payment(e.toStatus)}`;
    case "cancelled":
      return "Cancelled";
    case "note":
      return "Note";
  }
}

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
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [draft, setDraft] = useState<{ status?: Order["status"]; paymentStatus?: Order["paymentStatus"] }>({});
  const [note, setNote] = useState("");

  const { data: order, isLoading, isError } = useQuery<Order>({
    queryKey: ["orders-detail", id],
    queryFn: () => apiClient<Order>(`/admin/orders/${encodeURIComponent(id)}`, { showErrorToast: false }),
  });

  const updateOrder = useMutation({
    mutationFn: (changes: Omit<UpdateOrderInput, "orderId">) =>
      apiClient("/admin/orders", {
        method: "PUT",
        body: JSON.stringify({ orderId: order!.id, ...changes, note: note.trim() || undefined }),
        showSuccessToast: true,
        successMessage: "Order updated",
      }),
    onSuccess: () => {
      setDraft({});
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["analytics-overview"] });
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
  const hasChanges = nextStatus !== order.status || nextPayment !== order.paymentStatus || note.trim() !== "";
  const isCod = order.paymentMethod === "cod";
  // The server decides what comes next; the current status stays selectable.
  const statusOptions = [order.status, ...(order.allowedStatuses ?? [])];
  const statusLocked = (order.allowedStatuses ?? []).length === 0;

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
      </div>

      {/* Update status */}
      <Card className="glass-card">
        <CardContent className="pt-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground" id="status-label">Order status</label>
            <Select value={nextStatus} onValueChange={(v) => setDraft((d) => ({ ...d, status: v as Order["status"] }))} disabled={statusLocked}>
              <SelectTrigger className="w-44" aria-labelledby="status-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
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
          <div className="space-y-1.5 w-full sm:flex-1 sm:min-w-64">
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="order-note">
              Note for the timeline <span className="font-normal">(optional)</span>
            </label>
            <Textarea
              id="order-note"
              rows={1}
              maxLength={500}
              placeholder="e.g. Sent with GIG, waybill 12345"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={!hasChanges || updateOrder.isPending}>
              {updateOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
            {hasChanges && (
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft({});
                  setNote("");
                }}
              >
                Undo
              </Button>
            )}
          </div>
          {order.status === "cancelled" && (
            <p className="text-xs text-muted-foreground w-full">Cancelled orders can&apos;t be reopened; their stock was returned.</p>
          )}
          {order.status === "delivered" && (
            <p className="text-xs text-muted-foreground w-full">Delivered orders are final. You can still record payment or add a note.</p>
          )}
          {order.paymentMethod === "paystack" && order.paymentStatus !== "paid" && order.status === "pending" && (
            <p className="text-xs text-muted-foreground w-full">Waiting for the card payment. The order moves to Preparing by itself once paid.</p>
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

      {/* Timeline */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" /> Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 border-l border-border/60 pl-4">
            {(order.timeline ?? []).map((event) => (
              <li key={event.id} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-amber-500" aria-hidden />
                <p className="font-medium text-foreground">{describeEvent(event)}</p>
                {event.message && <p className="text-muted-foreground whitespace-pre-line">{event.message}</p>}
                <p className="text-xs text-muted-foreground">
                  {formatDate(event.createdAt)}
                  {event.actorName ? ` · ${event.actorName}` : event.type === "placed" ? " · customer" : ""}
                </p>
              </li>
            ))}
          </ol>
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

    </div>
  );
}
