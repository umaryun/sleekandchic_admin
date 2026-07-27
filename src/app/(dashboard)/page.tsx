"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, ShoppingBag, ShoppingCart, AlertTriangle, RefreshCw } from "lucide-react";
import { apiClient } from "@/src/lib/api-client";
import { AnalyticsOverview } from "@/src/lib/types/api";
import { StatCard } from "@/src/components/dashboard/stat-card";
import { RevenueChart } from "@/src/components/dashboard/revenue-chart";
import { RecentOrdersTable } from "@/src/components/dashboard/recent-orders-table";
import { LowStockAlertsWidget } from "@/src/components/dashboard/low-stock-alert";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Button } from "@/src/components/ui/button";
import { formatNGN } from "@/lib/utils";

export default function OverviewDashboardPage() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<AnalyticsOverview>({
    queryKey: ["analytics-overview"],
    queryFn: () => apiClient<AnalyticsOverview>("/admin/analytics/overview"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-80 col-span-full lg:col-span-8" />
          <Skeleton className="h-80 col-span-full lg:col-span-4" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-card p-8 space-y-4">
        <AlertTriangle className="h-12 w-12 text-rose-500" />
        <h3 className="text-lg font-semibold">Failed to Load Overview Analytics</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {error instanceof Error ? error.message : "Ensure the storefront API server is running on localhost:3000."}
        </p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  const lowStockCount = data.products.lowStock.length;

  return (
    <div className="space-y-8">
      {/* Header Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Analytics Overview
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
            Real-time sales revenue, inventory alerts & recent customer orders
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="self-start sm:self-auto"
        >
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh Stats
        </Button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatNGN(data.revenue.total)}
          icon={DollarSign}
          trend={{ value: 12.5, isPositive: true }}
          description="Paid order total revenue (NGN)"
        />
        <StatCard
          title="Total Orders"
          value={data.orders.total.toLocaleString()}
          icon={ShoppingCart}
          trend={{ value: 8.2, isPositive: true }}
          description="All time customer orders count"
        />
        <StatCard
          title="Active Products"
          value={data.products.total.toLocaleString()}
          icon={ShoppingBag}
          description="Total catalog items in store"
        />
        <StatCard
          title="Low Stock Items"
          value={lowStockCount}
          icon={AlertTriangle}
          highlight={lowStockCount > 0}
          description="Variants with stock ≤ 5 remaining"
        />
      </div>

      {/* Charts & Low Stock Row */}
      <div className="grid gap-6 lg:grid-cols-12">
        <RevenueChart data={data.dailyRevenue} />
        <LowStockAlertsWidget items={data.products.lowStock} />
      </div>

      {/* Recent Orders Table */}
      <div className="grid gap-6 lg:grid-cols-12">
        <RecentOrdersTable orders={data.recentOrders} />
      </div>
    </div>
  );
}
