"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  ShoppingCart,
  Calendar,
  Eye,
  RefreshCw,
} from "lucide-react";

import { apiClient } from "@/src/lib/api-client";
import { OrderListResponse } from "@/src/lib/types/api";
import { formatNGN, formatDate } from "@/lib/utils";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Skeleton } from "@/src/components/ui/skeleton";

// Status changes happen on the order page, which knows what each order can
// move to next. "processing" also lists older orders marked "paid".
const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Preparing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Preparing",
  processing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  // Fetch Orders
  const { data, isLoading, isError, refetch } = useQuery<OrderListResponse>({
    queryKey: ["orders", activeTab, search, fromDate, toDate, page],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", "20");
      if (activeTab !== "all") params.append("status", activeTab);
      if (search) params.append("search", search);
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);

      return apiClient<OrderListResponse>(`/admin/orders?${params.toString()}`);
    },
  });

  const getStatusBadge = (status: string) => {
    const label = STATUS_LABELS[status] ?? status;
    switch (status) {
      case "delivered":
        return <Badge variant="success">{label}</Badge>;
      case "paid":
      case "processing":
      case "shipped":
        return <Badge variant="info">{label}</Badge>;
      case "pending":
        return <Badge variant="warning">{label}</Badge>;
      case "cancelled":
        return <Badge variant="destructive">{label}</Badge>;
      default:
        return <Badge variant="outline">{label}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Orders Management
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
            Track customer orders, update fulfillment statuses, and manage payments
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh Orders
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setPage(1); }}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="font-semibold text-xs">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search & Date Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Order #, name, phone or email"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full sm:w-36 text-xs"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full sm:w-36 text-xs"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border bg-card shadow-sm glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError || !data ? (
          <div className="p-8 text-center text-muted-foreground">
            Failed to load orders list.
          </div>
        ) : (() => {
            const orders = Array.isArray(data) ? data : (data as OrderListResponse).orders ?? [];
            if (orders.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-3">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground/50" />
                  <p className="text-base font-medium">No orders found</p>
                </div>
              );
            }
            return (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Fulfillment Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-bold text-foreground">
                        <Link href={`/orders/${order.id}`} className="hover:text-amber-500 transition-colors">
                          {order.orderNumber}
                        </Link>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-semibold">{order.customerName || "No name given"}</span>
                          <span className="text-muted-foreground">{order.customerPhone || order.customerEmail || "No contact"}</span>
                          {order.deliveryState && <span className="text-muted-foreground">{order.deliveryState}</span>}
                        </div>
                      </TableCell>

                      <TableCell className="font-bold text-sm">
                        {formatNGN(order.totalAmount)}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant={order.paymentStatus === "paid" ? "success" : "warning"}>
                            {order.paymentStatus === "paid"
                              ? "Paid"
                              : order.paymentStatus === "refunded"
                                ? "Refunded"
                                : order.paymentMethod === "cod"
                                  ? "Pay on delivery"
                                  : "Unpaid"}
                          </Badge>
                          {order.shippingMethod === "express" && <Badge variant="info">Express</Badge>}
                        </div>
                      </TableCell>

                      <TableCell>{getStatusBadge(order.status)}</TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/orders/${order.id}`} aria-label={`Open order ${order.orderNumber}`}>
                              <Eye className="h-4 w-4 mr-1" /> Open
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })()}
      </div>
    </div>
  );
}
