import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  FlaskConical,
  Microscope,
  Snowflake,
  Sun,
  Dna,
  Search,
  Filter,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  FolderOpen,
  FileText,
  CheckCircle,
  Star,
  Clock,
  Calendar,
  User,
  ArrowRight,
  BookOpen,
  Activity,
  FileCheck,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import { Tooltip, HelpTooltip } from "@/components/ui/tooltip"
import { 
  TableSkeleton, 
  StatsCardSkeleton, 
  ProjectDetailSkeleton,
  PageHeaderSkeleton 
} from "@/components/ui/skeleton"
import { 
  ProjectsListSchema,
  PlansListSchema,
  ReviewsListSchema,
  type PlanListItem,
} from "@/lib/schemas"
import { queryKeys } from "@/lib/query-keys"
import { 
  fadeInUp, 
  staggerContainer, 
  staggerItem,
  tableRow,
  tableStagger,
  scaleIn
} from "@/lib/motion"

// Project page specific schemas (using shared where possible)
const ProjectWithQuestionsSchema = z.object({
  id: z.string(),
  title: z.string(),
  domain: z.string().nullable().optional(),
  owner_name: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  questions: z.array(z.object({ raw_text: z.string() })).optional(),
})

const ProjectsWithQuestionsListSchema = z.array(ProjectWithQuestionsSchema)

// Page-level review schema (simpler than the full ReviewListItem)
const PageReviewSchema = z.object({
  id: z.string(),
  plan: z.string(),
  status: z.string(),
  overall_rating: z.number().nullable().optional(),
  created_at: z.string(),
})

const PageReviewsListSchema = z.array(PageReviewSchema)

// Domain icons and colors with neon glow support
const domainIcons: Record<string, typeof FlaskConical> = {
  "Animal Model": Microscope,
  Diagnostics: FlaskConical,
  "Cell Biology": Snowflake,
  "Climate Tech": Sun,
  Omics: Dna,
  animal_model: Microscope,
  diagnostics: FlaskConical,
  cell_biology: Snowflake,
  climate: Sun,
  omics: Dna,
  microbiology: FlaskConical,
  "Gut Health": FlaskConical,
  "Genetic Engineering": Dna,
}

const domainColors: Record<string, string> = {
  "Animal Model": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:shadow-emerald-500/20",
  Diagnostics: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:shadow-cyan-500/20",
  "Cell Biology": "bg-purple-500/20 text-purple-400 border-purple-500/30 hover:shadow-purple-500/20",
  "Climate Tech": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:shadow-yellow-500/20",
  Omics: "bg-orange-500/20 text-orange-400 border-orange-500/30 hover:shadow-orange-500/20",
  animal_model: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:shadow-emerald-500/20",
  diagnostics: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:shadow-cyan-500/20",
  cell_biology: "bg-purple-500/20 text-purple-400 border-purple-500/30 hover:shadow-purple-500/20",
  climate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:shadow-yellow-500/20",
  omics: "bg-orange-500/20 text-orange-400 border-orange-500/30 hover:shadow-orange-500/20",
  microbiology: "bg-pink-500/20 text-pink-400 border-pink-500/30 hover:shadow-pink-500/20",
  "Gut Health": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:shadow-emerald-500/20",
  "Genetic Engineering": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:shadow-indigo-500/20",
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  generating: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
  "In Progress": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Planning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Review: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Ready: "bg-green-500/20 text-green-400 border-green-500/30",
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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// Animated stat card
function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  gradient,
  delay = 0,
}: {
  icon: typeof FolderOpen
  label: string
  value: string | number
  sublabel: string
  gradient: string
  delay?: number
}) {
  return (
    <motion.div
      variants={fadeInUp}
      transition={{ delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "rounded-xl border border-border/60 bg-gradient-to-br p-4 transition-all duration-300",
        "hover:shadow-lg hover:border-border/80",
        gradient
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          "bg-white/10 backdrop-blur-sm"
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-white/70 font-medium uppercase tracking-wider">{label}</p>
          <motion.p
            className="text-2xl font-display font-bold text-white"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.1, type: "spring", stiffness: 200 }}
          >
            {value}
          </motion.p>
          <p className="text-xs text-white/60">{sublabel}</p>
        </div>
      </div>
    </motion.div>
  )
}

// Animated table row with neon hover
function TableRow({
  project,
  plans,
  isSelected,
  onSelect,
}: {
  project: {
    id: string
    title: string
    domain?: string | null
    owner_name?: string
    created_at: string
    updated_at: string
    questions?: { raw_text: string }[]
  }
  plans: {
    id: string
    title: string
    status: string
    project: string | number
    scientist_review_status: string
    created_at: string
    updated_at: string
  }[]
  isSelected: boolean
  onSelect: () => void
}) {
  const navigate = useNavigate()
  const Icon = domainIcons[project.domain || ""] || FlaskConical
  const projectIdStr = String(project.id)
  const projectPlans = plans.filter((p) => p.project === projectIdStr)
  const status = projectPlans.some((p) => p.status === "generating")
    ? "In Progress"
    : projectPlans.some((p) => p.status === "draft")
    ? "Draft"
    : projectPlans.some((p) => p.scientist_review_status === "required")
    ? "Review"
    : projectPlans.length > 0
    ? "Ready"
    : "Planning"

  return (
    <motion.tr
      onClick={onSelect}
      className={cn(
        "relative cursor-pointer transition-all duration-300 group",
        isSelected
          ? "bg-gradient-to-r from-cyan-500/10 to-purple-500/10"
          : "hover:bg-accent/40"
      )}
      variants={tableRow}
      whileHover={{ scale: 1.002 }}
    >
      {/* Neon border effect on hover */}
      <div className={cn(
        "absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none",
        "group-hover:opacity-100"
      )}>
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-emerald-500/20 blur-sm" />
        <div className="absolute inset-[1px] rounded-lg bg-card" />
      </div>

      <td className="relative px-4 py-3">
        <div className="flex items-center gap-3">
          <motion.div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300",
              "group-hover:shadow-lg group-hover:scale-105",
              domainColors[project.domain || ""] || "bg-gray-500/20 text-gray-400 border-gray-500/30"
            )}
            whileHover={{ rotate: 5 }}
          >
            <Icon className="h-5 w-5" />
          </motion.div>
          <div>
            <p className="font-medium text-foreground">{project.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
              {project.questions?.[0]?.raw_text || "No description"}
            </p>
          </div>
        </div>
      </td>
      <td className="relative px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {project.domain || "Other"}
        </span>
      </td>
      <td className="relative px-4 py-3">
        <Badge
          variant="outline"
          className={cn(
            "text-xs transition-all duration-300",
            statusColors[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30",
            "group-hover:shadow-sm"
          )}
        >
          <motion.span
            className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          {status}
        </Badge>
      </td>
      <td className="relative px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {formatRelativeTime(project.updated_at)}
        </span>
      </td>
      <td className="relative px-4 py-3">
        <span className="text-sm font-medium">{projectPlans.length}</span>
      </td>
      <td className="relative px-4 py-3">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/projects/${project.id}`)
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </td>
    </motion.tr>
  )
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [domainFilter, setDomainFilter] = useState("All Domains")
  const [sortBy, setSortBy] = useState("Updated (Newest)")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 7

  // Fetch data using shared cache keys
  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list,
    queryFn: () => apiFetch("/api/projects/", ProjectsWithQuestionsListSchema),
    staleTime: 30_000,
  })

  const plansQuery = useQuery({
    queryKey: queryKeys.plans.list,
    queryFn: () => apiFetch("/api/plans/", PlansListSchema),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const data = query.state.data
      if (data && data.some((p) => p.status === "generating")) {
        return 3000
      }
      return false
    },
  })

  const reviewsQuery = useQuery({
    queryKey: queryKeys.reviews.list,
    queryFn: () => apiFetch("/api/reviews/", PageReviewsListSchema),
    staleTime: 30_000,
  })

  const projects = projectsQuery.data ?? []
  const plans = plansQuery.data ?? []
  const reviews = reviewsQuery.data ?? []

  // Calculate stats
  const stats = useMemo(() => {
    const totalProjects = projects.length
    const activeProjects = projects.filter((p) => {
      const projectPlans = plans.filter((plan) => plan.project === p.id)
      return projectPlans.some((plan) => plan.status === "generating" || plan.status === "draft")
    }).length
    const completedPlans = plans.filter((p) => p.status === "completed").length
    const completedReviews = reviews.filter((r) => r.status === "completed" && r.overall_rating != null)
    const avgQuality = completedReviews.length > 0
      ? (completedReviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / completedReviews.length).toFixed(1)
      : "—"

    return { totalProjects, activeProjects, completedPlans, avgQuality }
  }, [projects, plans, reviews])

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = [...projects]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          (p.domain && p.domain.toLowerCase().includes(query))
      )
    }

    if (domainFilter !== "All Domains") {
      result = result.filter((p) => p.domain === domainFilter)
    }

    result.sort((a, b) => {
      if (sortBy === "Updated (Newest)") {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }
      if (sortBy === "Updated (Oldest)") {
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      }
      if (sortBy === "Name (A-Z)") {
        return a.title.localeCompare(b.title)
      }
      return 0
    })

    return result
  }, [projects, searchQuery, domainFilter, sortBy])

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage)
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Selected project details
  const selectedProject = projects.find((p) => p.id === selectedProjectId)
  const selectedProjectPlans = plans.filter((p) => p.project === selectedProjectId)
  const selectedProjectReviews = reviews.filter((r) =>
    selectedProjectPlans.some((p) => p.id === String(r.plan))
  )

  // Activity timeline
  const activities = useMemo(() => {
    if (!selectedProject) return []

    const items = []

    items.push({
      id: `created-${selectedProject.id}`,
      type: "project_created" as const,
      title: "Project created",
      description: `${selectedProject.title} was created`,
      timestamp: selectedProject.created_at,
      icon: FolderOpen,
      color: "text-blue-400",
    })

    selectedProjectPlans.forEach((plan) => {
      items.push({
        id: `plan-${plan.id}`,
        type: "plan_generated" as const,
        title: "Plan generated",
        description: plan.title,
        timestamp: plan.created_at,
        icon: FileText,
        color: "text-emerald-400",
      })
    })

    selectedProjectReviews.forEach((review) => {
      if (review.status === "completed") {
        items.push({
          id: `review-${review.id}`,
          type: "review_completed" as const,
          title: "Scientist review completed",
          description: `Rated ${review.overall_rating}/5`,
          timestamp: review.created_at,
          icon: FileCheck,
          color: "text-purple-400",
        })
      }
    })

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)
  }, [selectedProject, selectedProjectPlans, selectedProjectReviews])

  const domains = useMemo(() => {
    const domainSet = new Set(projects.map((p) => p.domain).filter((d): d is string => Boolean(d)))
    return ["All Domains", ...Array.from(domainSet)]
  }, [projects])

  const isLoading = projectsQuery.isLoading || plansQuery.isLoading

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] gap-6">
        <div className="flex-1 min-w-0 space-y-6 overflow-auto">
          <PageHeaderSkeleton />
          <StatsCardSkeleton count={4} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-32 bg-muted rounded-lg shimmer" />
              <div className="h-9 w-32 bg-muted rounded-lg shimmer" />
              <div className="h-9 w-32 bg-muted rounded-lg shimmer" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 bg-muted rounded-lg shimmer" />
              <div className="h-9 w-9 bg-muted rounded-lg shimmer" />
            </div>
          </div>
          <TableSkeleton rows={7} columns={6} />
        </div>
        <div className="w-80 shrink-0">
          <ProjectDetailSkeleton />
        </div>
      </div>
    )
  }

  // Show empty state if no projects
  if (!isLoading && projects.length === 0) {
    return (
      <motion.div
        className="flex h-[calc(100vh-8rem)] items-center justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-full max-w-2xl">
          <EmptyState
            type="folder"
            title="No projects yet"
            description="Start your research journey by creating your first project. Define a hypothesis and let AI help you plan your experiments."
            actionLabel="Create First Project"
            actionIcon={<Sparkles className="h-4 w-4" />}
            onAction={() => navigate("/projects/new")}
          />
        </div>
      </motion.div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6 overflow-auto custom-scrollbar">
        {/* Header */}
        <motion.div
          className="flex items-start justify-between"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeInUp}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                <FolderOpen className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-semibold tracking-tight text-foreground">
                  Projects
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Manage your research projects and experiment planning workflows.
                </p>
              </div>
            </div>
          </motion.div>
          <motion.div
            className="flex items-center gap-3"
            variants={fadeInUp}
          >
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-cyan-400" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-10 rounded-xl border-border/60 bg-card/50 focus:border-cyan-500/50 focus:ring-cyan-500/20 transition-all"
              />
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => navigate("/projects/new")}
                className="gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-4 gap-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <StatCard
            icon={FolderOpen}
            label="Total Projects"
            value={stats.totalProjects}
            sublabel="Across all domains"
            gradient="from-blue-500/80 to-blue-600/80"
            delay={0}
          />
          <StatCard
            icon={Activity}
            label="Active Projects"
            value={stats.activeProjects}
            sublabel="In progress"
            gradient="from-emerald-500/80 to-emerald-600/80"
            delay={0.05}
          />
          <StatCard
            icon={FileCheck}
            label="Completed Plans"
            value={stats.completedPlans}
            sublabel="Ready for review"
            gradient="from-purple-500/80 to-purple-600/80"
            delay={0.1}
          />
          <StatCard
            icon={Star}
            label="Avg. Plan Quality"
            value={stats.avgQuality}
            sublabel="From scientist reviews"
            gradient="from-amber-500/80 to-orange-500/80"
            delay={0.15}
          />
        </motion.div>

        {/* Filters & Toolbar */}
        <motion.div
          className="flex items-center justify-between"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2">
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="h-9 rounded-xl border border-border/60 bg-card/50 px-3 text-sm transition-all hover:border-cyan-500/30 focus:border-cyan-500/50"
            >
              {domains.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-9 rounded-xl border border-border/60 bg-card/50 px-3 text-sm transition-all hover:border-cyan-500/30 focus:border-cyan-500/50"
            >
              <option>Updated (Newest)</option>
              <option>Updated (Oldest)</option>
              <option>Name (A-Z)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setViewMode("list")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200",
                viewMode === "list"
                  ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400 shadow-lg shadow-cyan-500/10"
                  : "border-border/50 text-muted-foreground hover:bg-accent/60 hover:border-border"
              )}
            >
              <List className="h-4 w-4" />
            </motion.button>
            <motion.button
              onClick={() => setViewMode("grid")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200",
                viewMode === "grid"
                  ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400 shadow-lg shadow-cyan-500/10"
                  : "border-border/50 text-muted-foreground hover:bg-accent/60 hover:border-border"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </motion.button>
          </div>
        </motion.div>

        {/* Projects Table with Neon Hover Effect */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
        >
          <Card className="rounded-2xl border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0">
                      <div className="flex items-center gap-1">
                        Project
                        <HelpTooltip content="Click a project to view details" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Domain
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Plans
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={tableStagger}
                  initial="hidden"
                  animate="visible"
                >
                  {paginatedProjects.map((project) => (
                    <TableRow
                      key={project.id}
                      project={project}
                      plans={plans}
                      isSelected={selectedProjectId === String(project.id)}
                      onSelect={() => setSelectedProjectId(String(project.id))}
                    />
                  ))}
                </motion.tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredProjects.length)} of{" "}
                  {filteredProjects.length} projects
                </p>
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/60 disabled:opacity-50 transition-all hover:border-cyan-500/30 hover:bg-cyan-500/10"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </motion.button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
                    <motion.button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-xl text-sm font-medium transition-all",
                        currentPage === page
                          ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/20"
                          : "border border-border/60 hover:border-cyan-500/30 hover:bg-cyan-500/10"
                      )}
                    >
                      {page}
                    </motion.button>
                  ))}
                  <motion.button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/60 disabled:opacity-50 transition-all hover:border-cyan-500/30 hover:bg-cyan-500/10"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Right Panel - Project Details */}
      <motion.div
        className="w-80 shrink-0"
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.4 }}
      >
        <AnimatePresence mode="wait">
          {selectedProject ? (
            <motion.div
              key={selectedProject.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <Card className="sticky top-0 rounded-2xl border-border/60 bg-card/50 backdrop-blur-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <motion.div
                      className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-300",
                        "shadow-lg",
                        domainColors[selectedProject.domain || ""] || "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      )}
                      whileHover={{ scale: 1.05, rotate: 5 }}
                    >
                      {(() => {
                        const Icon = domainIcons[selectedProject.domain || ""] || FlaskConical
                        return <Icon className="h-7 w-7" />
                      })()}
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedProjectId(null)}
                        className="rounded-full"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </div>
                  <div className="mt-4">
                    <h3 className="font-display font-semibold text-lg text-foreground">
                      {selectedProject.title}
                    </h3>
                    <Badge
                      variant="outline"
                      className={cn(
                        "mt-2 text-xs",
                        statusColors[selectedProjectPlans.some((p) => p.status === "generating")
                          ? "In Progress"
                          : selectedProjectPlans.some((p) => p.status === "draft")
                          ? "Draft"
                          : selectedProjectPlans.some((p) => p.scientist_review_status === "required")
                          ? "Review"
                          : selectedProjectPlans.length > 0
                          ? "Ready"
                          : "Planning"] || "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      )}
                    >
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                      {selectedProjectPlans.some((p) => p.status === "generating")
                        ? "In Progress"
                        : selectedProjectPlans.some((p) => p.status === "draft")
                        ? "Draft"
                        : selectedProjectPlans.some((p) => p.scientist_review_status === "required")
                        ? "Review"
                        : selectedProjectPlans.length > 0
                        ? "Ready"
                        : "Planning"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-0">
                  {/* Description */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      Description
                      <HelpTooltip content="Project description from initial hypothesis" />
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-4">
                      {selectedProject.questions?.[0]?.raw_text || "No description available"}
                    </p>
                  </motion.div>

                  {/* Project Info */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                      Project Info
                      <HelpTooltip content="Key project metadata" />
                    </h4>
                    <div className="space-y-2">
                      {[
                        { icon: BookOpen, label: "Domain", value: selectedProject.domain || "Other" },
                        { icon: Calendar, label: "Created", value: formatDate(selectedProject.created_at) },
                        { icon: User, label: "Owner", value: selectedProject.owner_name || "You" },
                        { icon: Clock, label: "Last Updated", value: formatRelativeTime(selectedProject.updated_at) },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm group">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <item.icon className="h-3.5 w-3.5" />
                            {item.label}
                          </span>
                          <span className="text-foreground font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Overview Stats */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                      Overview
                      <HelpTooltip content="Quick statistics for this project" />
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: FileText, value: selectedProjectPlans.length, label: "Plans", color: "emerald" },
                        { icon: CheckCircle, value: selectedProjectReviews.length, label: "Reviews", color: "blue" },
                        { icon: BookOpen, value: selectedProjectPlans.reduce((sum, p) => sum + (p.estimated_budget_max ? 1 : 0), 0), label: "References", color: "cyan" },
                        { icon: Star, value: selectedProjectReviews.filter((r) => r.overall_rating).length > 0
                          ? (selectedProjectReviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) /
                             selectedProjectReviews.filter((r) => r.overall_rating).length).toFixed(1) + "/5"
                          : "—", label: "Avg. Quality", color: "amber" },
                      ].map((stat, i) => (
                        <motion.div
                          key={i}
                          className={cn(
                            "rounded-xl p-3 transition-all duration-200",
                            "bg-gradient-to-br",
                            stat.color === "emerald" && "from-emerald-500/10 to-emerald-600/5 hover:from-emerald-500/20",
                            stat.color === "blue" && "from-blue-500/10 to-blue-600/5 hover:from-blue-500/20",
                            stat.color === "cyan" && "from-cyan-500/10 to-cyan-600/5 hover:from-cyan-500/20",
                            stat.color === "amber" && "from-amber-500/10 to-amber-600/5 hover:from-amber-500/20",
                          )}
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="flex items-center gap-2">
                            <stat.icon className={cn(
                              "h-4 w-4",
                              stat.color === "emerald" && "text-emerald-400",
                              stat.color === "blue" && "text-blue-400",
                              stat.color === "cyan" && "text-cyan-400",
                              stat.color === "amber" && "text-amber-400",
                            )} />
                            <span className="text-lg font-display font-bold text-foreground">{stat.value}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Recent Activity */}
                  {activities.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                    >
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                        Recent Activity
                        <HelpTooltip content="Latest actions on this project" />
                      </h4>
                      <div className="space-y-3">
                        {activities.map((activity, index) => (
                          <motion.div
                            key={activity.id}
                            className="flex gap-3"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + index * 0.05 }}
                          >
                            <div className="relative flex flex-col items-center">
                              <div className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-full",
                                "bg-gradient-to-br",
                                activity.color.replace("text-", "from-").replace("400", "500/20") + " to-" + activity.color.replace("text-", "").replace("400", "600/10")
                              )}>
                                <activity.icon className={cn("h-3.5 w-3.5", activity.color)} />
                              </div>
                              {index < activities.length - 1 && (
                                <div className="mt-1 h-full w-px bg-gradient-to-b from-border to-transparent" />
                              )}
                            </div>
                            <div className="flex-1 pb-3">
                              <p className="text-sm font-medium text-foreground">{activity.title}</p>
                              <p className="text-xs text-muted-foreground">{activity.description}</p>
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                {formatRelativeTime(activity.timestamp)}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* View Project Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90"
                        onClick={() => navigate(`/projects/${selectedProject.id}`)}
                      >
                        View Project
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="sticky top-0 rounded-2xl border-border/60 bg-card/50 backdrop-blur-sm">
                <CardContent className="py-12 text-center">
                  <motion.div
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20"
                    animate={{ 
                      scale: [1, 1.05, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    <FolderOpen className="h-8 w-8 text-cyan-400" />
                  </motion.div>
                  <p className="text-sm text-muted-foreground">
                    Select a project to view details
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Click on any project in the table
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
