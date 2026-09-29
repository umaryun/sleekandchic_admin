"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Truck,
  Plus,
  Edit,
  Search,
  SlidersHorizontal,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Zap,
} from "lucide-react";

import { apiClient } from "@/src/lib/api-client";
import { ShippingRate, ShippingRatesResponse } from "@/src/lib/types/api";
import { formatNGN } from "@/src/lib/utils";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { Switch } from "@/src/components/ui/switch";
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

const ZONE_DESCRIPTIONS: Record<string, string> = {
  A: "Local (Kaduna & Nearby)",
  B: "Northern Nigeria + Abuja",
  C: "Southwest Nigeria (Lagos, Ogun, etc.)",
  D: "Southeast / South-South",
  E: "Far North / Remote",
};

const ZONE_BADGE_STYLES: Record<string, string> = {
  A: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  B: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  C: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  D: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  E: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

const rateSchema = z.object({
  state: z.string().min(1, "Location / State name is required"),
  zone: z.enum(["A", "B", "C", "D", "E"]),
  standardBase: z.number({ message: "Standard base fee must be a number" }).int().min(0),
  expressBase: z.number({ message: "Express base fee must be a number" }).int().min(0),
  estimatedDaysStandard: z.string().min(1, "Standard delivery estimate is required"),
  estimatedDaysExpress: z.string().min(1, "Express delivery estimate is required"),
  freeShippingThreshold: z.number({ message: "Threshold must be a number" }).int().min(0),
  isActive: z.boolean(),
});

type RateFormValues = z.infer<typeof rateSchema>;

const bulkZoneSchema = z.object({
  zone: z.enum(["A", "B", "C", "D", "E"]),
  standardBase: z.number().int().min(0).optional(),
  expressBase: z.number().int().min(0).optional(),
  estimatedDaysStandard: z.string().min(1).optional(),
  estimatedDaysExpress: z.string().min(1).optional(),
  freeShippingThreshold: z.number().int().min(0).optional(),
});

type BulkZoneValues = z.infer<typeof bulkZoneSchema>;

export default function ShippingPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<ShippingRatesResponse>({
    queryKey: ["shipping-rates"],
    queryFn: () => apiClient<ShippingRatesResponse>("/admin/shipping?all=true"),
  });

  const ratesList = data?.shippingRates || [];

  const {
    register: registerForm,
    handleSubmit: handleSubmitForm,
    setValue: setFormValue,
    reset: resetForm,
    watch: watchForm,
    formState: { errors: formErrors, isSubmitting },
  } = useForm({
    resolver: zodResolver(rateSchema),
    defaultValues: {
      state: "",
      zone: "C" as const,
      standardBase: 3000,
      expressBase: 6000,
      estimatedDaysStandard: "3–5 days",
      estimatedDaysExpress: "1–2 days",
      freeShippingThreshold: 75000,
      isActive: true,
    },
  });

  const {
    register: registerBulk,
    handleSubmit: handleSubmitBulk,
    setValue: setBulkValue,
    reset: resetBulk,
    watch: watchBulk,
    formState: { isSubmitting: isBulkSubmitting },
  } = useForm({
    resolver: zodResolver(bulkZoneSchema),
    defaultValues: {
      zone: "A" as const,
      standardBase: 1500,
      expressBase: 3500,
      estimatedDaysStandard: "1–2 days",
      estimatedDaysExpress: "Same day / Next day",
      freeShippingThreshold: 30000,
    },
  });

  const openEditModal = (rate: ShippingRate) => {
    setEditingRate(rate);
    resetForm({
      state: rate.state,
      zone: (rate.zone as "A" | "B" | "C" | "D" | "E") || "C",
      standardBase: Number(rate.standardBase),
      expressBase: Number(rate.expressBase),
      estimatedDaysStandard: rate.estimatedDaysStandard,
      estimatedDaysExpress: rate.estimatedDaysExpress,
      freeShippingThreshold: Number(rate.freeShippingThreshold),
      isActive: rate.isActive,
    });
    setEditModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingRate(null);
    resetForm({
      state: "",
      zone: "C",
      standardBase: 3000,
      expressBase: 6000,
      estimatedDaysStandard: "3–5 days",
      estimatedDaysExpress: "1–2 days",
      freeShippingThreshold: 75000,
      isActive: true,
    });
    setCreateModalOpen(true);
  };

  const openBulkModal = (zone: "A" | "B" | "C" | "D" | "E" = "A") => {
    const sample = ratesList.find((r) => r.zone === zone);
    resetBulk({
      zone,
      standardBase: sample ? Number(sample.standardBase) : 2500,
      expressBase: sample ? Number(sample.expressBase) : 5000,
      estimatedDaysStandard: sample?.estimatedDaysStandard ?? "2–3 days",
      estimatedDaysExpress: sample?.estimatedDaysExpress ?? "1–2 days",
      freeShippingThreshold: sample ? Number(sample.freeShippingThreshold) : 50000,
    });
    setBulkModalOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: RateFormValues }) =>
      apiClient(`/admin/shipping/${id}`, {
        method: "PUT",
        body: JSON.stringify(values),
        showSuccessToast: true,
        successMessage: `Delivery fees for ${values.state} updated`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-rates"] });
      setEditModalOpen(false);
      setEditingRate(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: RateFormValues) =>
      apiClient("/admin/shipping", {
        method: "POST",
        body: JSON.stringify(values),
        showSuccessToast: true,
        successMessage: `Added delivery rate for ${values.state}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-rates"] });
      setCreateModalOpen(false);
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (values: BulkZoneValues) =>
      apiClient("/admin/shipping/bulk", {
        method: "POST",
        body: JSON.stringify({
          targetType: "zone",
          zone: values.zone,
          standardBase: values.standardBase,
          expressBase: values.expressBase,
          estimatedDaysStandard: values.estimatedDaysStandard,
          estimatedDaysExpress: values.estimatedDaysExpress,
          freeShippingThreshold: values.freeShippingThreshold,
        }),
        showSuccessToast: true,
        successMessage: `Bulk rates updated for Zone ${values.zone}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-rates"] });
      setBulkModalOpen(false);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, state, isActive }: { id: string; state: string; isActive: boolean }) =>
      apiClient(`/admin/shipping/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
        showSuccessToast: true,
        successMessage: `${state} set to ${isActive ? "Active" : "Inactive"}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-rates"] });
    },
  });

  const filteredRates = useMemo(() => {
    return ratesList.filter((item) => {
      const matchesSearch =
        search.trim() === "" ||
        item.state.toLowerCase().includes(search.toLowerCase().trim()) ||
        item.zone.toLowerCase() === search.toLowerCase().trim();

      const matchesZone = selectedZone === "all" || item.zone === selectedZone;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.isActive) ||
        (statusFilter === "inactive" && !item.isActive);

      return matchesSearch && matchesZone && matchesStatus;
    });
  }, [ratesList, search, selectedZone, statusFilter]);

  const totalLocations = ratesList.length;
  const activeLocations = ratesList.filter((r) => r.isActive).length;
  const avgStandardFee = useMemo(() => {
    if (ratesList.length === 0) return 0;
    const sum = ratesList.reduce((acc, r) => acc + Number(r.standardBase), 0);
    return Math.round(sum / ratesList.length);
  }, [ratesList]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-6 w-6 text-amber-500" />
            Delivery Fees & Shipping Zones
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
            Configure delivery prices, estimated transit days, and free shipping thresholds per state
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openBulkModal("A")}
            className="border-amber-500/30 hover:border-amber-500/60 text-amber-500"
          >
            <SlidersHorizontal className="h-4 w-4 mr-1.5" />
            Bulk Zone Pricing
          </Button>

          <Button
            size="sm"
            onClick={openCreateModal}
            className="gold-gradient-bg text-black font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Location
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-panel border-border/40 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Total Destinations
            </CardTitle>
            <MapPin className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{totalLocations}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {activeLocations} active shipping routes
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/40 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Average Standard Fee
            </CardTitle>
            <Truck className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-500">
              {formatNGN(avgStandardFee)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Across all zones nationwide</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/40 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Free Shipping Starts
            </CardTitle>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-500">{formatNGN(30000)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Zone A over ₦30k, Zone E over ₦100k</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/40 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Fulfillment Hub
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold">Kaduna (Zone A)</div>
            <p className="text-[11px] text-muted-foreground mt-1">Warehouse primary dispatch</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel border-border/40 shadow-sm">
        <CardHeader className="p-4 pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Delivery Fee Registry</CardTitle>
              <CardDescription className="text-xs">
                Showing {filteredRates.length} of {totalLocations} destination states & locations
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[180px] max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search state name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-xs glass-panel"
                />
              </div>

              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger className="h-9 text-xs w-[130px] glass-panel">
                  <SelectValue placeholder="All Zones" />
                </SelectTrigger>
                <SelectContent className="glass-panel">
                  <SelectItem value="all">All Zones</SelectItem>
                  <SelectItem value="A">Zone A (Local)</SelectItem>
                  <SelectItem value="B">Zone B (North)</SelectItem>
                  <SelectItem value="C">Zone C (Southwest)</SelectItem>
                  <SelectItem value="D">Zone D (East/South)</SelectItem>
                  <SelectItem value="E">Zone E (Far North)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs w-[110px] glass-panel">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="glass-panel">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => refetch()}
                title="Refresh table"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="w-[180px]">State / Location</TableHead>
                  <TableHead className="w-[140px]">Zone</TableHead>
                  <TableHead>Standard Delivery</TableHead>
                  <TableHead>Express Delivery</TableHead>
                  <TableHead>Free Shipping Over</TableHead>
                  <TableHead className="w-[90px] text-center">Active</TableHead>
                  <TableHead className="w-[100px] text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className="border-border/40">
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                      <TableCell className="text-right pr-4"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-destructive">
                      Failed to load delivery fees. Please check your backend connection.
                    </TableCell>
                  </TableRow>
                ) : filteredRates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No delivery locations found matching your filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRates.map((rate) => {
                    const badgeClass =
                      ZONE_BADGE_STYLES[rate.zone] || "bg-muted text-muted-foreground";

                    return (
                      <TableRow
                        key={rate.id}
                        className="border-border/40 hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-semibold text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>{rate.state}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <Badge
                              variant="outline"
                              className={`text-[11px] font-bold w-fit border ${badgeClass}`}
                            >
                              Zone {rate.zone}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                              {ZONE_DESCRIPTIONS[rate.zone] || "Regional zone"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground text-sm">
                              {formatNGN(rate.standardBase)}
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3 inline" />
                              {rate.estimatedDaysStandard}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-amber-500 text-sm">
                              {formatNGN(rate.expressBase)}
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Zap className="h-3 w-3 inline text-amber-500" />
                              {rate.estimatedDaysExpress}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="text-xs font-medium text-emerald-500">
                            {formatNGN(rate.freeShippingThreshold)}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <Switch
                            checked={rate.isActive}
                            onCheckedChange={(checked) =>
                              toggleActiveMutation.mutate({
                                id: rate.id,
                                state: rate.state,
                                isActive: checked,
                              })
                            }
                            disabled={toggleActiveMutation.isPending}
                          />
                        </TableCell>

                        <TableCell className="text-right pr-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(rate)}
                            className="h-8 px-2 text-xs hover:bg-amber-500/10 hover:text-amber-500"
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Delivery Fee Dialog */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[500px] glass-panel border-border/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-500" />
              Edit Delivery Fee — {editingRate?.state}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update standard and express rates, estimated transit times, and free shipping thresholds.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmitForm((values) => {
              if (editingRate) {
                updateMutation.mutate({ id: editingRate.id, values: values as RateFormValues });
              }
            })}
            className="space-y-4 pt-2"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-xs">Location / State</Label>
                <Input
                  {...registerForm("state")}
                  placeholder="State name"
                  className="h-9 text-xs glass-panel"
                />
                {formErrors.state && (
                  <p className="text-[10px] text-destructive">{formErrors.state.message}</p>
                )}
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-xs">Shipping Zone</Label>
                <Select
                  value={watchForm("zone")}
                  onValueChange={(val) => setFormValue("zone", val as "A" | "B" | "C" | "D" | "E")}
                >
                  <SelectTrigger className="h-9 text-xs glass-panel">
                    <SelectValue placeholder="Select Zone" />
                  </SelectTrigger>
                  <SelectContent className="glass-panel">
                    <SelectItem value="A">Zone A — Warehouse Region</SelectItem>
                    <SelectItem value="B">Zone B — Northern / Abuja</SelectItem>
                    <SelectItem value="C">Zone C — Southwest</SelectItem>
                    <SelectItem value="D">Zone D — Southeast / South-South</SelectItem>
                    <SelectItem value="E">Zone E — Far North / Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Standard Delivery Settings
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Base Fee (₦)</Label>
                  <Input
                    type="number"
                    {...registerForm("standardBase", { valueAsNumber: true })}
                    className="h-8 text-xs glass-panel font-mono"
                  />
                  {formErrors.standardBase && (
                    <p className="text-[10px] text-destructive">{formErrors.standardBase.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Estimated Days</Label>
                  <Input
                    {...registerForm("estimatedDaysStandard")}
                    placeholder="e.g. 2–3 days"
                    className="h-8 text-xs glass-panel"
                  />
                  {formErrors.estimatedDaysStandard && (
                    <p className="text-[10px] text-destructive">{formErrors.estimatedDaysStandard.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-500">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Express Delivery Settings
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Base Fee (₦)</Label>
                  <Input
                    type="number"
                    {...registerForm("expressBase", { valueAsNumber: true })}
                    className="h-8 text-xs glass-panel font-mono"
                  />
                  {formErrors.expressBase && (
                    <p className="text-[10px] text-destructive">{formErrors.expressBase.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Estimated Days</Label>
                  <Input
                    {...registerForm("estimatedDaysExpress")}
                    placeholder="e.g. 1–2 days"
                    className="h-8 text-xs glass-panel"
                  />
                  {formErrors.estimatedDaysExpress && (
                    <p className="text-[10px] text-destructive">{formErrors.estimatedDaysExpress.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Free Standard Shipping Threshold (₦)</Label>
              <Input
                type="number"
                {...registerForm("freeShippingThreshold", { valueAsNumber: true })}
                placeholder="75000"
                className="h-9 text-xs glass-panel font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Orders equal or exceeding this subtotal qualify for free standard shipping.
              </p>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/40">
              <div className="space-y-0.5">
                <Label className="text-xs">Enable Route</Label>
                <p className="text-[10px] text-muted-foreground">
                  Available for customers during checkout
                </p>
              </div>
              <Switch
                checked={watchForm("isActive")}
                onCheckedChange={(checked) => setFormValue("isActive", checked)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || updateMutation.isPending}
                className="gold-gradient-bg text-black font-semibold"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add New Location Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px] glass-panel border-border/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-amber-500" />
              Add Delivery Destination
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a new state, territory, or specialized delivery zone with custom fee structures.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmitForm((values) => createMutation.mutate(values as RateFormValues))}
            className="space-y-4 pt-2"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-xs">Location / State Name</Label>
                <Input
                  {...registerForm("state")}
                  placeholder="e.g. Lagos Island"
                  className="h-9 text-xs glass-panel"
                />
                {formErrors.state && (
                  <p className="text-[10px] text-destructive">{formErrors.state.message}</p>
                )}
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-xs">Zone Category</Label>
                <Select
                  value={watchForm("zone")}
                  onValueChange={(val) => setFormValue("zone", val as "A" | "B" | "C" | "D" | "E")}
                >
                  <SelectTrigger className="h-9 text-xs glass-panel">
                    <SelectValue placeholder="Select Zone" />
                  </SelectTrigger>
                  <SelectContent className="glass-panel">
                    <SelectItem value="A">Zone A — Warehouse Region</SelectItem>
                    <SelectItem value="B">Zone B — Northern / Abuja</SelectItem>
                    <SelectItem value="C">Zone C — Southwest</SelectItem>
                    <SelectItem value="D">Zone D — Southeast / South-South</SelectItem>
                    <SelectItem value="E">Zone E — Far North / Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border/40 bg-muted/20">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Standard Fee (₦)</Label>
                <Input
                  type="number"
                  {...registerForm("standardBase", { valueAsNumber: true })}
                  className="h-8 text-xs glass-panel font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Standard Days</Label>
                <Input
                  {...registerForm("estimatedDaysStandard")}
                  placeholder="3–5 days"
                  className="h-8 text-xs glass-panel"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Express Fee (₦)</Label>
                <Input
                  type="number"
                  {...registerForm("expressBase", { valueAsNumber: true })}
                  className="h-8 text-xs glass-panel font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Express Days</Label>
                <Input
                  {...registerForm("estimatedDaysExpress")}
                  placeholder="1–2 days"
                  className="h-8 text-xs glass-panel"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Free Shipping Threshold (₦)</Label>
              <Input
                type="number"
                {...registerForm("freeShippingThreshold", { valueAsNumber: true })}
                placeholder="75000"
                className="h-9 text-xs glass-panel font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || createMutation.isPending}
                className="gold-gradient-bg text-black font-semibold"
              >
                {createMutation.isPending ? "Creating..." : "Create Destination"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Zone Pricing Dialog */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="sm:max-w-[480px] glass-panel border-border/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-amber-500" />
              Bulk Zone Pricing Update
            </DialogTitle>
            <DialogDescription className="text-xs">
              Apply uniform delivery fees and transit estimates to all states within a selected Zone.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmitBulk((values) => bulkMutation.mutate(values as BulkZoneValues))}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs">Target Shipping Zone</Label>
              <Select
                value={watchBulk("zone")}
                onValueChange={(val) => {
                  const z = val as "A" | "B" | "C" | "D" | "E";
                  setBulkValue("zone", z);
                  const sample = ratesList.find((r) => r.zone === z);
                  if (sample) {
                    setBulkValue("standardBase", Number(sample.standardBase));
                    setBulkValue("expressBase", Number(sample.expressBase));
                    setBulkValue("estimatedDaysStandard", sample.estimatedDaysStandard);
                    setBulkValue("estimatedDaysExpress", sample.estimatedDaysExpress);
                    setBulkValue("freeShippingThreshold", Number(sample.freeShippingThreshold));
                  }
                }}
              >
                <SelectTrigger className="h-9 text-xs glass-panel">
                  <SelectValue placeholder="Select Zone" />
                </SelectTrigger>
                <SelectContent className="glass-panel">
                  <SelectItem value="A">Zone A — Warehouse Region (Kaduna & Neighbors)</SelectItem>
                  <SelectItem value="B">Zone B — Northern States + Abuja</SelectItem>
                  <SelectItem value="C">Zone C — Southwest (Lagos, Ogun, Oyo, etc.)</SelectItem>
                  <SelectItem value="D">Zone D — Southeast & South-South</SelectItem>
                  <SelectItem value="E">Zone E — Far North / Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Standard Base Fee (₦)</Label>
                <Input
                  type="number"
                  {...registerBulk("standardBase", { valueAsNumber: true })}
                  className="h-8 text-xs glass-panel font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Standard Transit Time</Label>
                <Input
                  {...registerBulk("estimatedDaysStandard")}
                  placeholder="e.g. 2–3 days"
                  className="h-8 text-xs glass-panel"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Express Base Fee (₦)</Label>
                <Input
                  type="number"
                  {...registerBulk("expressBase", { valueAsNumber: true })}
                  className="h-8 text-xs glass-panel font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Express Transit Time</Label>
                <Input
                  {...registerBulk("estimatedDaysExpress")}
                  placeholder="e.g. 1–2 days"
                  className="h-8 text-xs glass-panel"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Free Standard Shipping Threshold (₦)</Label>
              <Input
                type="number"
                {...registerBulk("freeShippingThreshold", { valueAsNumber: true })}
                className="h-8 text-xs glass-panel font-mono"
              />
            </div>

            <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-[11px] text-amber-500 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                This will update all {ratesList.filter((r) => r.zone === watchBulk("zone")).length} states
                in Zone {watchBulk("zone")}.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBulkModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isBulkSubmitting || bulkMutation.isPending}
                className="gold-gradient-bg text-black font-semibold"
              >
                {bulkMutation.isPending ? "Updating Zone..." : "Apply to Zone"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
