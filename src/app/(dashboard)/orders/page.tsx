"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  ShoppingCart,
  Calendar,
  Eye,
  Edit,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/src/lib/api-client";
import { Order, OrderListResponse } from "@/src/lib/types/api";
import { formatNGN, formatDate } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
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

const STATUS_TABS = [
  "all",
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const [statusModalOrder, setStatusModalOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<Order["status"]>("processing");
  const [newPaymentStatus, setNewPaymentStatus] = useState<Order["paymentStatus"]>("unpaid");

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

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
      paymentStatus,
    }: {
      orderId: string;
      status: Order["status"];
      paymentStatus: Order["paymentStatus"];
    }) =>
      apiClient("/admin/orders", {
        method: "PUT",
        body: JSON.stringify({
          orderId,
          status,
          paymentStatus: status === "paid" && paymentStatus === "unpaid" ? "paid" : paymentStatus,
        }),
        showSuccessToast: true,
        successMessage: `Order updated successfully`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-overview"] });
      setStatusModalOrder(null);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
      case "delivered":
        return <Badge variant="success">{status}</Badge>;
      case "processing":
      case "shipped":
        return <Badge variant="info">{status}</Badge>;
      case "pending":
        return <Badge variant="warning">{status}</Badge>;
      case "cancelled":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
            <TabsTrigger key={tab} value={tab} className="capitalize font-semibold text-xs">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search & Date Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Order #..."
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
                          <span className="font-semibold">{order.customerName || "Guest User"}</span>
                          <span className="text-muted-foreground">{order.customerEmail || "No email"}</span>
                        </div>
                      </TableCell>

                      <TableCell className="font-bold text-sm">
                        {formatNGN(order.totalAmount)}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={order.paymentStatus === "paid" ? "success" : "warning"}
                        >
                          {order.paymentStatus}
                        </Badge>
                      </TableCell>

                      <TableCell>{getStatusBadge(order.status)}</TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setStatusModalOrder(order);
                              setNewStatus(order.status);
                              setNewPaymentStatus(order.paymentStatus || "unpaid");
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Link href={`/orders/${order.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })()}
      </div>

      {/* Status Update Dialog */}
      <Dialog open={!!statusModalOrder} onOpenChange={() => setStatusModalOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Update fulfillment and payment status for Order #{statusModalOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold">Fulfillment Status</label>
              <Select
                value={newStatus}
                onValueChange={(val) => {
                  const s = val as Order["status"];
                  setNewStatus(s);
                  if (s === "paid" && newPaymentStatus === "unpaid") {
                    setNewPaymentStatus("paid");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
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

            <div className="space-y-2">
              <label className="text-xs font-semibold">Payment Status</label>
              <Select
                value={newPaymentStatus}
                onValueChange={(val) => setNewPaymentStatus(val as Order["paymentStatus"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid (Includes in Dashboard Revenue)</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Revenue on the dashboard updates based on orders with <strong>Paid</strong> payment status.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModalOrder(null)}>
              Cancel
            </Button>
            <Button
              variant="luxury"
              disabled={updateStatusMutation.isPending}
              onClick={() =>
                statusModalOrder &&
                updateStatusMutation.mutate({
                  orderId: statusModalOrder.id,
                  status: newStatus,
                  paymentStatus: newPaymentStatus,
                })
              }
            >
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
