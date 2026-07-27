import React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  highlight?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  highlight = false,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
        highlight && "border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/10",
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
              highlight
                ? "bg-rose-500/20 text-rose-500"
                : "bg-amber-500/10 text-amber-500"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <h3 className="text-2xl font-bold tracking-tight text-foreground font-sans">
            {value}
          </h3>

          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5",
                trend.isPositive
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-rose-500/10 text-rose-500"
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{trend.value > 0 ? `+${trend.value}%` : `${trend.value}%`}</span>
            </div>
          )}
        </div>

        {description && (
          <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
