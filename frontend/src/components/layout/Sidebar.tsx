import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Home,
  FolderOpen,
  FileText,
  Search,
  CheckCircle,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  FlaskConical,
  Microscope,
  Snowflake,
  Sun,
  Dna,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/app/auth-provider"
import { PlansListSchema } from "@/lib/schemas"
import { StrataLogo } from "@/components/ui/strata-logo"
import { queryKeys } from "@/lib/query-keys"
import { fadeInLeft, staggerContainer, staggerItem, hoverLift } from "@/lib/motion"

const nav = [
  { label: "New Plan", to: "/dashboard", icon: Home },
  { label: "Projects", to: "/projects", icon: FolderOpen },
  { label: "Plans", to: "/plans", icon: FileText },
  { label: "Sources & Safety", to: "/settings/sources", icon: Search },
  { label: "Reviews", to: "/reviews", icon: CheckCircle },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
  { label: "Settings", to: "/settings", icon: Settings },
]

const domainIcons: Record<string, typeof FlaskConical> = {
  "Animal Model": Microscope,
  Diagnostics: FlaskConical,
  "Cell Biology": Snowflake,
  "Climate Tech": Sun,
  Omics: Dna,
}

const domainColors: Record<string, string> = {
  "Animal Model": "text-emerald-400",
  Diagnostics: "text-cyan-400",
  "Cell Biology": "text-purple-400",
  "Climate Tech": "text-yellow-400",
  Omics: "text-orange-400",
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  const diffWeeks = Math.floor(diffDays / 7)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffWeeks < 4) return `${diffWeeks}w ago`
  return date.toLocaleDateString()
}

// Animated nav item component
function NavItem({
  item,
  collapsed,
  isActive,
}: {
  item: (typeof nav)[0]
  collapsed: boolean
  isActive: boolean
}) {
  const Icon = item.icon

  return (
    <motion.div
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      className="relative"
    >
      <Link
        to={item.to}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          "relative overflow-hidden",
          isActive
            ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-foreground shadow-lg shadow-cyan-500/10"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        {/* Active indicator glow */}
        {isActive && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            layoutId="activeNavGlow"
          />
        )}

        {/* Left accent bar for active state */}
        {isActive && (
          <motion.div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-400 to-purple-500 rounded-full"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            layoutId="activeNavIndicator"
          />
        )}

        <span className={cn(
          "relative z-10 flex items-center justify-center w-5 h-5",
          isActive && "text-cyan-400"
        )}>
          <Icon className="h-[18px] w-[18px]" />
        </span>

        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.span
              className="relative z-10 whitespace-nowrap"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    </motion.div>
  )
}

// Animated recent plan item
function RecentPlanItem({
  plan,
  collapsed,
}: {
  plan: {
    id: string
    title: string
    status: string
    updated_at?: string
  }
  collapsed: boolean
}) {
  const navigate = useNavigate()
  const statusColors: Record<string, string> = {
    generating: "text-blue-400",
    completed: "text-green-400",
    draft: "text-gray-400",
    error: "text-red-400",
  }
  const colorClass = statusColors[plan.status] || "text-cyan-400"
  const statusLabel =
    plan.status === "generating"
      ? "In Progress"
      : plan.status === "completed"
      ? "Ready"
      : plan.status === "error"
      ? "Failed"
      : plan.status

  return (
    <motion.button
      onClick={() => navigate(`/plans/${plan.id}`)}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200",
        "hover:bg-accent/50 group"
      )}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg bg-muted transition-all duration-200",
          "group-hover:shadow-md group-hover:shadow-cyan-500/10",
          colorClass
        )}
        whileHover={{ scale: 1.05 }}
      >
        <FileText className="h-4 w-4" />
      </motion.div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground text-sm">{plan.title}</p>
        <p className="text-xs text-muted-foreground">
          <span className={cn("transition-colors", colorClass)}>{statusLabel}</span>
          {plan.updated_at ? (
            <>
              {" "}
              <span className="opacity-50">•</span> {formatRelativeTime(plan.updated_at)}
            </>
          ) : null}
        </p>
      </div>
    </motion.button>
  )
}

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()

  const { data: recentPlans = [] } = useQuery({
    queryKey: queryKeys.plans.list,
    queryFn: () => apiFetch("/api/plans/", PlansListSchema),
    staleTime: 30_000,
    refetchInterval: (query) => {
      // Poll when any plan is generating
      const data = query.state.data
      if (data && data.some((p) => p.status === "generating")) {
        return 3000
      }
      return false
    },
  })

  const handleLogout = async () => {
    await logout()
  }

  const userInitials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase()
    : "U"

  return (
    <motion.aside
      className={cn(
        "flex h-screen flex-col glass-strong relative z-30 sticky top-0 self-start",
        collapsed ? "w-20" : "w-72"
      )}
      initial={false}
      animate={{ width: collapsed ? 80 : 288 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Gradient background accent */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative flex h-16 items-center justify-between px-4 border-b border-border/50">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <StrataLogo markSize={30} wordmarkClassName="text-sm tracking-[0.2em]" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200",
            "hover:bg-accent hover:text-foreground",
            collapsed && "mx-auto"
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            initial={false}
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </motion.div>
        </motion.button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto custom-scrollbar">
        <motion.div
          className="space-y-1"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {nav.map((item) => {
            const active =
              location.pathname === item.to ||
              (item.to !== "/" && location.pathname.startsWith(item.to + "/"))

            return (
              <motion.div key={item.label} variants={staggerItem}>
                <NavItem item={item} collapsed={collapsed} isActive={active} />
              </motion.div>
            )
          })}
        </motion.div>

        {/* Recent Plans */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              className="mt-8"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="mb-3 px-3 flex items-center justify-between"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                  Recent Plans
                </span>
                <span className="text-[10px] text-muted-foreground/50 bg-muted px-2 py-0.5 rounded-full">
                  {recentPlans.length}
                </span>
              </motion.div>
              <motion.div
                className="space-y-1"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {recentPlans.slice(0, 5).map((plan, index) => (
                  <motion.div
                    key={plan.id}
                    variants={fadeInLeft}
                    custom={index}
                  >
                    <RecentPlanItem plan={plan} collapsed={collapsed} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Footer - User */}
      <div className="relative border-t border-border/50 p-3">
        <motion.button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
            "hover:bg-accent/50 group",
            collapsed && "justify-center px-2"
          )}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium",
              "bg-gradient-to-br from-cyan-500 to-purple-500 text-white shadow-lg",
              "group-hover:shadow-cyan-500/30 transition-shadow duration-200"
            )}
            whileHover={{ scale: 1.05 }}
          >
            {userInitials}
          </motion.div>
          
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                className="flex min-w-0 flex-1 items-center justify-between"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-medium text-foreground text-sm">
                    {user?.full_name || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {user?.email || ""}
                  </span>
                </div>
                <motion.div
                  whileHover={{ x: 2 }}
                  className="text-muted-foreground/50"
                >
                  <LogOut className="h-4 w-4" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.aside>
  )
}
