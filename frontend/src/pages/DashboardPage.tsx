import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"

import { HypothesisInput, type Attachment } from "@/components/scientist/HypothesisInput"
import { SampleHypothesisCards } from "@/components/scientist/SampleHypothesisCards"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { apiFetch, apiFetchRaw } from "@/lib/api"
import { ProjectSchema } from "@/lib/schemas"
import { 
  fadeInUp, 
  staggerContainer, 
  staggerItem,
  scaleIn,
  hoverGlow
} from "@/lib/motion"

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

// Animated flask logo
function AnimatedFlask({ className }: { className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ 
        type: "spring",
        stiffness: 200,
        damping: 20,
        delay: 0.2
      }}
    >
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        animate={{ 
          y: [0, -5, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <defs>
          <linearGradient id="flaskGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <motion.stop
              offset="0%"
              stopColor="#22d3ee"
              animate={{ stopColor: ["#22d3ee", "#a855f7", "#22d3ee"] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.stop
              offset="100%"
              stopColor="#a855f7"
              animate={{ stopColor: ["#a855f7", "#22d3ee", "#a855f7"] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
          </linearGradient>
        </defs>
        <motion.path
          d="M9 3L7 9H17L15 3H9Z"
          stroke="url(#flaskGradient)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
        <motion.path
          d="M6 9L4 16C4 18.2091 5.79086 20 8 20H16C18.2091 20 20 18.2091 20 16L18 9"
          stroke="url(#flaskGradient)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
        />
        <motion.path
          d="M12 14V14.01"
          stroke="url(#flaskGradient)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        />
        <motion.path
          d="M8 14C8 14 9 16 12 16C15 16 16 14 16 14"
          stroke="url(#flaskGradient)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        />
        {/* Animated bubbles */}
        <motion.circle
          cx="10"
          cy="17"
          r="1.5"
          fill="url(#flaskGradient)"
          initial={{ scale: 0, y: 0 }}
          animate={{ 
            scale: [0, 1, 0],
            y: [0, -10, -20]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            delay: 1.5,
            ease: "easeOut"
          }}
        />
        <motion.circle
          cx="14"
          cy="18"
          r="1"
          fill="url(#flaskGradient)"
          initial={{ scale: 0, y: 0 }}
          animate={{ 
            scale: [0, 1, 0],
            y: [0, -8, -16]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            delay: 2,
            ease: "easeOut"
          }}
        />
      </motion.svg>
    </motion.div>
  )
}

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
    <motion.div
      className="relative min-h-screen bg-background overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background ambient effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Gradient orbs */}
        <motion.div
          className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[150px]"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Top right status bar */}
      <motion.div
        className="absolute right-8 top-6 flex items-center gap-3 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <motion.div
          className="flex items-center gap-2 rounded-full border border-border/60 bg-card/50 backdrop-blur-xl px-3 py-1.5"
          whileHover={{ scale: 1.02 }}
        >
          <motion.span
            className="h-2 w-2 rounded-full bg-emerald-400"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <span className="text-sm text-foreground font-medium">System Nominal</span>
        </motion.div>
        <ThemeToggle variant="small" />
      </motion.div>

      {/* Main content */}
      <main className="relative mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-12 z-10">
        {/* Hero section */}
        <motion.div
          className="flex flex-col items-center text-center"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Flask icon with glow */}
          <motion.div
            className="mb-6 relative"
            variants={staggerItem}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 blur-3xl">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400/50 to-purple-500/50" />
            </div>
            <AnimatedFlask className="relative h-16 w-16" />
          </motion.div>

          <motion.h1
            className="text-3xl font-display font-semibold text-foreground sm:text-4xl md:text-5xl"
            variants={staggerItem}
          >
            <span className="gradient-text">What would you like</span>
            <br />
            <span className="text-foreground">to plan today?</span>
          </motion.h1>

          <motion.p
            className="mt-4 text-muted-foreground max-w-lg"
            variants={staggerItem}
          >
            Enter a scientific hypothesis and let AI generate a comprehensive
            experiment plan with literature review, budget, timeline, and materials.
          </motion.p>
        </motion.div>

        {/* Input area */}
        <motion.div
          className="mt-10 w-full max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <motion.div
            className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl p-1 shadow-2xl shadow-black/20"
            whileHover={{ 
              boxShadow: "0 0 40px rgba(34, 211, 238, 0.1), 0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
            transition={{ duration: 0.3 }}
          >
            <HypothesisInput
              value={draftHypothesis}
              onChange={setDraftHypothesis}
              onSubmit={async (hypothesis, attachments) => {
                await createProject.mutateAsync({ hypothesis, attachments })
              }}
              isSubmitting={createProject.isPending}
            />
          </motion.div>
        </motion.div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sample hypotheses */}
        <motion.div
          className="mt-12 w-full max-w-5xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <motion.p
            className="mb-4 text-center text-sm text-muted-foreground font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Try a sample hypothesis
          </motion.p>
          <SampleHypothesisCards
            samples={samples}
            onSelect={handleSampleSelect}
          />
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer
        className="absolute bottom-0 left-0 right-0 border-t border-border/30 px-8 py-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <motion.span
            className="h-2 w-2 rounded-full bg-emerald-400"
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
          <span>API Online</span>
          <span className="mx-2">•</span>
          <span>Pipeline: Input / QC / Plan / Review</span>
          <span className="mx-2">•</span>
          <span className="text-cyan-400/70">AI-Powered Research Planning</span>
        </div>
      </motion.footer>
    </motion.div>
  )
}
