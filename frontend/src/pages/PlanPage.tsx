import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { z } from "zod"
import React from "react"

import { BudgetTable } from "@/components/scientist/BudgetTable"
import { MaterialsTable } from "@/components/scientist/MaterialsTable"
import { PlanSectionNav } from "@/components/scientist/PlanSectionNav"
import { PlanSummaryCards } from "@/components/scientist/PlanSummaryCards"
import { ProtocolStepCard } from "@/components/scientist/ProtocolStepCard"
import { SafetyPanel } from "@/components/scientist/SafetyPanel"
import { TimelineView } from "@/components/scientist/TimelineView"
import { ValidationPanel } from "@/components/scientist/ValidationPanel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiFetch } from "@/lib/api"
import { BudgetLineSchema, ExperimentPlanSchema, MaterialSchema, TimelinePhaseSchema } from "@/lib/schemas"
import type { PlanSection } from "@/lib/schemas"

// Check if content looks like raw code (dict string)
function isRawCode(content: string): boolean {
  return content.trim().startsWith("{") || content.trim().startsWith("[")
}

// Format section content from JSON to readable text
function formatSectionContent(section: {
  key: string
  title: string
  content_markdown: string
  content_json: Record<string, unknown>
  needs_review: boolean
}): string {
  // If markdown is already properly formatted (not raw code), use it
  if (section.content_markdown && !isRawCode(section.content_markdown)) {
    return section.content_markdown
  }

  // Otherwise, format from content_json
  const data = section.content_json || {}
  const key = section.key
  const lines: string[] = []

  switch (key) {
    case "overview":
      if (data.executive_summary) {
        lines.push(`**Executive Summary:** ${data.executive_summary}`)
      }
      break

    case "novelty_qc":
      if (data.signal) {
        lines.push(`**Novelty Signal:** ${data.signal.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}`)
      }
      if (data.summary) {
        lines.push("", data.summary)
      }
      if (data.key_references?.length) {
        lines.push("", `**References:** ${data.key_references.length} sources identified`)
      }
      break

    case "protocol":
      if (data.steps?.length) {
        lines.push(`**Protocol Overview:** ${data.steps.length} step(s)`)
        data.steps.forEach((step: Record<string, unknown>, i: number) => {
          lines.push("", `**${i + 1}. ${step.title}**`)
          if (step.description) lines.push(step.description as string)
          if (step.duration_minutes) {
            const hrs = Math.floor((step.duration_minutes as number) / 60)
            const mins = (step.duration_minutes as number) % 60
            lines.push(hrs > 0 ? `*Duration: ${hrs}h ${mins}m*` : `*Duration: ${mins} minutes*`)
          }
        })
      }
      break

    case "materials":
      if (data.items?.length) {
        lines.push(`**Materials:** ${data.items.length} item(s) required`)
        data.items.forEach((item: Record<string, unknown>) => {
          lines.push("", `- **${item.name}**`)
          if (item.role) lines.push(`  - Role: ${item.role}`)
          if (item.quantity) lines.push(`  - Quantity: ${item.quantity}`)
          if (item.estimated_total_cost) lines.push(`  - Est. Cost: $${Number(item.estimated_total_cost).toLocaleString()}`)
        })
      }
      break

    case "budget":
      if (data.lines?.length) {
        const total = data.lines.reduce((sum: number, line: Record<string, unknown>) => sum + (Number(line.total_cost) || 0), 0)
        lines.push(`**Budget Summary:** $${total.toLocaleString()} total`)
        data.lines.forEach((line: Record<string, unknown>) => {
          lines.push("", `- **${(line.category as string)?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}** — ${line.label}: $${Number(line.total_cost).toLocaleString()}`)
          if (line.assumptions) lines.push(`  - *${line.assumptions}*`)
        })
      }
      break

    case "timeline":
      if (data.phases?.length) {
        const lastPhase = data.phases[data.phases.length - 1]
        lines.push(`**Timeline:** ${data.phases.length} phase(s), ${lastPhase?.end_week || "?"} weeks total`)
        data.phases.forEach((phase: Record<string, unknown>) => {
          lines.push("", `- **Week ${phase.start_week}-${phase.end_week}:** ${phase.title}`)
          if (phase.parallelizable) lines.push("  - *Can run in parallel*")
          if (phase.risk_of_delay) lines.push(`  - Risk: ${phase.risk_of_delay}`)
          if (phase.mitigation) lines.push(`  - Mitigation: ${phase.mitigation}`)
        })
      }
      break

    case "validation":
      if (data.primary_endpoint) lines.push(`**Primary Endpoint:** ${data.primary_endpoint}`)
      if (data.secondary_endpoints?.length) {
        lines.push("", `**Secondary Endpoints:** ${(data.secondary_endpoints as string[]).join(", ")}`)
      }
      if (data.success_criteria?.length) {
        lines.push("", "**Success Criteria:**")
        ;(data.success_criteria as string[]).forEach((c: string) => lines.push(`- ${c}`))
      }
      break

    case "risks_safety":
      if (data.warning) lines.push(`> ⚠️ **Safety Notice:** ${data.warning}`, "")
      if (data.risks?.length) {
        lines.push(`**Risk Assessment:** ${(data.risks as Array<Record<string, unknown>>).length} category(s)`)
        ;(data.risks as Array<Record<string, unknown>>).forEach((risk) => {
          lines.push("", `- **${risk.category}** — Risk Level: ${risk.state}`)
          const approvals = risk.required_approvals as string[] | undefined
          if (approvals?.length) {
            lines.push(`  - Required Approvals: ${approvals.join(", ")}`)
          }
        })
      }
      break

    case "assumptions":
      if (data.assumptions?.length) {
        lines.push(`**Key Assumptions:** ${data.assumptions.length} item(s)`)
        ;(data.assumptions as string[]).forEach((a: string) => lines.push(`- ${a}`))
      }
      break

    case "references":
      if (data.references?.length) {
        lines.push(`**Literature Sources:** ${data.references.length} reference(s)`)
        ;(data.references as Array<Record<string, unknown>>).slice(0, 5).forEach((ref) => {
          lines.push("", `- **${ref.title}**`)
          if (ref.source && ref.year) lines.push(`  - ${(ref.source as string).toUpperCase()}, ${ref.year}`)
          if (ref.relevance_score) lines.push(`  - Relevance: ${Math.round((ref.relevance_score as number) * 100)}%`)
        })
        if (data.references.length > 5) lines.push(`\n*... and ${data.references.length - 5} more references*`)
      }
      break

    default:
      // Generic formatting for unknown sections
      Object.entries(data).forEach(([k, v]) => {
        if (typeof v === "string") lines.push(`**${k.replace(/_/g, " ")}:** ${v}`)
        else if (Array.isArray(v)) lines.push(`**${k.replace(/_/g, " ")}:** ${v.length} items`)
      })
  }

  return lines.join("\n") || "No content available"
}

export function PlanPage() {
  const { planId } = useParams()

  const planQuery = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => apiFetch(`/api/plans/${planId}/`, ExperimentPlanSchema),
    enabled: Boolean(planId),
  })
  const materialsQuery = useQuery({
    queryKey: ["materials", planId],
    queryFn: () => apiFetch(`/api/plans/${planId}/materials/`, z.array(MaterialSchema)),
    enabled: Boolean(planId),
  })
  const budgetQuery = useQuery({
    queryKey: ["budget", planId],
    queryFn: () => apiFetch(`/api/plans/${planId}/budget/`, z.array(BudgetLineSchema)),
    enabled: Boolean(planId),
  })
  const timelineQuery = useQuery({
    queryKey: ["timeline", planId],
    queryFn: () => apiFetch(`/api/plans/${planId}/timeline/`, z.array(TimelinePhaseSchema)),
    enabled: Boolean(planId),
  })

  if (planQuery.isLoading) return <p className="text-sm text-muted-foreground">Loading plan...</p>
  if (planQuery.error) return <p className="text-sm text-destructive">{(planQuery.error as Error).message}</p>
  if (!planQuery.data) return null

  const plan = planQuery.data

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <PlanSectionNav sections={plan.sections ?? []} />
      <section className="space-y-4">
        <h2 className="text-3xl font-semibold tracking-tight">{plan.title}</h2>
        <PlanSummaryCards plan={plan} />
        <Card className="rounded-2xl border-border/70">
          <CardHeader>
            <CardTitle>Executive summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{plan.executive_summary}</p>
            <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
              <span className="font-mono">Plan id: {plan.id}</span>
              <span className="font-mono">Status: {plan.status}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/70">
          <CardHeader>
            <CardTitle>Protocol</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(plan.protocol_steps ?? []).map((step) => (
              <ProtocolStepCard key={step.id} step={step} />
            ))}
          </CardContent>
        </Card>
        {(plan.sections ?? []).length ? (
          <Card className="rounded-2xl border-border/70">
            <CardHeader>
              <CardTitle>Generated sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            {(plan.sections ?? []).map((section) => {
              const formattedContent = formatSectionContent(section)
              return (
                <article key={section.id} id={`section-${section.id}`} className="rounded-xl border border-border/70 bg-background/60 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{section.title}</h4>
                    {section.needs_review && (
                      <Badge variant="warning" className="text-[10px]">Needs Review</Badge>
                    )}
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {formattedContent.split("\n").map((line, i) => {
                      // Render bold text
                      if (line.startsWith("**") && line.includes(":**")) {
                        const [label, ...rest] = line.split(":**")
                        return (
                          <p key={i} className="text-sm my-1">
                            <span className="font-semibold">{label.replace(/^\*\*/, "")}:</span>
                            {rest.join(":**").replace(/\*\*$/, "")}
                          </p>
                        )
                      }
                      // Render bullet points
                      if (line.startsWith("- ")) {
                        return (
                          <p key={i} className="text-sm my-1 ml-4">
                            • {line.replace(/^- /, "").replace(/\*\*/g, "")}
                          </p>
                        )
                      }
                      // Render headers (numbered steps)
                      if (line.match(/^\*\*\d+\./)) {
                        return <h5 key={i} className="text-sm font-semibold mt-3 mb-1">{line.replace(/\*\*/g, "")}</h5>
                      }
                      // Render sub-headers
                      if (line.startsWith("**") && line.endsWith("**")) {
                        return <h5 key={i} className="text-sm font-semibold mt-3 mb-1">{line.replace(/\*\*/g, "")}</h5>
                      }
                      // Render italic/notes
                      if (line.startsWith("*") && line.endsWith("*")) {
                        return <p key={i} className="text-xs text-muted-foreground italic my-1">{line.replace(/\*/g, "")}</p>
                      }
                      // Render blockquotes (warnings)
                      if (line.startsWith(">")) {
                        return (
                          <blockquote key={i} className="text-sm border-l-2 border-amber-500 pl-3 my-2 text-muted-foreground">
                            {line.replace(/^>\s*/, "").replace(/\*\*/g, "")}
                          </blockquote>
                        )
                      }
                      // Regular text
                      if (line.trim()) {
                        return <p key={i} className="text-sm text-muted-foreground my-1">{line.replace(/\*\*/g, "")}</p>
                      }
                      return null
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t border-border/70 mt-3 pt-2 text-xs text-muted-foreground">
                    <span className="font-mono">ID: {section.key}</span>
                    {"confidence" in section && section.confidence != null && (
                      <span className="font-mono">Confidence: {Math.round(Number(section.confidence) * 100)}%</span>
                    )}
                  </div>
                </article>
              )
            })}
            </CardContent>
          </Card>
        ) : null}
        {materialsQuery.data ? <MaterialsTable materials={materialsQuery.data} /> : null}
        {budgetQuery.data ? <BudgetTable lines={budgetQuery.data} /> : null}
        {timelineQuery.data ? <TimelineView phases={timelineQuery.data} /> : null}
        <ValidationPanel validation={((plan.plan_json ?? {}).validation as Record<string, unknown>) || {}} />
        <SafetyPanel risks={((plan.plan_json ?? {}).risks_and_safety as unknown[]) || []} />

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link to={`/plans/${plan.id}/review`}>Open Scientist Review</Link>
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/plans/${plan.id}/export/markdown/`} target="_blank" rel="noreferrer">
              Export Markdown
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/plans/${plan.id}/export/materials.csv`} target="_blank" rel="noreferrer">
              Export Materials CSV
            </a>
          </Button>
        </div>
      </section>
    </div>
  )
}
