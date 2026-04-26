import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

// Base shimmer animation for skeleton
const shimmerAnimation = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear" as const
    }
  }
}

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full"
}

export function Skeleton({ 
  className, 
  width, 
  height, 
  rounded = "md" 
}: SkeletonProps) {
  const roundedClass = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    full: "rounded-full"
  }

  return (
    <motion.div
      className={cn(
        "bg-muted shimmer",
        roundedClass[rounded],
        className
      )}
      style={{ 
        width: width ? (typeof width === "number" ? `${width}px` : width) : "100%",
        height: height ? (typeof height === "number" ? `${height}px` : height) : "1rem"
      }}
      {...shimmerAnimation}
    />
  )
}

// Card skeleton
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card/50 p-4 space-y-4", className)}>
      <div className="flex items-center gap-4">
        <Skeleton width={48} height={48} rounded="lg" />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={20} rounded="sm" />
          <Skeleton width="40%" height={14} rounded="sm" />
        </div>
      </div>
      <Skeleton width="100%" height={60} rounded="md" />
      <div className="flex gap-2">
        <Skeleton width={80} height={24} rounded="full" />
        <Skeleton width={80} height={24} rounded="full" />
      </div>
    </div>
  )
}

// Table row skeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b border-border/40">
      <div className="flex items-center gap-3 flex-1">
        <Skeleton width={40} height={40} rounded="lg" />
        <div className="flex-1 space-y-2">
          <Skeleton width="70%" height={16} rounded="sm" />
          <Skeleton width="50%" height={12} rounded="sm" />
        </div>
      </div>
      {Array.from({ length: columns - 1 }).map((_, i) => (
        <Skeleton 
          key={i} 
          width={i === columns - 2 ? 40 : 80} 
          height={i === columns - 2 ? 32 : 16} 
          rounded={i === columns - 2 ? "md" : "sm"}
          className={i === columns - 2 ? "" : "flex-1 max-w-[120px]"}
        />
      ))}
    </div>
  )
}

// Table skeleton with multiple rows
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 py-3 px-4 border-b border-border/60 bg-muted/30">
        <Skeleton width={40} height={16} rounded="sm" className="flex-1" />
        {Array.from({ length: columns - 1 }).map((_, i) => (
          <Skeleton 
            key={i} 
            width={80} 
            height={16} 
            rounded="sm" 
            className="flex-1 max-w-[120px]"
          />
        ))}
      </div>
      {/* Rows */}
      <div>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton key={i} columns={columns} />
        ))}
      </div>
    </div>
  )
}

// Stats card skeleton
export function StatsCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/60 bg-card/50 p-4">
          <div className="flex items-center gap-3">
            <Skeleton width={40} height={40} rounded="lg" />
            <div className="flex-1 space-y-2">
              <Skeleton width="100%" height={12} rounded="sm" />
              <Skeleton width="50%" height={28} rounded="sm" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Plan card skeleton for PlansPage
export function PlanCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/50 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton width="80%" height={20} rounded="sm" />
          <Skeleton width="50%" height={14} rounded="sm" />
        </div>
        <Skeleton width={60} height={24} rounded="full" />
      </div>
      <Skeleton width="100%" height={40} rounded="md" />
      <div className="flex items-center gap-4">
        <Skeleton width={100} height={16} rounded="sm" />
        <Skeleton width={80} height={16} rounded="sm" />
      </div>
    </div>
  )
}

// Plans grid skeleton
export function PlansGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <PlanCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Project detail panel skeleton
export function ProjectDetailSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-6">
      <div className="flex items-start justify-between">
        <Skeleton width={64} height={64} rounded="xl" />
        <Skeleton width={40} height={40} rounded="md" />
      </div>
      <div className="space-y-2">
        <Skeleton width="90%" height={24} rounded="sm" />
        <Skeleton width={80} height={28} rounded="full" />
      </div>
      <div className="space-y-3">
        <Skeleton width="30%" height={12} rounded="sm" />
        <Skeleton width="100%" height={60} rounded="md" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton width={16} height={16} rounded="sm" />
              <Skeleton width={30} height={20} rounded="sm" />
            </div>
            <Skeleton width="60%" height={12} rounded="sm" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Dashboard input skeleton
export function DashboardInputSkeleton() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="rounded-2xl border border-border/70 bg-card/50 p-6 space-y-4">
        <Skeleton width="100%" height={120} rounded="lg" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton width={24} height={24} rounded="md" />
            <Skeleton width={120} height={16} rounded="sm" />
          </div>
          <Skeleton width={100} height={40} rounded="full" />
        </div>
      </div>
      <div className="flex justify-center gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={200} height={80} rounded="xl" />
        ))}
      </div>
    </div>
  )
}

// Page header skeleton
export function PageHeaderSkeleton({ showSearch = true }: { showSearch?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton width={32} height={32} rounded="md" />
          <Skeleton width={150} height={32} rounded="sm" />
        </div>
        <Skeleton width={300} height={16} rounded="sm" />
      </div>
      {showSearch && (
        <div className="flex items-center gap-3">
          <Skeleton width={200} height={40} rounded="lg" />
          <Skeleton width={120} height={40} rounded="full" />
        </div>
      )}
    </div>
  )
}

// Activity timeline skeleton
export function ActivityTimelineSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <Skeleton width={24} height={24} rounded="full" />
            {i < count - 1 && <Skeleton width={2} height={40} rounded="full" className="mt-1" />}
          </div>
          <div className="flex-1 space-y-2 pb-3">
            <Skeleton width="60%" height={16} rounded="sm" />
            <Skeleton width="40%" height={12} rounded="sm" />
            <Skeleton width={80} height={12} rounded="sm" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Plan page skeleton - 2 column layout with fixed sidebar and scrollable content
export function PlanPageSkeleton() {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:h-[calc(100vh-4rem)] lg:min-h-0">
      {/* Left sidebar skeleton */}
      <div className="hidden lg:block h-[calc(100vh-4rem)]">
        <div className="h-full rounded-2xl border border-border/60 bg-card/50 p-4 space-y-4">
          <div className="space-y-2">
            <Skeleton width={100} height={20} rounded="sm" />
            <Skeleton width={140} height={14} rounded="sm" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={36} rounded="xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Right content skeleton */}
      <div className="flex flex-col lg:min-h-0 space-y-4">
        {/* Header area */}
        <div className="space-y-4 shrink-0">
          <Skeleton width="60%" height={36} rounded="sm" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-2">
                <Skeleton width={80} height={12} rounded="sm" />
                <Skeleton width="70%" height={20} rounded="sm" />
                <Skeleton width={60} height={12} rounded="sm" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/50 p-4 space-y-3">
            <Skeleton width={140} height={24} rounded="sm" />
            <Skeleton width="100%" height={60} rounded="md" />
            <div className="flex gap-2 pt-2 border-t border-border/40">
              <Skeleton width={120} height={16} rounded="sm" />
              <Skeleton width={100} height={16} rounded="sm" />
            </div>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 lg:min-h-0 space-y-4 pb-4">
          {/* Protocol card */}
          <div className="rounded-2xl border border-border/60 bg-card/50 p-4 space-y-3">
            <Skeleton width={80} height={24} rounded="sm" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-background/60 p-4 space-y-2">
                <Skeleton width="40%" height={18} rounded="sm" />
                <Skeleton width="100%" height={40} rounded="md" />
                <div className="flex gap-4">
                  <Skeleton width={80} height={14} rounded="sm" />
                  <Skeleton width={100} height={14} rounded="sm" />
                </div>
              </div>
            ))}
          </div>

          {/* Generated sections card */}
          <div className="rounded-2xl border border-border/60 bg-card/50 p-4 space-y-4">
            <Skeleton width={140} height={24} rounded="sm" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-background/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton width="30%" height={18} rounded="sm" />
                  <Skeleton width={80} height={20} rounded="full" />
                </div>
                <Skeleton width="100%" height={80} rounded="md" />
                <div className="flex gap-2 pt-2 border-t border-border/40">
                  <Skeleton width={60} height={12} rounded="sm" />
                  <Skeleton width={100} height={12} rounded="sm" />
                </div>
              </div>
            ))}
          </div>

          {/* Materials, Budget, Timeline placeholder cards */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card/50 p-4 space-y-3">
              <Skeleton width={100} height={24} rounded="sm" />
              <Skeleton width="100%" height={120} rounded="md" />
            </div>
          ))}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} width={140} height={36} rounded="full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
