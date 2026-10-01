"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useQuery, useMutation } from "@tanstack/react-query";
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
} from "lucide-react";

import { apiClient, uploadMedia, IMAGE_ACCEPT } from "@/src/lib/api-client";
import { Category } from "@/src/lib/types/api";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { ColourSuggestions } from "@/src/components/products/colour-suggestions";
import { Textarea } from "@/src/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Switch } from "@/src/components/ui/switch";

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

export default function CreateProductPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<{ imageUrl: string; altText?: string }[]>([]);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => apiClient<Category[]>("/admin/categories"),
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      inStock: true,
      variants: [
        { size: "", color: "", stockQuantity: 0 },
      ],
    },
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } =
    useFieldArray({
      control,
      name: "variants",
    });

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

  const createMutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const payload = {
        ...values,
        badge: values.badge || undefined,
        originalPrice: values.originalPrice || undefined,
        categoryId: values.categoryId || undefined,
        images: images.length > 0 ? images : undefined,
        variants: values.variants.map((v) => ({
          ...v,
          priceOverride: v.priceOverride || undefined,
        })),
      };
      return apiClient("/admin/products", {
        method: "POST",
        body: JSON.stringify(payload),
        showSuccessToast: true,
        successMessage: "Product created successfully",
      });
    },
    onSuccess: () => {
      router.push("/products");
    },
  });

  const onSubmit = (values: ProductFormValues) => {
    createMutation.mutate(values);
  };

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
            Create New Product
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Add a new item to the Sleekandchic shop
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                <Input
                  id="name"
                  placeholder="e.g. Silk Satin Evening Gown"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the material, fit, and styling recommendations..."
                  rows={4}
                  {...register("description")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (₦) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="150000"
                  {...register("price", { valueAsNumber: true })}
                />
                {errors.price && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.price.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="originalPrice">Original Price (₦)</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  step="0.01"
                  placeholder="180000 (Optional)"
                  {...register("originalPrice", { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU Code</Label>
                <Input id="sku" placeholder="SC-DRS-001" {...register("sku")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" placeholder="Sleekandchic" {...register("brand")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select
                  value={(watch("categoryId") as string) || "none"}
                  onValueChange={(val) => setValue("categoryId", val === "none" ? undefined : val)}
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
                    src={img.imageUrl}
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
                    <span className="text-[10px] text-muted-foreground mt-0.5">JPEG, PNG or WebP, up to 5 MB</span>
                  </>
                )}
                <input
                  type="file"
                  accept={IMAGE_ACCEPT}
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
                Configure size, color options, and individual inventory quantities
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendVariant({ size: "", color: "", stockQuantity: 0 })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Variant
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Suggestions keep colour names consistent; any name can be typed. */}
            <ColourSuggestions />
            {variantFields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/30"
              >
                <div className="w-full sm:w-28 space-y-1">
                  <Label className="text-xs">Size</Label>
                  <Input
                    placeholder="S, M, L, XL"
                    {...register(`variants.${index}.size`)}
                  />
                </div>

                <div className="w-full sm:w-36 space-y-1">
                  <Label className="text-xs" htmlFor={`variant-colour-${index}`}>Colour</Label>
                  <Input
                    id={`variant-colour-${index}`}
                    placeholder="e.g. Black"
                    list="colour-names"
                    autoComplete="off"
                    {...register(`variants.${index}.color`)}
                  />
                </div>

                <div className="w-full sm:w-28 space-y-1">
                  <Label className="text-xs">Stock Qty *</Label>
                  <Input
                    type="number"
                    min="0"
                    {...register(`variants.${index}.stockQuantity`, { valueAsNumber: true })}
                  />
                </div>

                <div className="w-full sm:w-36 space-y-1">
                  <Label className="text-xs">Price Override (₦)</Label>
                  <Input
                    type="number"
                    placeholder="Optional"
                    {...register(`variants.${index}.priceOverride`, { valueAsNumber: true })}
                  />
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
            disabled={createMutation.isPending}
            className="font-semibold"
          >
            {createMutation.isPending ? "Saving Product..." : "Publish Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
