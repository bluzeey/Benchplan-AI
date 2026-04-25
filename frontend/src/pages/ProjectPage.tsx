import { useMutation, useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { z } from "zod"

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

  if (projectQuery.isLoading) return <p>Loading project...</p>
  if (projectQuery.error) return <p className="error">{(projectQuery.error as Error).message}</p>
  if (!projectQuery.data) return null

  const project = projectQuery.data

  return (
    <div className="stack">
      <h2>{project.title}</h2>
      <p className="muted">Domain: {project.domain || "other"}</p>
      <section className="card">
        <h3>Hypothesis</h3>
        <p>{project.questions?.[0]?.raw_text ?? "No hypothesis"}</p>
      </section>
      <button onClick={() => startQc.mutate()} disabled={startQc.isPending}>
        {startQc.isPending ? "Starting..." : "Run Literature QC"}
      </button>
    </div>
  )
}
