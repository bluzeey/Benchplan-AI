import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
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
  Loader2,
  BookOpen,
  Activity,
  FileCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

// Schemas
const ProjectSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((val) => String(val)),
  title: z.string(),
  domain: z.string().nullable().optional(),
  owner_name: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  questions: z.array(z.object({ raw_text: z.string() })).optional(),
})

const PlanSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((val) => String(val)),
  title: z.string(),
  status: z.string(),
  project: z.union([z.string(), z.number()]).transform((val) => String(val)),
  scientist_review_status: z.string(),
  estimated_budget_min: z.union([z.number(), z.string()]).nullable().optional(),
  estimated_budget_max: z.union([z.number(), z.string()]).nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

const ReviewSchema = z.object({
  id: z.union([z.string(), z.number()]),
  plan: z.union([z.string(), z.number()]),
  status: z.string(),
  overall_rating: z.number().nullable().optional(),
  created_at: z.string(),
})

const ProjectsListSchema = z.array(ProjectSchema)
const PlansListSchema = z.array(PlanSchema)
const ReviewsListSchema = z.array(ReviewSchema)

// Domain icons and colors
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
  "Animal Model": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Diagnostics: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "Cell Biology": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Climate Tech": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Omics: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  animal_model: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  diagnostics: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  cell_biology: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  climate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  omics: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  microbiology: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "Gut Health": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Genetic Engineering": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
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

// Activity item type for the timeline
interface ActivityItem {
  id: string
  type: "plan_generated" | "review_completed" | "qc_completed" | "project_created"
  title: string
  description: string
  timestamp: string
  icon: typeof FileText
  color: string
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [domainFilter, setDomainFilter] = useState("All Domains")
  const [statusFilter, setStatusFilter] = useState("All Status")
  const [sortBy, setSortBy] = useState("Updated (Newest)")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 7

  // Fetch data
  const projectsQuery = useQuery({
    queryKey: ["projects-list"],
    queryFn: () => apiFetch("/api/projects/", ProjectsListSchema),
  })

  const plansQuery = useQuery({
    queryKey: ["plans-list"],
    queryFn: () => apiFetch("/api/plans/", PlansListSchema),
  })

  const reviewsQuery = useQuery({
    queryKey: ["reviews-list"],
    queryFn: () => apiFetch("/api/reviews/", ReviewsListSchema),
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

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          (p.domain && p.domain.toLowerCase().includes(query))
      )
    }

    // Domain filter
    if (domainFilter !== "All Domains") {
      result = result.filter((p) => p.domain === domainFilter)
    }

    // Sort
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

  // Calculate project-level status
  const getProjectStatus = (projectId: string) => {
    const projectPlans = plans.filter((p) => p.project === projectId)
    if (projectPlans.some((p) => p.status === "generating")) return "In Progress"
    if (projectPlans.some((p) => p.status === "draft")) return "Draft"
    if (projectPlans.some((p) => p.scientist_review_status === "required")) return "Review"
    if (projectPlans.length > 0) return "Ready"
    return "Planning"
  }

  // Generate activity timeline for selected project
  const activities: ActivityItem[] = useMemo(() => {
    if (!selectedProject) return []

    const items: ActivityItem[] = []

    // Project creation
    items.push({
      id: `created-${selectedProject.id}`,
      type: "project_created",
      title: "Project created",
      description: `${selectedProject.title} was created`,
      timestamp: selectedProject.created_at,
      icon: FolderOpen,
      color: "text-blue-400",
    })

    // Plans
    selectedProjectPlans.forEach((plan) => {
      items.push({
        id: `plan-${plan.id}`,
        type: "plan_generated",
        title: "Plan generated",
        description: plan.title,
        timestamp: plan.created_at,
        icon: FileText,
        color: "text-emerald-400",
      })
    })

    // Reviews
    selectedProjectReviews.forEach((review) => {
      if (review.status === "completed") {
        items.push({
          id: `review-${review.id}`,
          type: "review_completed",
          title: "Scientist review completed",
          description: `Rated ${review.overall_rating}/5`,
          timestamp: review.created_at,
          icon: FileCheck,
          color: "text-purple-400",
        })
      }
    })

    // Sort by timestamp (newest first)
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)
  }, [selectedProject, selectedProjectPlans, selectedProjectReviews])

  // Unique domains for filter
  const domains = useMemo(() => {
    const domainSet = new Set(projects.map((p) => p.domain).filter(Boolean))
    return ["All Domains", ...Array.from(domainSet)]
  }, [projects])

  const isLoading = projectsQuery.isLoading || plansQuery.isLoading

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6 overflow-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-cyan-400" />
              Projects
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your research projects and experiment planning workflows.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9 rounded-lg"
              />
            </div>
            <Button onClick={() => navigate("/projects/new")} className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="rounded-xl border-border/60 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                  <FolderOpen className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Projects</p>
                  <p className="text-2xl font-bold">{stats.totalProjects}</p>
                  <p className="text-xs text-muted-foreground">Across all domains</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border/60 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                  <Activity className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Projects</p>
                  <p className="text-2xl font-bold">{stats.activeProjects}</p>
                  <p className="text-xs text-muted-foreground">In progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border/60 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                  <FileCheck className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completed Plans</p>
                  <p className="text-2xl font-bold">{stats.completedPlans}</p>
                  <p className="text-xs text-muted-foreground">Ready for review</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border/60 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20">
                  <Star className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg. Plan Quality</p>
                  <p className="text-2xl font-bold">{stats.avgQuality}</p>
                  <p className="text-xs text-muted-foreground">From scientist reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            >
              {domains.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option>All Status</option>
              <option>In Progress</option>
              <option>Planning</option>
              <option>Review</option>
              <option>Draft</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option>Updated (Newest)</option>
              <option>Updated (Oldest)</option>
              <option>Name (A-Z)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                viewMode === "list"
                  ? "border-border bg-accent text-foreground"
                  : "border-border/50 text-muted-foreground hover:bg-accent/60"
              )}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                viewMode === "grid"
                  ? "border-border bg-accent text-foreground"
                  : "border-border/50 text-muted-foreground hover:bg-accent/60"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Projects Table */}
        <Card className="rounded-xl border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Plans
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                      <p className="mt-2 text-sm">Loading projects...</p>
                    </td>
                  </tr>
                ) : paginatedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      <p>No projects found</p>
                    </td>
                  </tr>
                ) : (
                  paginatedProjects.map((project) => {
                    const Icon = domainIcons[project.domain || ""] || FlaskConical
                    const status = getProjectStatus(project.id)
                    const projectPlans = plans.filter((p) => p.project === project.id)
                    const isSelected = selectedProjectId === project.id

                    return (
                      <tr
                        key={project.id}
                        onClick={() => setSelectedProjectId(project.id)}
                        className={cn(
                          "border-b border-border/40 transition-colors cursor-pointer",
                          isSelected ? "bg-accent" : "hover:bg-accent/40"
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-lg border",
                              domainColors[project.domain || ""] || "bg-gray-500/20 text-gray-400 border-gray-500/30"
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{project.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                                {project.questions?.[0]?.raw_text || "No description"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {project.domain || "Other"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              statusColors[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30"
                            )}
                          >
                            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                            {status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {formatRelativeTime(project.updated_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium">{projectPlans.length}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/projects/${project.id}`)
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredProjects.length)} of {filteredProjects.length} projects
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium",
                      currentPage === page
                        ? "bg-primary text-primary-foreground"
                        : "border border-border hover:bg-accent"
                    )}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Right Panel - Project Details */}
      <div className="w-80 shrink-0">
        {selectedProject ? (
          <Card className="sticky top-0 rounded-xl border-border/60">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl border",
                  domainColors[selectedProject.domain || ""] || "bg-gray-500/20 text-gray-400 border-gray-500/30"
                )}>
                  {(() => {
                    const Icon = domainIcons[selectedProject.domain || ""] || FlaskConical
                    return <Icon className="h-6 w-6" />
                  })()}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProjectId(null)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3">
                <h3 className="font-semibold text-foreground">{selectedProject.title}</h3>
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-2 text-xs",
                    statusColors[getProjectStatus(selectedProject.id)] || "bg-gray-500/20 text-gray-400 border-gray-500/30"
                  )}
                >
                  <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                  {getProjectStatus(selectedProject.id)}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-0">
              {/* Description */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Description
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {selectedProject.questions?.[0]?.raw_text || "No description available"}
                </p>
              </div>

              {/* Project Info */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Project Info
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5" />
                      Domain
                    </span>
                    <span className="text-foreground">{selectedProject.domain || "Other"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      Created
                    </span>
                    <span className="text-foreground">{formatDate(selectedProject.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      Owner
                    </span>
                    <span className="text-foreground">{selectedProject.owner_name || "You"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      Last Updated
                    </span>
                    <span className="text-foreground">{formatRelativeTime(selectedProject.updated_at)}</span>
                  </div>
                </div>
              </div>

              {/* Overview Stats */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Overview
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-accent/50 p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-400" />
                      <span className="text-lg font-bold">{selectedProjectPlans.length}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Plans</p>
                  </div>
                  <div className="rounded-lg bg-accent/50 p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-400" />
                      <span className="text-lg font-bold">{selectedProjectReviews.length}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Reviews</p>
                  </div>
                  <div className="rounded-lg bg-accent/50 p-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-cyan-400" />
                      <span className="text-lg font-bold">
                        {selectedProjectPlans.reduce((sum, p) => sum + (p.estimated_budget_max ? 1 : 0), 0)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">References</p>
                  </div>
                  <div className="rounded-lg bg-accent/50 p-3">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-400" />
                      <span className="text-lg font-bold">
                        {selectedProjectReviews.filter((r) => r.overall_rating).length > 0
                          ? (selectedProjectReviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) /
                             selectedProjectReviews.filter((r) => r.overall_rating).length).toFixed(1)
                          : "—"}/5
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Avg. Quality</p>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              {activities.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Recent Activity
                  </h4>
                  <div className="space-y-3">
                    {activities.map((activity, index) => (
                      <div key={activity.id} className="flex gap-3">
                        <div className="relative flex flex-col items-center">
                          <div className={cn("flex h-6 w-6 items-center justify-center rounded-full", activity.color.replace("text-", "bg-").replace("400", "500/20"))}>
                            <activity.icon className={cn("h-3 w-3", activity.color)} />
                          </div>
                          {index < activities.length - 1 && (
                            <div className="mt-1 h-full w-px bg-border" />
                          )}
                        </div>
                        <div className="flex-1 pb-3">
                          <p className="text-sm font-medium">{activity.title}</p>
                          <p className="text-xs text-muted-foreground">{activity.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* View Project Button */}
              <Button
                className="w-full gap-2"
                onClick={() => navigate(`/projects/${selectedProject.id}`)}
              >
                View Project
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="sticky top-0 rounded-xl border-border/60">
            <CardContent className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FolderOpen className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Select a project to view details</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
