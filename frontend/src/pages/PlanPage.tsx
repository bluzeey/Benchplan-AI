import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { z } from "zod"

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
import { apiFetch } from "@/lib/api"
import { BudgetLineSchema, ExperimentPlanSchema, MaterialSchema, TimelinePhaseSchema } from "@/lib/schemas"

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
            <CardContent className="space-y-3">
            {(plan.sections ?? []).map((section) => (
              <article key={section.id} id={`section-${section.id}`} className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
                <h4 className="text-sm font-semibold">{section.title}</h4>
                <p className="text-sm text-muted-foreground">{section.content_markdown.slice(0, 420)}{section.content_markdown.length > 420 ? "..." : ""}</p>
                <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-2 text-xs text-muted-foreground">
                  <span className="font-mono">Key: {section.key}</span>
                  <span className="font-mono">Needs review: {section.needs_review ? "yes" : "no"}</span>
                </div>
              </article>
            ))}
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
