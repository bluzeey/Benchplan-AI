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

  if (planQuery.isLoading) return <p>Loading plan...</p>
  if (planQuery.error) return <p className="error">{(planQuery.error as Error).message}</p>
  if (!planQuery.data) return null

  const plan = planQuery.data

  return (
    <div className="plan-layout">
      <PlanSectionNav sections={plan.sections ?? []} />
      <section className="stack">
        <h2>{plan.title}</h2>
        <PlanSummaryCards plan={plan} />
        <section className="card">
          <h3>Executive summary</h3>
          <p>{plan.executive_summary}</p>
        </section>
        <section className="card">
          <h3>Protocol</h3>
          <div className="stack">
            {(plan.protocol_steps ?? []).map((step) => (
              <ProtocolStepCard key={step.id} step={step} />
            ))}
          </div>
        </section>
        {materialsQuery.data ? <MaterialsTable materials={materialsQuery.data} /> : null}
        {budgetQuery.data ? <BudgetTable lines={budgetQuery.data} /> : null}
        {timelineQuery.data ? <TimelineView phases={timelineQuery.data} /> : null}
        <ValidationPanel validation={((plan.plan_json ?? {}).validation as Record<string, unknown>) || {}} />
        <SafetyPanel risks={((plan.plan_json ?? {}).risks_and_safety as unknown[]) || []} />

        <div className="row">
          <Link to={`/plans/${plan.id}/review`} className="button-link">
            Open Scientist Review
          </Link>
          <a className="button-link" href={`/api/plans/${plan.id}/export/markdown/`} target="_blank" rel="noreferrer">
            Export Markdown
          </a>
          <a className="button-link" href={`/api/plans/${plan.id}/export/materials.csv`} target="_blank" rel="noreferrer">
            Export Materials CSV
          </a>
        </div>
      </section>
    </div>
  )
}
