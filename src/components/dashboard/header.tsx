"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Menu,
  Sun,
  Moon,
  Laptop,
  LogOut,
  User,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/src/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { Sidebar, NAV_ITEMS } from "./sidebar";
import { signOut, useCurrentAdmin } from "@/src/lib/auth-client";
import { ShieldCheck, Crown } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { admin, isSuperAdmin } = useCurrentAdmin();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const getInitials = (name?: string) => {
    if (!name) return "AD";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate breadcrumb items
  const pathSegments = pathname.split("/").filter(Boolean);
  const currentNavItem = NAV_ITEMS.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border/40 bg-background/70 px-4 backdrop-blur-md glass-panel">
      {/* Left section: Mobile menu & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Mobile Drawer Trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Breadcrumb Navigation */}
        <nav className="flex items-center text-sm font-medium text-muted-foreground">
          <span className="hover:text-foreground transition-colors cursor-pointer" onClick={() => router.push("/")}>
            Dashboard
          </span>
          {pathSegments.length > 0 && (
            <ChevronRight className="h-4 w-4 mx-1.5 opacity-60 shrink-0" />
          )}
          {currentNavItem && pathSegments.length > 0 && (
            <span className="text-foreground font-semibold capitalize">
              {currentNavItem.title}
            </span>
          )}
          {pathSegments.length > 1 && (
            <>
              <ChevronRight className="h-4 w-4 mx-1.5 opacity-60 shrink-0" />
              <span className="text-amber-500 font-semibold uppercase text-xs tracking-wider">
                {pathSegments[pathSegments.length - 1]}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right section: Theme Toggle & Admin User Menu */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        {mounted && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                {theme === "dark" ? (
                  <Moon className="h-4 w-4 text-amber-400" />
                ) : theme === "light" ? (
                  <Sun className="h-4 w-4 text-amber-600" />
                ) : (
                  <Laptop className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-panel">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 h-4 w-4 text-amber-500" /> Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 h-4 w-4 text-amber-400" /> Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Laptop className="mr-2 h-4 w-4" /> System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Admin Avatar & Logout Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full ring-2 ring-amber-500/20 p-0 hover:ring-amber-500/50 transition-all"
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className="gold-gradient-bg text-black font-bold text-xs">
                  {getInitials(admin?.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 glass-panel">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold leading-none">{admin?.name || "Admin Manager"}</p>
                  <Badge variant={isSuperAdmin ? "luxury" : "secondary"} className="text-[10px] uppercase font-mono px-1.5 py-0">
                    {isSuperAdmin ? "Super Admin" : "Admin"}
                  </Badge>
                </div>
                <p className="text-xs leading-none text-muted-foreground">
                  {admin?.email || "admin@slickandchic.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/team")} className="cursor-pointer">
              <ShieldCheck className="mr-2 h-4 w-4 text-amber-500" /> Team & Roles
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
