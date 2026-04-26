import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
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
  Leaf,
  Snowflake,
  Sun,
  Dna,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/app/auth-provider"
import { ExperimentPlanSchema } from "@/lib/schemas"
import { z } from "zod"

const PlansListSchema = z.array(ExperimentPlanSchema)

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

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()

  const { data: recentPlans = [] } = useQuery({
    queryKey: ["plans-list"],
    queryFn: () => apiFetch("/api/plans/", PlansListSchema),
  })

  const handleLogout = async () => {
    await logout()
    // Navigation will happen automatically via PublicOnlyLayout redirect
  }

  const userInitials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase()
    : "U"

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="sidebarFlask" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
                <path
                  d="M9 3L7 9H17L15 3H9Z"
                  stroke="url(#sidebarFlask)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 9L4 16C4 18.2091 5.79086 20 8 20H16C18.2091 20 20 18.2091 20 16L18 9"
                  stroke="url(#sidebarFlask)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="font-semibold text-foreground">BenchPlan AI</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map((item) => {
          const Icon = item.icon
          // Active if exact match or if pathname starts with item.to + "/"
          // This ensures /projects matches /projects/new and /projects/:id
          const active = location.pathname === item.to ||
            (item.to !== "/" && location.pathname.startsWith(item.to + "/"))
          return (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}

        {/* Recent Plans */}
        {!collapsed && (
          <div className="mt-6">
            <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              Recent Plans
            </div>
            <div className="space-y-1">
              {recentPlans.slice(0, 5).map((plan) => {
                // Status color mapping
                const statusColors: Record<string, string> = {
                  generating: "text-blue-400",
                  completed: "text-green-400",
                  draft: "text-gray-400",
                  error: "text-red-400",
                }
                const colorClass = statusColors[plan.status] || "text-cyan-400"
                const statusLabel = plan.status === "generating" ? "In Progress" :
                                   plan.status === "completed" ? "Ready" :
                                   plan.status === "error" ? "Failed" : plan.status

                return (
                  <button
                    key={plan.id}
                    onClick={() => navigate(`/plans/${plan.id}`)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent/60"
                  >
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-md bg-muted", colorClass)}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{plan.title}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className={colorClass}>{statusLabel}</span>
                        {plan.updated_at ? ` • ${formatRelativeTime(plan.updated_at)}` : null}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Footer - User */}
      <div className="border-t border-border p-3">
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
            collapsed && "justify-center px-2"
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
            {userInitials}
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 items-center justify-between">
              <span className="truncate font-medium text-foreground">
                {user?.full_name || "User"}
              </span>
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </button>
      </div>
    </aside>
  )
}
