import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { z } from "zod"

import { HypothesisInput, type Attachment } from "@/components/scientist/HypothesisInput"
import { SampleHypothesisCards } from "@/components/scientist/SampleHypothesisCards"
import { apiFetch, apiFetchRaw } from "@/lib/api"
import { ProjectSchema } from "@/lib/schemas"
import { FlaskConical } from "lucide-react"
import { Link } from "react-router-dom"

const StartQcSchema = z.object({
  qc_run_id: z.string(),
  agent_run_id: z.string(),
})

const samples = [
  {
    title: "Paper-based CRP electrochemical biosensor",
    hypothesis:
      "Paper-based CRP electrochemical biosensor will improve sensitivity by at least 25% compared to colorimetric strips in diluted whole blood.",
    icon: "teal" as const,
  },
  {
    title: "LGG reduces intestinal permeability in mice",
    hypothesis:
      "Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls measured by FITC-dextran.",
    icon: "green" as const,
  },
  {
    title: "Trehalose cryoprotection for HeLa cells",
    hypothesis:
      "Trehalose cryoprotectant optimization will increase post-thaw HeLa viability by at least 20% versus DMSO-only control.",
    icon: "purple" as const,
  },
  {
    title: "Sporomusa ovata CO₂ to acetate bioelectrochemical system",
    hypothesis:
      "Sporomusa ovata in a bioelectrochemical reactor will increase acetate production rate from CO2 by at least 15% under controlled cathode potential.",
    icon: "yellow" as const,
  },
]

export function LandingPage() {
  const navigate = useNavigate()
  const [draftHypothesis, setDraftHypothesis] = useState("")

  const createProject = useMutation({
    mutationFn: async ({ hypothesis, attachments }: { hypothesis: string; attachments: Attachment[] }) => {
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
            attachments: attachments.map((a) => ({
              name: a.name,
              url: a.url,
              type: a.type,
              size: a.size,
              object_key: a.objectKey,
            })),
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
      navigate(
        `/runs/${result.qc.agent_run_id}?qcRunId=${result.qc.qc_run_id}&projectId=${result.project.id}`
      )
    },
  })

  const handleSampleSelect = (hypothesis: string) => {
    setDraftHypothesis(hypothesis)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-border px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500">
            <FlaskConical className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-foreground">BenchPlan AI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Main content - simple chat bar only */}
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mb-8 flex flex-col items-center">
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
            How can I help design your next experiment?
          </h1>
          <p className="mt-3 max-w-2xl text-center text-muted-foreground">
            Enter a hypothesis, and BenchPlan will run literature quality checks, 
            identify novelty signals, and draft a structured experiment plan with references, budget, and timeline.
          </p>
        </div>

        <div className="w-full max-w-3xl">
          <HypothesisInput
            value={draftHypothesis}
            onChange={setDraftHypothesis}
            onSubmit={async (hypothesis, attachments) => {
              await createProject.mutateAsync({ hypothesis, attachments })
            }}
            isSubmitting={createProject.isPending}
          />
        </div>

        {/* Error message */}
        {createProject.error && (
          <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {createProject.error instanceof Error
              ? createProject.error.message
              : "Failed to create project"}
          </div>
        )}

        {/* Sample hypotheses */}
        <div className="mt-8 w-full max-w-5xl">
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Try a sample hypothesis
          </p>
          <SampleHypothesisCards
            samples={samples}
            onSelect={handleSampleSelect}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-8 py-4">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
          <span>API Online</span>
          <span className="mx-2">•</span>
          <span>Pipeline: Input / QC / Plan / Review</span>
        </div>
      </footer>
    </div>
  )
}
