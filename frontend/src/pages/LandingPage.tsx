import { useMutation, useQuery } from "@tanstack/react-query"
import { Activity, Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { z } from "zod"

import { HypothesisInput } from "@/components/scientist/HypothesisInput"
import { SampleHypothesisChips } from "@/components/scientist/SampleHypothesisChips"
import { Badge } from "@/components/ui/badge"
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
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-[-240px] h-[560px] bg-[radial-gradient(circle_at_top,rgba(99,221,255,0.18),transparent_68%)]" />
      <main className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col items-center justify-center gap-8 text-center">
        <div className="space-y-4 animate-fade-in-up">
          <Badge variant="primary" className="mx-auto">
            <Sparkles size={12} className="mr-1.5" />
            BenchPlan AI
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">How can I help design your next experiment?</h1>
          <p className="mx-auto max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">
            Enter a hypothesis, and BenchPlan will run literature quality checks, identify novelty signals, and draft a structured experiment plan with references, budget, and timeline.
          </p>
        </div>

        <div className="w-full max-w-3xl animate-fade-in-up [animation-delay:100ms]">
          <HypothesisInput
            onSubmit={async (hypothesis) => {
              await createProject.mutateAsync(hypothesis)
            }}
          />
          <SampleHypothesisChips className="mt-5" onSelect={(value) => createProject.mutate(value)} />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground animate-fade-in-up [animation-delay:180ms]">
          <Badge className="normal-case tracking-wide" variant="default">
            <Activity size={12} className="mr-1.5" /> API {healthQuery.data?.status ?? "checking"}
          </Badge>
          <Badge className="normal-case tracking-wide" variant="default">
            Pipeline: Input / QC / Plan / Review
          </Badge>
        </div>

        {createProject.error ? <p className="text-sm text-destructive">{(createProject.error as Error).message}</p> : null}
      </main>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-40 max-w-5xl bg-gradient-to-t from-background to-transparent" />
    </div>
  )
}
