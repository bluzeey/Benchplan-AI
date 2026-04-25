import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { Plus, FlaskConical, Microscope, Snowflake, Sun, Dna } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

const ProjectListItemSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((val) => String(val)),
  title: z.string(),
  domain: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  question_count: z.number().optional(),
})

const ProjectsListSchema = z.array(ProjectListItemSchema)

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
}

const domainColors: Record<string, string> = {
  "Animal Model": "text-emerald-400",
  Diagnostics: "text-cyan-400",
  "Cell Biology": "text-purple-400",
  "Climate Tech": "text-yellow-400",
  Omics: "text-orange-400",
  animal_model: "text-emerald-400",
  diagnostics: "text-cyan-400",
  cell_biology: "text-purple-400",
  climate: "text-yellow-400",
  omics: "text-orange-400",
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

export function ProjectsPage() {
  const navigate = useNavigate()

  const projectsQuery = useQuery({
    queryKey: ["projects-list"],
    queryFn: () => apiFetch("/api/projects/", ProjectsListSchema),
  })

  const projects = projectsQuery.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-semibold tracking-tight">Projects</h2>
        <Button onClick={() => navigate("/projects/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {projectsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading projects...</p>
      ) : null}

      {projectsQuery.error ? (
        <p className="text-sm text-destructive">
          {(projectsQuery.error as Error).message}
        </p>
      ) : null}

      {!projectsQuery.isLoading && !projectsQuery.error && projects.length === 0 ? (
        <Card className="rounded-2xl border-border/70">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FlaskConical className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No projects yet.</p>
            <Button
              variant="link"
              onClick={() => navigate("/projects/new")}
              className="mt-2"
            >
              Create your first project
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const Icon = domainIcons[project.domain || ""] || FlaskConical
          const colorClass = domainColors[project.domain || ""] || "text-cyan-400"
          return (
            <Card
              key={project.id}
              className="cursor-pointer rounded-2xl border-border/70 transition-colors hover:border-border"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-md bg-[hsl(217,33%,14%)]",
                      colorClass
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">{project.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {project.domain || "Other"} • {formatRelativeTime(project.updated_at)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  {project.question_count ?? 1} question(s)
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
