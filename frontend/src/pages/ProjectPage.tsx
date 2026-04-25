import { useMutation, useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiFetch, apiFetchRaw } from "@/lib/api"
import { ProjectSchema } from "@/lib/schemas"

const StartQcSchema = z.object({ qc_run_id: z.string(), agent_run_id: z.string() })

export function ProjectPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/`, ProjectSchema),
    enabled: Boolean(projectId),
  })

  const startQc = useMutation({
    mutationFn: async () => {
      const questionId = projectQuery.data?.questions?.[0]?.id
      if (!questionId) throw new Error("No question found for project")
      const payload = await apiFetchRaw(`/api/questions/${questionId}/literature-qc/`, { method: "POST" })
      return StartQcSchema.parse(payload)
    },
    onSuccess: (data) => navigate(`/runs/${data.agent_run_id}?qcRunId=${data.qc_run_id}&projectId=${projectId}`),
  })

  if (projectQuery.isLoading) return <p className="text-sm text-muted-foreground">Loading project...</p>
  if (projectQuery.error) return <p className="text-sm text-destructive">{(projectQuery.error as Error).message}</p>
  if (!projectQuery.data) return null

  const project = projectQuery.data

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight">{project.title}</h2>
        <p className="text-xs font-mono text-muted-foreground">Domain: {project.domain || "other"}</p>
      </div>
      <Card className="rounded-2xl border-border/70">
        <CardHeader>
          <CardTitle>Hypothesis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{project.questions?.[0]?.raw_text ?? "No hypothesis"}</p>
          <p className="border-t border-border/70 pt-3 text-xs font-mono">Question count: {project.questions?.length ?? 0}</p>
        </CardContent>
      </Card>
      <Button onClick={() => startQc.mutate()} disabled={startQc.isPending}>
        {startQc.isPending ? "Starting..." : "Run Literature QC"}
      </Button>
    </div>
  )
}
