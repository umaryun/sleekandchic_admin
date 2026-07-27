"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, RefreshCw } from "lucide-react";

import { apiClient } from "@/src/lib/api-client";
import { CustomerListResponse } from "@/src/lib/types/api";
import { formatNGN, formatDate } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery<CustomerListResponse>({
    queryKey: ["customers", search, page],
    queryFn: () =>
      apiClient<CustomerListResponse>(
        `/admin/customers?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ""}`
      ),
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Customer Directory
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
            Registered customer accounts, order history counts, and total spending (NGN)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh Directory
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-9"
        />
      </div>

      {/* Customers Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Client Profiles</CardTitle>
          <CardDescription className="text-xs">
            Overview of client account types, order frequency, and lifetime revenue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : isError || !data ? (
            <p className="text-sm text-destructive">Failed to load customers directory.</p>
          ) : data.customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-3">
              <Users className="h-10 w-10 opacity-40 text-amber-500" />
              <p className="text-base font-medium">No customer accounts found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Avatar</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Account Type</TableHead>
                  <TableHead>Orders Placed</TableHead>
                  <TableHead>Total Spent (₦)</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.customers.map((customer) => {
                  const initials = customer.name
                    ? customer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                    : "CU";

                  return (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-amber-500/10 text-amber-500 font-bold text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>

                      <TableCell className="font-semibold text-foreground">
                        {customer.name || "Guest Customer"}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {customer.email}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {customer.phone || "N/A"}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={customer.isAnonymous ? "secondary" : "info"}
                        >
                          {customer.isAnonymous ? "Guest" : "Registered"}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-bold text-sm">
                        {customer.totalOrders}
                      </TableCell>

                      <TableCell className="font-bold text-sm text-amber-500">
                        {formatNGN(customer.totalSpent)}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(customer.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
