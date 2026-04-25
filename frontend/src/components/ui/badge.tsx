import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-accent/70 text-muted-foreground",
        primary: "border-primary/35 bg-primary/10 text-primary",
        success: "border-secondary/45 bg-secondary/15 text-secondary",
        warning: "border-amber-400/45 bg-amber-500/10 text-amber-300",
        danger: "border-destructive/45 bg-destructive/15 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
