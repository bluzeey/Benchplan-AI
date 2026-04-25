import { fmtCurrency } from "@/lib/format"

type Plan = {
  estimated_budget_min: number | string | null
  estimated_budget_max: number | string | null
  estimated_duration_weeks_min: number | null
  estimated_duration_weeks_max: number | null
  scientist_review_status: string
  sections?: unknown[]
}

export function PlanSummaryCards({ plan }: { plan: Plan }) {
  const min = plan.estimated_budget_min == null ? null : Number(plan.estimated_budget_min)
  const max = plan.estimated_budget_max == null ? null : Number(plan.estimated_budget_max)

  return (
    <div className="grid summary-grid">
      <article className="card compact">
        <p className="muted">Estimated budget</p>
        <strong>
          {fmtCurrency(min)} - {fmtCurrency(max)}
        </strong>
      </article>
      <article className="card compact">
        <p className="muted">Timeline</p>
        <strong>
          {plan.estimated_duration_weeks_min} - {plan.estimated_duration_weeks_max} weeks
        </strong>
      </article>
      <article className="card compact">
        <p className="muted">Scientist review</p>
        <strong>{plan.scientist_review_status}</strong>
      </article>
      <article className="card compact">
        <p className="muted">Sections</p>
        <strong>{(plan.sections ?? []).length}</strong>
      </article>
    </div>
  )
}
