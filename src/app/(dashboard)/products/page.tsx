"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Archive,
  ArchiveRestore,
  Package,
  Loader2,
  Filter,
} from "lucide-react";

import { apiClient } from "@/src/lib/api-client";
import { useCurrentAdmin } from "@/src/lib/auth-client";
import { Product, ProductListResponse, Category } from "@/src/lib/types/api";
import { formatNGN, getImageUrl } from "@/src/lib/utils";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { Switch } from "@/src/components/ui/switch";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";

export default function ProductsPage() {
  const queryClient = useQueryClient();
  // Archiving is owner-only on the server; staff don't see the button.
  const { isSuperAdmin } = useCurrentAdmin();
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  // Fetch Categories for Filter
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => apiClient<Category[]>("/admin/categories"),
  });

  // Fetch Products
  const { data, isLoading, isError } = useQuery<ProductListResponse>({
    queryKey: ["products", search, page, showArchived],
    queryFn: () =>
      apiClient<ProductListResponse>(
        `/admin/products?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ""}${showArchived ? "&status=archived" : ""}`
      ),
  });

  // Toggle inStock Mutation
  const stockMutation = useMutation({
    mutationFn: ({ id, inStock }: { id: string; inStock: boolean }) =>
      apiClient(`/admin/products/${id}`, {
        method: "PUT",
        body: JSON.stringify({ inStock }),
        showSuccessToast: true,
        successMessage: `Stock status updated`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  // Archive: hidden from the shop, kept for past orders, restorable.
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/admin/products/${id}`, {
        method: "DELETE",
        showSuccessToast: true,
        successMessage: "Product archived",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleteProduct(null);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/admin/products/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "active" }),
        showSuccessToast: true,
        successMessage: "Product restored to the shop",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const categoryMap = new Map(categories?.map((c) => [c.id, c.name]));

  const filteredProducts = data?.products.filter((p) => {
    if (selectedCategory === "all") return true;
    return p.categoryId === selectedCategory;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Products Directory
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
            Manage luxury fashion catalog items, prices, variants, and stock status
          </p>
        </div>
        <Link href="/products/create">
          <Button variant="luxury" className="font-semibold text-sm">
            <Plus className="mr-2 h-4 w-4" /> Add New Product
          </Button>
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <Button
          variant={showArchived ? "secondary" : "outline"}
          size="sm"
          onClick={() => {
            setShowArchived((v) => !v);
            setPage(1);
          }}
          aria-pressed={showArchived}
        >
          {showArchived ? "Showing archived" : "Show archived"}
        </Button>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border bg-card shadow-sm glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError || !data ? (
          <div className="p-8 text-center text-muted-foreground">
            Failed to load products list.
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-3">
            <Package className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-base font-medium">No products found</p>
            <p className="text-xs">Try clearing search filters or create a new product.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price (₦)</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead>In Stock</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  {/* Thumbnail */}
                  <TableCell>
                    <div className="relative h-11 w-11 rounded-lg overflow-hidden border border-border/60 bg-muted shrink-0">
                      {product.image ? (
                        <Image
                          src={getImageUrl(product.image)}
                          alt={product.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                          No img
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Name */}
                  <TableCell className="font-semibold text-foreground">
                    <Link
                      href={`/products/${product.id}`}
                      className="hover:text-amber-500 transition-colors"
                    >
                      {product.name}
                    </Link>
                  </TableCell>

                  {/* SKU */}
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {product.sku || "N/A"}
                  </TableCell>

                  {/* Category */}
                  <TableCell className="text-xs text-muted-foreground">
                    {product.categoryId ? categoryMap.get(product.categoryId) || "Uncategorized" : "Uncategorized"}
                  </TableCell>

                  {/* Price */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">
                        {formatNGN(product.price)}
                      </span>
                      {product.originalPrice && (
                        <span className="text-[11px] text-muted-foreground line-through">
                          {formatNGN(product.originalPrice)}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Badge */}
                  <TableCell>
                    {product.badge ? (
                      <Badge variant={product.badge}>{product.badge}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Stock Toggle */}
                  <TableCell>
                    <Switch
                      checked={product.inStock}
                      onCheckedChange={(checked) =>
                        stockMutation.mutate({ id: product.id, inStock: checked })
                      }
                      disabled={stockMutation.isPending}
                    />
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/products/${product.id}`}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Product
                          </Link>
                        </DropdownMenuItem>
                        {isSuperAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            {product.status === "archived" ? (
                              <DropdownMenuItem onClick={() => restoreMutation.mutate(product.id)}>
                                <ArchiveRestore className="mr-2 h-4 w-4" /> Restore to shop
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => setDeleteProduct(product)}
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              >
                                <Archive className="mr-2 h-4 w-4" /> Archive
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive {deleteProduct?.name}?</DialogTitle>
            <DialogDescription>
              It disappears from the shop and can&apos;t be bought, including from bags it&apos;s already in. Past orders keep their details. You can restore it from Show archived.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProduct(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteProduct && deleteMutation.mutate(deleteProduct.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Archiving...
                </>
              ) : (
                "Archive"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
