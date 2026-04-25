import { useMutation, useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { z } from "zod"

import { HypothesisInput } from "@/components/scientist/HypothesisInput"
import { SampleHypothesisChips } from "@/components/scientist/SampleHypothesisChips"
import { apiFetch, apiFetchRaw } from "@/lib/api"
import { ProjectSchema } from "@/lib/schemas"

const HealthSchema = z.object({ status: z.string() })
const StartQcSchema = z.object({ qc_run_id: z.string(), agent_run_id: z.string() })

export function LandingPage() {
  const navigate = useNavigate()

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch("/api/health/", HealthSchema),
  })

  const createProject = useMutation({
    mutationFn: async (hypothesis: string) => {
      const project = await apiFetch(
        "/api/projects/",
        ProjectSchema,
        {
          method: "POST",
          body: JSON.stringify({
            title: "BenchPlan Run",
            hypothesis,
            domain: "other",
            currency: "USD",
            lab_type: "academic",
          }),
        }
      )

      const questionId = project.questions?.[0]?.id
      if (!questionId) {
        throw new Error("Project created without question")
      }

      const qc = StartQcSchema.parse(
        await apiFetchRaw(`/api/questions/${questionId}/literature-qc/`, {
          method: "POST",
        })
      )

      return { project, qc }
    },
    onSuccess: (result) => {
      navigate(`/runs/${result.qc.agent_run_id}?qcRunId=${result.qc.qc_run_id}&projectId=${result.project.id}`)
    },
  })

  return (
    <div className="landing">
      <div className="hero-grid">
        <section>
          <h1>From scientific question to operational experiment plan.</h1>
          <p>
            Enter a hypothesis. BenchPlan checks literature, retrieves related protocols, and drafts a lab-ready plan with materials, budget, timeline, validation, and citations.
          </p>
          <p className="muted">API status: {healthQuery.data?.status ?? "checking..."}</p>
          <SampleHypothesisChips onSelect={(value) => createProject.mutate(value)} />
        </section>
        <HypothesisInput
          onSubmit={async (hypothesis) => {
            await createProject.mutateAsync(hypothesis)
          }}
        />
      </div>
      {createProject.error ? <p className="error">{(createProject.error as Error).message}</p> : null}
      <section className="how-strip">
        <article>
          <strong>1. Input</strong>
          <p>Natural-language hypothesis and constraints</p>
        </article>
        <article>
          <strong>2. Literature QC</strong>
          <p>Novelty signal with traceable references</p>
        </article>
        <article>
          <strong>3. Plan + Review</strong>
          <p>Operational plan with scientist corrections</p>
        </article>
      </section>
    </div>
  )
}
