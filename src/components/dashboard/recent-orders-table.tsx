import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { formatNGN, formatDate } from "@/lib/utils";
import { OrderStatusBadge } from "@/src/components/dashboard/order-status-badge";

interface RecentOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

interface RecentOrdersTableProps {
  orders: RecentOrder[];
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  return (
    <Card className="col-span-full lg:col-span-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Latest customer orders placed on the storefront
          </p>
        </div>
        <Link
          href="/orders"
          className="inline-flex items-center text-xs font-semibold text-amber-500 hover:text-amber-600 transition-colors"
        >
          View All <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No orders found.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="group cursor-pointer">
                  <TableCell className="font-medium text-foreground group-hover:text-amber-500 transition-colors">
                    <Link href={`/orders`}>{order.orderNumber}</Link>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatNGN(order.totalAmount)}
                  </TableCell>
                  <TableCell><OrderStatusBadge status={order.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
