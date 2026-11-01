import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { HypothesisInput } from "@/components/scientist/HypothesisInput"
import { SampleHypothesisCards } from "@/components/scientist/SampleHypothesisCards"
import { StrataLogo } from "@/components/ui/strata-logo"
import { getAuthNavigationState, MAX_HYPOTHESIS_DRAFT_LENGTH } from "@/lib/auth-destination"

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
  const authState = getAuthNavigationState({ draft: { hypothesis: draftHypothesis } })

  const handleSampleSelect = (hypothesis: string) => {
    setDraftHypothesis(hypothesis)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-border px-8">
        <StrataLogo markSize={34} wordmarkClassName="text-lg tracking-[0.22em]" />
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            state={authState}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            state={authState}
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
            Draft a hypothesis, then sign up or sign in to review and create your private project.
            You choose when to start literature checks and experiment planning.
          </p>
        </div>

        <div className="w-full max-w-3xl">
          <HypothesisInput
            value={draftHypothesis}
            onChange={setDraftHypothesis}
            onSubmit={(hypothesis) => {
              navigate("/signup", { state: getAuthNavigationState({ draft: { hypothesis } }) })
            }}
            allowAttachments={false}
            maxLength={MAX_HYPOTHESIS_DRAFT_LENGTH}
            submitLabel="Continue to sign up"
          />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Continue to sign up or sign in. Review before creating; add attachments after signing in.
            Drafts can contain up to 10,000 characters.
          </p>
        </div>

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
          <span>Your projects are private</span>
          <span className="mx-2">•</span>
          <span>Pipeline: Input / QC / Plan / Review</span>
        </div>
      </footer>
    </div>
  )
}
