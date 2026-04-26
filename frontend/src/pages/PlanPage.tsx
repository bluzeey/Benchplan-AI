import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { z } from "zod"
import React, { useEffect, useRef, useState, useCallback } from "react"

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
import { apiFetch, apiFetchRaw } from "@/lib/api"
import { BudgetLineSchema, ExperimentPlanSchema, MaterialSchema, TimelinePhaseSchema } from "@/lib/schemas"
import { queryKeys } from "@/lib/query-keys"
import type { PlanSection } from "@/lib/schemas"
import { PlanPageSkeleton } from "@/components/ui/skeleton"

// Check if content looks like raw code (dict string)
function isRawCode(content: string): boolean {
  return content.trim().startsWith("{") || content.trim().startsWith("[")
}

// Format section content from JSON to readable text
function formatSectionContent(section: {
  key: string
  title: string
  content_markdown: string
  content_json: Record<string, unknown> | undefined
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
        const signalStr = String(data.signal).replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
        lines.push(`**Novelty Signal:** ${signalStr}`)
      }
      if (data.summary) {
        lines.push("", String(data.summary))
      }
      const keyRefs = data.key_references as Array<unknown> | undefined
      if (keyRefs?.length) {
        lines.push("", `**References:** ${keyRefs.length} sources identified`)
      }
      break

    case "protocol":
      const steps = data.steps as Array<Record<string, unknown>> | undefined
      if (steps?.length) {
        lines.push(`**Protocol Overview:** ${steps.length} step(s)`)
        steps.forEach((step, i) => {
          lines.push("", `**${i + 1}. ${step.title}**`)
          if (step.description) lines.push(String(step.description))
          if (step.duration_minutes) {
            const duration = Number(step.duration_minutes)
            const hrs = Math.floor(duration / 60)
            const mins = duration % 60
            lines.push(hrs > 0 ? `*Duration: ${hrs}h ${mins}m*` : `*Duration: ${mins} minutes*`)
          }
        })
      }
      break

    case "materials":
      const items = data.items as Array<Record<string, unknown>> | undefined
      if (items?.length) {
        lines.push(`**Materials:** ${items.length} item(s) required`)
        items.forEach((item) => {
          lines.push("", `- **${item.name}**`)
          if (item.role) lines.push(`  - Role: ${item.role}`)
          if (item.quantity) lines.push(`  - Quantity: ${item.quantity}`)
          if (item.estimated_total_cost) lines.push(`  - Est. Cost: $${Number(item.estimated_total_cost).toLocaleString()}`)
        })
      }
      break

    case "budget":
      const budgetLines = data.lines as Array<Record<string, unknown>> | undefined
      if (budgetLines?.length) {
        const total = budgetLines.reduce((sum, line) => sum + (Number(line.total_cost) || 0), 0)
        lines.push(`**Budget Summary:** $${total.toLocaleString()} total`)
        budgetLines.forEach((line) => {
          const category = String(line.category || "").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
          lines.push("", `- **${category}** — ${line.label}: $${Number(line.total_cost).toLocaleString()}`)
          if (line.assumptions) lines.push(`  - *${line.assumptions}*`)
        })
      }
      break

    case "timeline":
      const phases = data.phases as Array<Record<string, unknown>> | undefined
      if (phases?.length) {
        const lastPhase = phases[phases.length - 1]
        lines.push(`**Timeline:** ${phases.length} phase(s), ${lastPhase?.end_week || "?"} weeks total`)
        phases.forEach((phase) => {
          lines.push("", `- **Week ${phase.start_week}-${phase.end_week}:** ${phase.title}`)
          if (phase.parallelizable) lines.push("  - *Can run in parallel*")
          if (phase.risk_of_delay) lines.push(`  - Risk: ${phase.risk_of_delay}`)
          if (phase.mitigation) lines.push(`  - Mitigation: ${phase.mitigation}`)
        })
      }
      break

    case "validation":
      if (data.primary_endpoint) lines.push(`**Primary Endpoint:** ${data.primary_endpoint}`)
      const secondaryEndpoints = data.secondary_endpoints as string[] | undefined
      if (secondaryEndpoints?.length) {
        lines.push("", `**Secondary Endpoints:** ${secondaryEndpoints.join(", ")}`)
      }
      const successCriteria = data.success_criteria as string[] | undefined
      if (successCriteria?.length) {
        lines.push("", "**Success Criteria:**")
        successCriteria.forEach((c) => lines.push(`- ${c}`))
      }
      break

    case "risks_safety":
      if (data.warning) lines.push(`> ⚠️ **Safety Notice:** ${data.warning}`, "")
      const risks = data.risks as Array<Record<string, unknown>> | undefined
      if (risks?.length) {
        lines.push(`**Risk Assessment:** ${risks.length} category(s)`)
        risks.forEach((risk) => {
          lines.push("", `- **${risk.category}** — Risk Level: ${risk.state}`)
          const approvals = risk.required_approvals as string[] | undefined
          if (approvals?.length) {
            lines.push(`  - Required Approvals: ${approvals.join(", ")}`)
          }
        })
      }
      break

    case "assumptions":
      const assumptions = data.assumptions as string[] | undefined
      if (assumptions?.length) {
        lines.push(`**Key Assumptions:** ${assumptions.length} item(s)`)
        assumptions.forEach((a) => lines.push(`- ${a}`))
      }
      break

    case "references":
      const refs = data.references as Array<Record<string, unknown>> | undefined
      if (refs?.length) {
        lines.push(`**Literature Sources:** ${refs.length} reference(s)`)
        refs.slice(0, 5).forEach((ref) => {
          lines.push("", `- **${ref.title}**`)
          if (ref.source && ref.year) lines.push(`  - ${String(ref.source).toUpperCase()}, ${ref.year}`)
          if (ref.relevance_score) lines.push(`  - Relevance: ${Math.round(Number(ref.relevance_score) * 100)}%`)
        })
        if (refs.length > 5) lines.push(`\n*... and ${refs.length - 5} more references*`)
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
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)

  const planQuery = useQuery({
    queryKey: queryKeys.plans.detail(planId || ""),
    queryFn: () => apiFetch(`/api/plans/${planId}/`, ExperimentPlanSchema),
    enabled: Boolean(planId),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === "generating" ? 3000 : false
    },
  })
  const materialsQuery = useQuery({
    queryKey: queryKeys.plans.materials(planId || ""),
    queryFn: () => apiFetch(`/api/plans/${planId}/materials/`, z.array(MaterialSchema)),
    enabled: Boolean(planId),
    staleTime: 60_000,
  })
  const budgetQuery = useQuery({
    queryKey: queryKeys.plans.budget(planId || ""),
    queryFn: () => apiFetch(`/api/plans/${planId}/budget/`, z.array(BudgetLineSchema)),
    enabled: Boolean(planId),
    staleTime: 60_000,
  })
  const timelineQuery = useQuery({
    queryKey: queryKeys.plans.timeline(planId || ""),
    queryFn: () => apiFetch(`/api/plans/${planId}/timeline/`, z.array(TimelinePhaseSchema)),
    enabled: Boolean(planId),
    staleTime: 60_000,
  })

  // Track active section on scroll
  const updateActiveSection = useCallback(() => {
    if (!planQuery.data?.sections?.length || !scrollContainerRef.current) return

    const container = scrollContainerRef.current
    const containerRect = container.getBoundingClientRect()
    // Activation point is 25% from top of viewport
    const activationPoint = containerRect.top + containerRect.height * 0.25

    let closestSection: { id: string; distance: number } | null = null

    planQuery.data.sections.forEach((section) => {
      const element = document.getElementById(`section-${section.id}`)
      if (!element) return

      const rect = element.getBoundingClientRect()
      // Section is "active" if its top is at or below the activation point
      const distance = rect.top - activationPoint

      if (distance <= 0) {
        // This section is above or at the activation point
        if (!closestSection || distance > closestSection.distance) {
          // Choose the one closest to activation point (least negative or zero)
          closestSection = { id: section.id, distance }
        }
      }
    })

    // If no section is above activation point, we're at the top - use first section
    if (!closestSection && planQuery.data.sections.length > 0) {
      closestSection = { id: planQuery.data.sections[0].id, distance: 0 }
    }

    if (closestSection && closestSection.id !== activeSectionId) {
      setActiveSectionId(closestSection.id)
    }
  }, [planQuery.data?.sections, activeSectionId])

  // Attach scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || !planQuery.data?.sections?.length) return

    // Set initial active section
    setActiveSectionId(planQuery.data.sections[0].id)

    container.addEventListener("scroll", updateActiveSection, { passive: true })
    // Initial check
    updateActiveSection()

    return () => container.removeEventListener("scroll", updateActiveSection)
  }, [planQuery.data?.sections, updateActiveSection])

  const handleSectionClick = useCallback((sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`)
    if (element && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const containerRect = container.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()

      // Calculate scroll position to bring element to 20% from top of container
      const scrollOffset = elementRect.top - containerRect.top - containerRect.height * 0.2

      container.scrollTo({
        top: container.scrollTop + scrollOffset,
        behavior: "smooth",
      })

      setActiveSectionId(sectionId)
    }
  }, [])

  if (planQuery.isLoading) return <PlanPageSkeleton />
  if (planQuery.error) return <p className="text-sm text-destructive">{(planQuery.error as Error).message}</p>
  if (!planQuery.data) return null

  const plan = planQuery.data

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:h-[calc(100vh-4rem)] lg:min-h-0">
      <PlanSectionNav
        sections={plan.sections ?? []}
        activeSectionId={activeSectionId}
        onSectionClick={handleSectionClick}
      />
      <section className="flex flex-col lg:min-h-0 h-full">
        {/* Header - Stays visible */}
        <div className="space-y-4 shrink-0">
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
        </div>

        {/* Scrollable Content Area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 lg:min-h-0 lg:overflow-y-auto custom-scrollbar lg:pr-2 mt-4 scroll-smooth"
        >
          <div className="space-y-4 pb-4">
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
                  const formattedContent = formatSectionContent({
                    key: section.key,
                    title: section.title,
                    content_markdown: section.content_markdown,
                    content_json: section.content_json || {},
                    needs_review: section.needs_review
                  })
                  return (
                    <article key={section.id} id={`section-${section.id}`} className="scroll-mt-20 rounded-xl border border-border/70 bg-background/60 p-4">
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
                <a href={`/api/plans/${planId}/export/materials.csv`} target="_blank" rel="noreferrer">
                  Export Materials CSV
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
