"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  FolderTree,
  Folder,
  Edit,
  Trash2,
  Upload,
  Loader2,
  ChevronRight,
} from "lucide-react";

import { apiClient, uploadMedia } from "@/src/lib/api-client";
import { Category } from "@/src/lib/types/api";
import { getImageUrl } from "@/src/lib/utils";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
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

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: z.string().optional(),
  iconUrl: z.string().optional(),
  parentId: z.string().optional(),
  displayOrder: z.number().int(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedIcon, setUploadedIcon] = useState<string>("");

  const { data: categories, isLoading, isError } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => apiClient<Category[]>("/admin/categories"),
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      displayOrder: 0,
    },
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    setUploadedIcon("");
    reset({ name: "", slug: "", iconUrl: "", parentId: "", displayOrder: 0 });
    setModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setUploadedIcon(category.iconUrl || "");
    reset({
      name: category.name,
      slug: category.slug,
      iconUrl: category.iconUrl || "",
      parentId: category.parentId || "",
      displayOrder: category.displayOrder,
    });
    setModalOpen(true);
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await uploadMedia(file, "categories");
      setUploadedIcon(res.publicUrl);
      setValue("iconUrl", res.publicUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: (values: CategoryFormValues) => {
      const payload = {
        ...values,
        iconUrl: uploadedIcon || values.iconUrl || undefined,
        parentId: values.parentId || undefined,
      };

      if (editingCategory) {
        return apiClient(`/admin/categories/${editingCategory.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
          showSuccessToast: true,
          successMessage: "Category updated successfully",
        });
      } else {
        return apiClient("/admin/categories", {
          method: "POST",
          body: JSON.stringify(payload),
          showSuccessToast: true,
          successMessage: "Category created successfully",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/admin/categories/${id}`, {
        method: "DELETE",
        showSuccessToast: true,
        successMessage: "Category deleted",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDeleteCategory(null);
    },
  });

  const parentCategories = categories?.filter((c) => !c.parentId) || [];
  const getSubcategories = (parentId: string) =>
    categories?.filter((c) => c.parentId === parentId) || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Categories Tree
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
            Organize luxury collections, parent categories, and display order
          </p>
        </div>
        <Button variant="luxury" onClick={openCreateModal} className="font-semibold text-sm">
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      {/* Category List Tree */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Catalog Hierarchy</CardTitle>
          <CardDescription className="text-xs">
            Nested view of root collections and subcategories
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : isError || !categories ? (
            <p className="text-sm text-destructive">Failed to load categories.</p>
          ) : parentCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-3">
              <FolderTree className="h-10 w-10 opacity-40" />
              <p className="text-sm font-medium">No categories created yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {parentCategories.map((parent) => {
                const subs = getSubcategories(parent.id);

                return (
                  <div
                    key={parent.id}
                    className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden"
                  >
                    {/* Parent Row */}
                    <div className="flex items-center justify-between p-3.5 bg-card/70 hover:bg-card transition-colors">
                      <div className="flex items-center gap-3">
                        {parent.iconUrl ? (
                          <div className="relative h-8 w-8 rounded-lg overflow-hidden border border-border">
                            <Image
                              src={getImageUrl(parent.iconUrl)}
                              alt={parent.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                            <Folder className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-sm text-foreground">
                            {parent.name}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground font-mono">
                            /{parent.slug}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
                          Order: {parent.displayOrder}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(parent)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteCategory(parent)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Subcategories */}
                    {subs.length > 0 && (
                      <div className="border-t border-border/40 pl-6 pr-3 py-2 space-y-1.5 bg-background/40">
                        {subs.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between p-2 rounded-lg border border-border/40 bg-card/40 hover:bg-card transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs font-semibold text-foreground">
                                {sub.name}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                /{sub.slug}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditModal(sub)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteCategory(sub)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Modal Create/Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add New Category"}
            </DialogTitle>
            <DialogDescription>
              Set category name, parent collection, icon image, and sorting display order.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="cat-name">Category Name *</Label>
              <Input id="cat-name" placeholder="e.g. Dresses & Gowns" {...register("name")} />
              {errors.name && (
                <p className="text-xs font-medium text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentId">Parent Category</Label>
              <Select
                value={watch("parentId") || "none"}
                onValueChange={(val) => setValue("parentId", val === "none" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (Root Category)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Root Category)</SelectItem>
                  {parentCategories
                    .filter((c) => c.id !== editingCategory?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                {...register("displayOrder", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label>Category Icon</Label>
              <div className="flex items-center gap-3">
                {uploadedIcon && (
                  <div className="relative h-10 w-10 rounded-lg overflow-hidden border">
                    <Image src={getImageUrl(uploadedIcon)} alt="Icon preview" fill className="object-cover" unoptimized />
                  </div>
                )}
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-input bg-muted/40 hover:bg-muted text-xs cursor-pointer font-medium">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>Upload Icon</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleIconUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="luxury"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Category"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete category &quot;{deleteCategory?.name}&quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCategory(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteCategory && deleteMutation.mutate(deleteCategory.id)}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
