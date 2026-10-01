import React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, PackageX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { LowStockItem } from "@/src/lib/types/api";

interface LowStockAlertsWidgetProps {
  items: LowStockItem[];
  threshold: number;
}

export function LowStockAlertsWidget({ items, threshold }: LowStockAlertsWidgetProps) {
  return (
    <Card className="col-span-full lg:col-span-4 border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-500">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Low stock</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sizes with {threshold} or fewer left, emptiest first
            </p>
          </div>
        </div>
        <Badge variant="destructive" className="font-bold">
          {items.length}
        </Badge>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground space-y-2">
            <PackageX className="h-8 w-8 opacity-40 text-emerald-500" />
            <p className="text-sm font-medium">Nothing is running low.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div
                key={`${item.productId}-${item.variantId}-${idx}`}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-card/60 backdrop-blur-xs hover:border-amber-500/40 transition-all"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {item.productName}
                  </p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    {item.size && <span>Size: {item.size}</span>}
                    {item.size && item.color && <span>•</span>}
                    {item.color && <span>Color: {item.color}</span>}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={item.stock === 0 ? "destructive" : "warning"}
                    className="font-bold text-xs"
                  >
                    {item.stock} left
                  </Badge>
                  <Link
                    href={`/products/${item.productId}`}
                    className="p-1 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-accent transition-colors"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
