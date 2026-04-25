import { fmtCurrency } from "@/lib/format"

import { Card, CardContent } from "@/components/ui/card"

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
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="rounded-xl border-border/70">
        <CardContent className="space-y-2 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Estimated budget</p>
          <p className="font-mono text-sm font-semibold">
          {fmtCurrency(min)} - {fmtCurrency(max)}
          </p>
          <p className="text-xs text-muted-foreground">Signal: assumption-aware</p>
        </CardContent>
      </Card>
      <Card className="rounded-xl border-border/70">
        <CardContent className="space-y-2 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Timeline</p>
          <p className="font-mono text-sm font-semibold">
          {plan.estimated_duration_weeks_min} - {plan.estimated_duration_weeks_max} weeks
          </p>
          <p className="text-xs text-muted-foreground">Unit: calendar week</p>
        </CardContent>
      </Card>
      <Card className="rounded-xl border-border/70">
        <CardContent className="space-y-2 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Scientist review</p>
          <p className="font-mono text-sm font-semibold">{plan.scientist_review_status}</p>
          <p className="text-xs text-muted-foreground">Source: review session</p>
        </CardContent>
      </Card>
      <Card className="rounded-xl border-border/70">
        <CardContent className="space-y-2 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Sections</p>
          <p className="font-mono text-sm font-semibold">{(plan.sections ?? []).length}</p>
          <p className="text-xs text-muted-foreground">Generated modules</p>
        </CardContent>
      </Card>
    </div>
  )
}
