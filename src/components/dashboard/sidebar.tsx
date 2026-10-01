"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  FolderTree,
  ShoppingCart,
  Percent,
  Image as ImageIcon,
  Users,
  ChevronLeft,
  ChevronRight,
  Crown,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/src/components/ui/button";

export const NAV_ITEMS = [
  {
    title: "Overview",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Products",
    href: "/products",
    icon: ShoppingBag,
  },
  {
    title: "Categories",
    href: "/categories",
    icon: FolderTree,
  },
  {
    title: "Orders",
    href: "/orders",
    icon: ShoppingCart,
  },
  {
    title: "Delivery Fees",
    href: "/shipping",
    icon: Truck,
  },
  {
    title: "Discounts",
    href: "/discounts",
    icon: Percent,
  },
  {
    title: "Hero Slides",
    href: "/hero-slides",
    icon: ImageIcon,
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    title: "Admin Team",
    href: "/team",
    icon: ShieldCheck,
  },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r bg-card/60 backdrop-blur-md transition-all duration-300 ease-in-out h-full select-none glass-panel",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border/40">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2.5 font-bold tracking-tight text-foreground transition-all",
            collapsed && "justify-center w-full"
          )}
          onClick={onNavigate}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background shadow-md shrink-0">
            <Crown className="h-5 w-5 fill-current" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-extrabold uppercase tracking-wider">
                Sleekandchic
              </span>
              <span className="text-[10px] uppercase font-sans tracking-widest text-muted-foreground font-semibold">
                Admin Suite
              </span>
            </div>
          )}
        </Link>

        {/* Desktop Collapse Toggle */}
        {!onNavigate && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 group relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                collapsed && "justify-center px-0"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-amber-500"
                )}
              />
              {!collapsed && <span>{item.title}</span>}

              {/* Collapsed Tooltip Indicator */}
              {collapsed && (
                <div className="absolute left-full ml-2 hidden rounded-md bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-md group-hover:block z-50 whitespace-nowrap glass-card border border-border">
                  {item.title}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer info */}
      {!collapsed && (
        <div className="p-4 border-t border-border/40 text-center">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} Sleekandchic
          </p>
        </div>
      )}
    </aside>
  );
}
