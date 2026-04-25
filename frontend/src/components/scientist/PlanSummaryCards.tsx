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
        <strong className="mono">
          {fmtCurrency(min)} - {fmtCurrency(max)}
        </strong>
        <div className="metadata-strip">
          <span>Signal: assumption-aware</span>
        </div>
      </article>
      <article className="card compact">
        <p className="muted">Timeline</p>
        <strong className="mono">
          {plan.estimated_duration_weeks_min} - {plan.estimated_duration_weeks_max} weeks
        </strong>
        <div className="metadata-strip">
          <span>Unit: calendar week</span>
        </div>
      </article>
      <article className="card compact">
        <p className="muted">Scientist review</p>
        <strong className="mono">{plan.scientist_review_status}</strong>
        <div className="metadata-strip">
          <span>Source: review session</span>
        </div>
      </article>
      <article className="card compact">
        <p className="muted">Sections</p>
        <strong className="mono">{(plan.sections ?? []).length}</strong>
        <div className="metadata-strip">
          <span>Generated modules</span>
        </div>
      </article>
    </div>
  )
}
