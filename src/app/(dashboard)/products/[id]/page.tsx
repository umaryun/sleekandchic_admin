"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Upload,
  X,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  AlertTriangle,
} from "lucide-react";

import { toast } from "sonner";
import { apiClient, uploadMedia } from "@/src/lib/api-client";
import { Product, Category } from "@/src/lib/types/api";
import { getImageUrl } from "@/src/lib/utils";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Switch } from "@/src/components/ui/switch";
import { Skeleton } from "@/src/components/ui/skeleton";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  price: z.preprocess(
    (val) => (val === "" || val === null || val === undefined || (typeof val === "number" && Number.isNaN(val)) ? undefined : Number(val)),
    z.number({ message: "Price must be a positive number" }).positive("Price must be a positive number")
  ),
  originalPrice: z.preprocess(
    (val) => (val === "" || val === null || val === undefined || (typeof val === "number" && Number.isNaN(val)) ? undefined : Number(val)),
    z.number().positive("Original price must be positive").optional()
  ),
  sku: z.string().optional(),
  brand: z.string().optional(),
  badge: z.preprocess(
    (val) => (!val || val === "none" ? undefined : val),
    z.enum(["sale", "new", "hot"]).optional()
  ),
  discount: z.preprocess(
    (val) => (val === "" || val === null || val === undefined || (typeof val === "number" && Number.isNaN(val)) ? undefined : Number(val)),
    z.number().min(0, "Discount cannot be negative").max(100, "Discount cannot exceed 100%").optional()
  ),
  categoryId: z.preprocess(
    (val) => (!val || val === "none" ? undefined : val),
    z.string().optional()
  ),
  inStock: z.boolean(),
  variants: z.array(
    z.object({
      id: z.string().optional(),
      size: z.string().optional(),
      color: z.string().optional(),
      stockQuantity: z.preprocess(
        (val) => (val === "" || val === null || val === undefined || (typeof val === "number" && Number.isNaN(val)) ? 0 : Number(val)),
        z.number().int().min(0, "Stock quantity must be at least 0")
      ),
      priceOverride: z.preprocess(
        (val) => (val === "" || val === null || val === undefined || (typeof val === "number" && Number.isNaN(val)) ? undefined : Number(val)),
        z.number().positive("Price override must be positive").optional()
      ),
    })
  ),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<{ id?: string; imageUrl: string; altText?: string }[]>([]);

  const { data: product, isLoading, isError } = useQuery<Product>({
    queryKey: ["product", id],
    queryFn: () => apiClient<Product>(`/admin/products/${id}`),
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => apiClient<Category[]>("/admin/categories"),
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      inStock: true,
    },
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } =
    useFieldArray({
      control,
      name: "variants",
    });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description || "",
        price: product.price,
        originalPrice: product.originalPrice || undefined,
        sku: product.sku || "",
        brand: product.brand || "",
        badge: product.badge || undefined,
        discount: product.discount || undefined,
        categoryId: product.categoryId || "",
        inStock: product.inStock,
        variants: product.variants?.map((v) => ({
          id: v.id,
          size: v.size || "",
          color: v.color || "",
          stockQuantity: v.stockQuantity,
          priceOverride: v.priceOverride || undefined,
        })) || [{ size: "M", color: "#000000", stockQuantity: 10 }],
      });

      if (product.images) {
        setImages(product.images.map((img) => ({ id: img.id, imageUrl: img.imageUrl, altText: img.altText || "" })));
      }
    }
  }, [product, reset]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadMedia(file, "products");
        setImages((prev) => [...prev, { imageUrl: res.publicUrl, altText: file.name }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const payload = {
        ...values,
        badge: values.badge ? values.badge : null,
        originalPrice: values.originalPrice ?? null,
        discount: values.discount ?? null,
        categoryId: values.categoryId || null,
        images: images.length > 0 ? images : [],
        variants: values.variants.map((v) => ({
          ...v,
          priceOverride: v.priceOverride ?? null,
        })),
      };
      return apiClient(`/admin/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        showSuccessToast: true,
        successMessage: "Product updated successfully",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      router.push("/products");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-rose-500" />
        <h3 className="text-lg font-semibold">Product Not Found</h3>
        <Button onClick={() => router.push("/products")} variant="outline">
          Back to Products List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="rounded-full"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Edit Product: {product.name}
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            ID: {product.id}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(
          (data) => updateMutation.mutate(data),
          (errors) => {
            console.error("Form validation errors:", errors);
            toast.error("Please fix validation errors in the form");
          }
        )}
        className="space-y-6"
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">General Information</CardTitle>
            <CardDescription className="text-xs">
              Product details, pricing in Nigerian Naira (₦), and categorization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input id="name" {...register("name")} />
                {errors.name && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={4} {...register("description")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (₦) *</Label>
                <Input id="price" type="number" step="0.01" {...register("price", { valueAsNumber: true })} />
                {errors.price && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.price.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="originalPrice">Original Price (₦)</Label>
                <Input id="originalPrice" type="number" step="0.01" {...register("originalPrice", { valueAsNumber: true })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU Code</Label>
                <Input id="sku" {...register("sku")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" {...register("brand")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select
                  value={(watch("categoryId") as string) || "none"}
                  onValueChange={(val) => setValue("categoryId", val === "none" ? "" : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="badge">Promotional Badge</Label>
                <Select
                  value={(watch("badge") as string) || "none"}
                  onValueChange={(val) => setValue("badge", val === "none" ? undefined : (val as "sale" | "new" | "hot"))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="sale">SALE</SelectItem>
                    <SelectItem value="new">NEW</SelectItem>
                    <SelectItem value="hot">HOT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between pt-2 sm:col-span-2">
                <div>
                  <Label htmlFor="inStock" className="text-sm font-semibold">Available In Stock</Label>
                  <p className="text-xs text-muted-foreground">Toggle product availability on storefront</p>
                </div>
                <Switch
                  id="inStock"
                  checked={watch("inStock")}
                  onCheckedChange={(checked) => setValue("inStock", checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media Upload Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Product Media</CardTitle>
            <CardDescription className="text-xs">
              Upload images directly to Supabase Storage products bucket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {images.map((img, index) => (
                <div
                  key={index}
                  className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-muted"
                >
                  <Image
                    src={getImageUrl(img.imageUrl)}
                    alt={img.altText || "Product photo"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-border hover:border-amber-500/50 bg-muted/40 hover:bg-muted/80 cursor-pointer transition-all">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                    <span className="text-xs font-semibold text-foreground">Upload Image</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Variant Builder Card */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Variant Builder</CardTitle>
              <CardDescription className="text-xs">
                Configure size, color options, and stock quantities per variant
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendVariant({ size: "L", color: "#000000", stockQuantity: 5 })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Variant
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {variantFields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/30"
              >
                <div className="w-full sm:w-28 space-y-1">
                  <Label className="text-xs">Size</Label>
                  <Input {...register(`variants.${index}.size`)} />
                </div>

                <div className="w-full sm:w-36 space-y-1">
                  <Label className="text-xs">Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="h-9 w-9 rounded border cursor-pointer p-0.5"
                      {...register(`variants.${index}.color`)}
                    />
                    <Input {...register(`variants.${index}.color`)} />
                  </div>
                </div>

                <div className="w-full sm:w-28 space-y-1">
                  <Label className="text-xs">Stock Qty *</Label>
                  <Input type="number" min="0" {...register(`variants.${index}.stockQuantity`, { valueAsNumber: true })} />
                </div>

                <div className="w-full sm:w-36 space-y-1">
                  <Label className="text-xs">Price Override (₦)</Label>
                  <Input type="number" {...register(`variants.${index}.priceOverride`, { valueAsNumber: true })} />
                </div>

                {variantFields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="self-end sm:self-center text-destructive hover:bg-destructive/10"
                    onClick={() => removeVariant(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/products")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="luxury"
            disabled={updateMutation.isPending}
            className="font-semibold"
          >
            {updateMutation.isPending ? "Updating Product..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
