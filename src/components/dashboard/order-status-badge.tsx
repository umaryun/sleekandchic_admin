import React from "react";
import { Badge } from "@/src/components/ui/badge";

/**
 * What staff call each fulfilment status. "paid" only appears on orders from
 * before payment and fulfilment were tracked separately; it meant preparing.
 */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Preparing",
  processing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const VARIANTS: Record<string, "success" | "info" | "warning" | "destructive"> = {
  delivered: "success",
  paid: "info",
  processing: "info",
  shipped: "info",
  pending: "warning",
  cancelled: "destructive",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANTS[status] ?? "outline"}>{ORDER_STATUS_LABELS[status] ?? status}</Badge>;
}
