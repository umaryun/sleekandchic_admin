"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote, ClipboardList, ShoppingCart, AlertTriangle, RefreshCw, Wallet } from "lucide-react";
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
          {error instanceof Error ? error.message : "The storefront API could not be reached. Check that it is running and try again."}
        </p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  const trend = (percent: number | null) =>
    percent === null ? undefined : { value: percent, isPositive: percent >= 0 };
  const { toConfirm, toShip, inTransit } = data.orders;

  return (
    <div className="space-y-8">
      {/* Header Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Overview
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Last 30 days, Lagos time. Changes compare with the 30 days before.
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
          title="Revenue"
          value={formatNGN(data.revenue.last30Days)}
          icon={Banknote}
          trend={trend(data.revenue.changePercent)}
          description={`Money received. Today: ${formatNGN(data.revenue.today)}`}
        />
        <StatCard
          title="Orders placed"
          value={data.orders.last30Days.toLocaleString()}
          icon={ShoppingCart}
          trend={trend(data.orders.changePercent)}
          description="Not counting cancelled orders"
        />
        <StatCard
          title="To do"
          value={(toConfirm + toShip).toLocaleString()}
          icon={ClipboardList}
          highlight={toConfirm + toShip > 0}
          description={`${toConfirm} to confirm · ${toShip} to ship · ${inTransit} out for delivery`}
        />
        <StatCard
          title="Cash to collect"
          value={formatNGN(data.cashToCollect.amount)}
          icon={Wallet}
          description={`${data.cashToCollect.orders} pay-on-delivery order${data.cashToCollect.orders === 1 ? "" : "s"} not yet paid`}
        />
      </div>

      {/* Charts & Low Stock Row */}
      <div className="grid gap-6 lg:grid-cols-12">
        <RevenueChart data={data.dailyRevenue} />
        <LowStockAlertsWidget items={data.products.lowStock} threshold={data.products.lowStockThreshold} />
      </div>

      {/* Recent Orders Table */}
      <div className="grid gap-6 lg:grid-cols-12">
        <RecentOrdersTable orders={data.recentOrders} />
      </div>
    </div>
  );
}
