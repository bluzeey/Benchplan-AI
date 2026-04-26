import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { z } from "zod"

import { HypothesisInput, type Attachment } from "@/components/scientist/HypothesisInput"
import { SampleHypothesisCards } from "@/components/scientist/SampleHypothesisCards"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { apiFetch, apiFetchRaw } from "@/lib/api"
import { ProjectSchema } from "@/lib/schemas"

const StartQcSchema = z.object({
  qc_run_id: z.string(),
  agent_run_id: z.string(),
})

import type { Sample } from "@/components/scientist/SampleHypothesisCards"

const samples: Sample[] = [
  {
    title: "Paper-based CRP electrochemical biosensor",
    hypothesis:
      "Paper-based CRP electrochemical biosensor will improve sensitivity by at least 25% compared to colorimetric strips in diluted whole blood.",
    icon: "teal",
  },
  {
    title: "LGG reduces intestinal permeability in mice",
    hypothesis:
      "Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls measured by FITC-dextran.",
    icon: "green",
  },
  {
    title: "Trehalose cryoprotection for HeLa cells",
    hypothesis:
      "Trehalose cryoprotectant optimization will increase post-thaw HeLa viability by at least 20% versus DMSO-only control.",
    icon: "purple",
  },
  {
    title: "Sporomusa ovata CO₂ to acetate bioelectrochemical system",
    hypothesis:
      "Sporomusa ovata in a bioelectrochemical reactor will increase acetate production rate from CO2 by at least 15% under controlled cathode potential.",
    icon: "yellow",
  },
]

export function DashboardPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [draftHypothesis, setDraftHypothesis] = useState("")

  const createProject = useMutation({
    mutationFn: async ({ hypothesis, attachments }: { hypothesis: string; attachments: Attachment[] }) => {
      const project = await apiFetch(
        "/api/projects/",
        ProjectSchema,
        {
          method: "POST",
          body: JSON.stringify({
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
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to create project")
    },
  })

  const handleSampleSelect = (hypothesis: string) => {
    setDraftHypothesis(hypothesis)
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Top right status bar */}
      <div className="absolute right-8 top-6 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
          <span className="text-sm text-foreground">System Nominal</span>
        </div>
        <ThemeToggle variant="small" />
      </div>

      {/* Main content */}
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-12">
        {/* Hero section */}
        <div className="flex flex-col items-center text-center">
          {/* Flask icon */}
          <div className="mb-6 flex h-16 w-16 items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-14 w-14"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="flaskGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <path
                d="M9 3L7 9H17L15 3H9Z"
                stroke="url(#flaskGradient)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 9L4 16C4 18.2091 5.79086 20 8 20H16C18.2091 20 20 18.2091 20 16L18 9"
                stroke="url(#flaskGradient)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 14V14.01"
                stroke="url(#flaskGradient)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 14C8 14 9 16 12 16C15 16 16 14 16 14"
                stroke="url(#flaskGradient)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
            What would you like to plan today?
          </h1>
          <p className="mt-3 text-muted-foreground">
            Enter a scientific hypothesis or question.
          </p>
        </div>

        {/* Input area */}
        <div className="mt-10 w-full max-w-3xl">
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
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Sample hypotheses */}
        <div className="mt-12 w-full max-w-5xl">
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Try a sample hypothesis
          </p>
          <SampleHypothesisCards
            samples={samples}
            onSelect={handleSampleSelect}
          />
        </div>
      </main>
    </div>
  )
}
