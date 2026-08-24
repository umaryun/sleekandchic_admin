"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Image as ImageIcon,
  Edit,
  Trash2,
  Upload,
  Loader2,
  ExternalLink,
} from "lucide-react";

import { apiClient, uploadMedia } from "@/src/lib/api-client";
import { HeroSlide } from "@/src/lib/types/api";
import { getImageUrl } from "@/src/lib/utils";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { Switch } from "@/src/components/ui/switch";
import { Skeleton } from "@/src/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";

const slideSchema = z.object({
  boldText: z.string().optional(),
  regularText: z.string().optional(),
  linkText: z.string().optional(),
  href: z.string().optional(),
  imageUrl: z.string().min(1, "Slide image is required"),
  displayOrder: z.preprocess(
    (val) => (val === "" || val === null || val === undefined || (typeof val === "number" && Number.isNaN(val)) ? 0 : Number(val)),
    z.number().int()
  ),
  isActive: z.boolean(),
});

type SlideFormValues = z.infer<typeof slideSchema>;

export default function HeroSlidesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [deleteSlide, setDeleteSlide] = useState<HeroSlide | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedBanner, setUploadedBanner] = useState<string>("");

  const { data: slides, isLoading, isError } = useQuery<HeroSlide[]>({
    queryKey: ["hero-slides"],
    queryFn: () => apiClient<HeroSlide[]>("/admin/hero-slides"),
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(slideSchema),
    defaultValues: {
      boldText: "",
      regularText: "",
      linkText: "",
      href: "",
      imageUrl: "",
      displayOrder: 0,
      isActive: true,
    },
  });

  const openCreateModal = () => {
    setEditingSlide(null);
    setUploadedBanner("");
    reset({
      boldText: "",
      regularText: "",
      linkText: "Shop Collection",
      href: "/collections",
      imageUrl: "",
      displayOrder: 0,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (slide: HeroSlide) => {
    setEditingSlide(slide);
    setUploadedBanner(slide.imageUrl);
    reset({
      boldText: slide.boldText || "",
      regularText: slide.regularText || "",
      linkText: slide.linkText || "",
      href: slide.href || "",
      imageUrl: slide.imageUrl,
      displayOrder: slide.displayOrder,
      isActive: slide.isActive,
    });
    setModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await uploadMedia(file, "banners");
      setUploadedBanner(res.publicUrl);
      setValue("imageUrl", res.publicUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: (values: SlideFormValues) => {
      const payload = {
        ...values,
        imageUrl: uploadedBanner || values.imageUrl,
      };

      if (editingSlide) {
        return apiClient(`/admin/hero-slides/${editingSlide.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
          showSuccessToast: true,
          successMessage: "Hero slide updated",
        });
      } else {
        return apiClient("/admin/hero-slides", {
          method: "POST",
          body: JSON.stringify(payload),
          showSuccessToast: true,
          successMessage: "Hero slide created",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
      setModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/admin/hero-slides/${id}`, {
        method: "DELETE",
        showSuccessToast: true,
        successMessage: "Hero slide deleted",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
      setDeleteSlide(null);
    },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Homepage Hero Slides
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
            Manage storefront hero banners, background images, headings, and CTA buttons
          </p>
        </div>
        <Button variant="luxury" onClick={openCreateModal} className="font-semibold text-sm">
          <Plus className="mr-2 h-4 w-4" /> Add Hero Slide
        </Button>
      </div>

      {/* Hero Slides Grid */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Banner Slides</CardTitle>
          <CardDescription className="text-xs">
            Active and scheduled homepage luxury banners
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : isError || !slides ? (
            <p className="text-sm text-destructive">Failed to load hero slides.</p>
          ) : slides.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-3">
              <ImageIcon className="h-10 w-10 opacity-40 text-amber-500" />
              <p className="text-base font-medium">No hero slides uploaded yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Banner</TableHead>
                  <TableHead>Headings</TableHead>
                  <TableHead>CTA Link</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slides.map((slide) => (
                  <TableRow key={slide.id}>
                    <TableCell>
                      <div className="relative h-14 w-24 rounded-lg overflow-hidden border bg-muted">
                        <Image
                          src={getImageUrl(slide.imageUrl)}
                          alt="Banner"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-foreground">
                          {slide.boldText || "No Bold Heading"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {slide.regularText || "No Subtitle"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs">
                      {slide.href ? (
                        <a
                          href={slide.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-amber-500 hover:underline"
                        >
                          {slide.linkText || slide.href} <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>

                    <TableCell className="font-mono text-xs">
                      {slide.displayOrder}
                    </TableCell>

                    <TableCell>
                      <Badge variant={slide.isActive ? "success" : "secondary"}>
                        {slide.isActive ? "Active" : "Hidden"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(slide)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteSlide(slide)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Modal Create/Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSlide ? "Edit Hero Slide" : "Add Hero Slide"}
            </DialogTitle>
            <DialogDescription>
              Upload banner image to Supabase Storage banners bucket and set call to action text.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit((data) => saveMutation.mutate(data as SlideFormValues))} className="space-y-4">
            <div className="space-y-2">
              <Label>Banner Image *</Label>
              <div className="space-y-2">
                {uploadedBanner && (
                  <div className="relative h-32 w-full rounded-xl overflow-hidden border">
                    <Image src={getImageUrl(uploadedBanner)} alt="Banner Preview" fill className="object-cover" unoptimized />
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed hover:border-amber-500/50 bg-muted/40 cursor-pointer text-xs font-semibold">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  ) : (
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>Upload High-Res Banner Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
                {errors.imageUrl && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.imageUrl.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="boldText">Bold Heading</Label>
                <Input id="boldText" placeholder="AUTUMN COUTURE" {...register("boldText")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regularText">Subtitle Text</Label>
                <Input id="regularText" placeholder="Exclusive Collection" {...register("regularText")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="linkText">Button Label</Label>
                <Input id="linkText" placeholder="Explore Now" {...register("linkText")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="href">CTA Target Link</Label>
                <Input id="href" placeholder="/collections/autumn" {...register("href")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="space-y-2">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input id="displayOrder" type="number" {...register("displayOrder", { valueAsNumber: true })} />
              </div>
              <div className="flex items-center justify-between pt-6">
                <Label htmlFor="isActive" className="text-xs font-semibold">Show Slide</Label>
                <Switch
                  id="isActive"
                  checked={watch("isActive")}
                  onCheckedChange={(val) => setValue("isActive", val)}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="luxury" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save Slide"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={!!deleteSlide} onOpenChange={() => setDeleteSlide(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Hero Slide?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this homepage banner slide?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSlide(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteSlide && deleteMutation.mutate(deleteSlide.id)}
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
