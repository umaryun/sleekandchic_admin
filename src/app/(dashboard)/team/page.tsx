"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Crown,
  UserPlus,
  MoreHorizontal,
  Edit2,
  Trash2,
  Mail,
  User,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Users,
  Shield,
  KeyRound,
  Search,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/src/lib/api-client";
import { AdminUser, AdminRole, AdminListResponse, InviteResult } from "@/src/lib/types/api";
import { useCurrentAdmin } from "@/src/lib/auth-client";
import { formatDate } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Badge } from "@/src/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Skeleton } from "@/src/components/ui/skeleton";
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

export default function AdminTeamPage() {
  const queryClient = useQueryClient();
  const { admin: currentLoggedInAdmin, isSuperAdmin } = useCurrentAdmin();

  const [search, setSearch] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editRoleModalAdmin, setEditRoleModalAdmin] = useState<AdminUser | null>(null);
  const [deleteModalAdmin, setDeleteModalAdmin] = useState<AdminUser | null>(null);

  // Invite Form State
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminRole>("admin");
  // Shown when the invitation email couldn't be sent, to pass on by hand.
  const [setupLink, setSetupLink] = useState<{ email: string; url: string } | null>(null);

  // Edit Role State
  const [selectedRole, setSelectedRole] = useState<AdminRole>("admin");
  const [selectedStatus, setSelectedStatus] = useState<AdminUser["status"]>("active");

  // Fetch Team Members from API
  const { data: teamData, isLoading, refetch } = useQuery<AdminListResponse>({
    queryKey: ["admin-team", search, selectedRoleFilter, selectedStatusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedRoleFilter !== "all") params.append("role", selectedRoleFilter);
      if (selectedStatusFilter !== "all") params.append("status", selectedStatusFilter);
      return apiClient<AdminListResponse>(`/admin/team?${params.toString()}`);
    },
  });

  // Invite Mutation
  const inviteMutation = useMutation({
    mutationFn: async (newAdmin: { name: string; email: string; role: AdminRole }) => {
      return apiClient<InviteResult>("/admin/team/invite", {
        method: "POST",
        body: JSON.stringify(newAdmin),
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-team"] });
      setInviteModalOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("admin");

      const { emailSent, setupLink: url } = result.invitation;
      if (result.status === "active") {
        toast.success(`${result.email} can now sign in with their existing password${emailSent ? "; we've emailed them" : ""}.`);
      } else if (emailSent) {
        toast.success(`Invitation sent to ${result.email}`);
      } else if (url) {
        setSetupLink({ email: result.email, url });
      }
    },
  });

  // Edit Role Mutation
  const editRoleMutation = useMutation({
    mutationFn: async ({ id, role, status }: { id: string; role: AdminRole; status: AdminUser["status"] }) => {
      return apiClient<AdminUser>(`/admin/team/${id}`, {
        method: "PUT",
        body: JSON.stringify({ role, status }),
        showSuccessToast: true,
        successMessage: "Admin role updated successfully!",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-team"] });
      setEditRoleModalAdmin(null);
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient(`/admin/team/${id}`, {
        method: "DELETE",
        showSuccessToast: true,
        successMessage: "Admin access revoked successfully",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-team"] });
      setDeleteModalAdmin(null);
    },
  });

  const admins: AdminUser[] = Array.isArray(teamData)
    ? teamData
    : teamData?.admins ?? [];

  const superAdminCount = admins.filter((a) => a.role === "super_admin").length;
  const regularAdminCount = admins.filter((a) => a.role === "admin").length;

  const getInitials = (name?: string) => {
    if (!name) return "AD";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: AdminRole) => {
    if (role === "super_admin") {
      return (
        <Badge variant="luxury" className="gap-1 px-2 py-0.5 font-semibold text-xs tracking-wide">
          <Crown className="h-3 w-3 fill-current" /> Super Admin
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1 px-2 py-0.5 font-semibold text-xs border border-border/80">
        <Shield className="h-3 w-3 text-muted-foreground" /> Admin
      </Badge>
    );
  };

  const getStatusBadge = (status: AdminUser["status"]) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "invited":
        return <Badge variant="warning">Invited</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleOpenEditModal = (admin: AdminUser) => {
    setEditRoleModalAdmin(admin);
    setSelectedRole(admin.role);
    setSelectedStatus(admin.status);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Team & Roles</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
            Manage administrative personnel, assign Super Admin and Regular Admin roles
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
          </Button>
          <Button
            variant="luxury"
            size="sm"
            onClick={() => setInviteModalOpen(true)}
            className="font-semibold shadow-md"
          >
            <UserPlus className="mr-1.5 h-4 w-4" /> Invite Admin
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Admin Staff
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Authorized dashboard users</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-amber-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-500">
              Super Admins
            </CardTitle>
            <div className="h-8 w-8 rounded-lg gold-gradient-bg text-black flex items-center justify-center shadow">
              <Crown className="h-4 w-4 fill-current" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{superAdminCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Full master permissions</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Regular Admins
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{regularAdminCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Catalog & order operations</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="super_admin">Super Admins</SelectItem>
              <SelectItem value="admin">Regular Admins</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Admin Team Table */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base font-semibold">Authorized Administrators</CardTitle>
          <CardDescription className="text-xs">
            Review personnel with administrative console access and modify their security clearance
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : admins.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium">No administrators found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/40">
                  <TableHead>Administrator</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((member) => (
                  <TableRow key={member.id} className="border-border/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="gold-gradient-bg text-black font-bold text-xs">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                            {member.name}
                            {member.email === currentLoggedInAdmin?.email && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                                You
                              </Badge>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">{member.email}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>{getRoleBadge(member.role)}</TableCell>

                    <TableCell>{getStatusBadge(member.status)}</TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(member.createdAt)}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {member.lastLoginAt ? formatDate(member.lastLoginAt) : "Never"}
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 glass-panel">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Manage Admin
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleOpenEditModal(member)}
                            className="cursor-pointer"
                          >
                            <Edit2 className="mr-2 h-4 w-4" /> Change Role / Status
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteModalAdmin(member)}
                            disabled={member.email === currentLoggedInAdmin?.email}
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Revoke Access
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Role Comparison & Access Matrix */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-500" /> Role Permissions Matrix
          </CardTitle>
          <CardDescription className="text-xs">
            Overview of capabilities granted to Super Admins vs Regular Admins
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40">
                <TableHead className="w-1/3">Feature / Module</TableHead>
                <TableHead className="w-1/3">
                  <div className="flex items-center gap-1.5 font-bold text-amber-500">
                    <Crown className="h-3.5 w-3.5 fill-current" /> Super Admin
                  </div>
                </TableHead>
                <TableHead className="w-1/3">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Shield className="h-3.5 w-3.5" /> Regular Admin
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              <TableRow>
                <TableCell className="font-medium">Analytics & Revenue Metrics</TableCell>
                <TableCell className="text-emerald-500 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Full Revenue & Financials
                </TableCell>
                <TableCell className="text-emerald-500 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" /> View Stats
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-medium">Catalog & Products Management</TableCell>
                <TableCell className="text-emerald-500 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" /> Full CRUD (Create, Edit, Delete)
                </TableCell>
                <TableCell className="text-emerald-500 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" /> Create & Edit Products
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-medium">Orders & Fulfillment Statuses</TableCell>
                <TableCell className="text-emerald-500 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" /> Full Control & Delete Orders
                </TableCell>
                <TableCell className="text-emerald-500 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" /> Update Status & Fulfill
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-medium">Discounts, Banners & Categories</TableCell>
                <TableCell className="text-emerald-500 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" /> Full CRUD (Create, Edit, Delete)
                </TableCell>
                <TableCell className="text-emerald-500 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" /> Create & Edit
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-medium">Admin Team & Security Roles</TableCell>
                <TableCell className="text-emerald-500 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" /> Invite, Edit, Revoke Admins
                </TableCell>
                <TableCell className="text-muted-foreground font-semibold">
                  Restricted (View Only)
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite Admin Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-amber-500" /> Invite Administrator
            </DialogTitle>
            <DialogDescription>
              They&apos;ll get an email with a link to choose their own password. If they already shop with this email, they keep their existing password.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!inviteName || !inviteEmail) {
                toast.error("Please provide both name and email");
                return;
              }
              inviteMutation.mutate({
                name: inviteName,
                email: inviteEmail,
                role: inviteRole,
              });
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label htmlFor="admin-name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-name"
                  placeholder="e.g. Jane Doe"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="jane@slickandchic.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-role">Assigned Role *</Label>
              <Select
                value={inviteRole}
                onValueChange={(val) => setInviteRole(val as AdminRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span>Regular Admin (Standard Operations)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="super_admin">
                    <div className="flex items-center gap-2 font-semibold text-amber-500">
                      <Crown className="h-4 w-4 fill-current" />
                      <span>Super Admin (Full Master Control)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setInviteModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="luxury" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? "Inviting..." : "Send invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invitation link, when email isn't set up */}
      <Dialog open={!!setupLink} onOpenChange={() => setSetupLink(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send this link to {setupLink?.email}</DialogTitle>
            <DialogDescription>
              Email isn&apos;t set up on the server, so the invitation wasn&apos;t sent. Send them this link yourself, for example on WhatsApp. It lets them choose a password, works once, and expires in 72 hours.
            </DialogDescription>
          </DialogHeader>
          <Input readOnly value={setupLink?.url ?? ""} onFocus={(e) => e.target.select()} aria-label="Set-password link" />
          <DialogFooter>
            <Button
              variant="luxury"
              onClick={async () => {
                if (!setupLink) return;
                try {
                  await navigator.clipboard.writeText(setupLink.url);
                  toast.success("Link copied");
                } catch {
                  toast.error("Couldn't copy. Select the link and copy it.");
                }
              }}
            >
              Copy link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Modal */}
      <Dialog open={!!editRoleModalAdmin} onOpenChange={() => setEditRoleModalAdmin(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Administrator Role</DialogTitle>
            <DialogDescription>
              Update role and status for <strong>{editRoleModalAdmin?.name}</strong> ({editRoleModalAdmin?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Assigned Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(val) => setSelectedRole(val as AdminRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Regular Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin (Master)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Account Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(val) => setSelectedStatus(val as AdminUser["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (Full Access)</SelectItem>
                  <SelectItem value="suspended">Suspended (Access Blocked)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setEditRoleModalAdmin(null)}>
              Cancel
            </Button>
            <Button
              variant="luxury"
              disabled={editRoleMutation.isPending}
              onClick={() =>
                editRoleModalAdmin &&
                editRoleMutation.mutate({
                  id: editRoleModalAdmin.id,
                  role: selectedRole,
                  status: selectedStatus,
                })
              }
            >
              {editRoleMutation.isPending ? "Saving..." : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Access Confirmation Dialog */}
      <Dialog open={!!deleteModalAdmin} onOpenChange={() => setDeleteModalAdmin(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Revoke Admin Access
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke administrative access for{" "}
              <strong>{deleteModalAdmin?.name}</strong> ({deleteModalAdmin?.email})? They will no longer be able to log into the admin portal.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeleteModalAdmin(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteModalAdmin && deleteMutation.mutate(deleteModalAdmin.id)}
            >
              {deleteMutation.isPending ? "Revoking..." : "Revoke Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
