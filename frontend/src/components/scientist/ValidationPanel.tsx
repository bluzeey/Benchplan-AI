import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ValidationData = {
  primary_endpoint?: string
  secondary_endpoints?: string[]
  success_criteria?: string[]
  failure_criteria?: string[]
  quality_controls?: string[]
  statistical_analysis?: string
}

type Props = {
  validation: ValidationData | Record<string, unknown>
}

// Helper to humanize snake_case strings
function humanize(text: string | undefined): string {
  if (!text) return "Unknown"
  return text
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function ValidationPanel({ validation }: Props) {
  const data = validation as ValidationData

  const hasContent = data.primary_endpoint || 
    (data.secondary_endpoints?.length) || 
    (data.success_criteria?.length) || 
    (data.failure_criteria?.length) ||
    (data.quality_controls?.length) ||
    data.statistical_analysis

  if (!hasContent) {
    return (
      <Card className="rounded-2xl border-border/70">
        <CardHeader className="pb-2">
          <CardTitle>Validation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No validation criteria available yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl border-border/70">
      <CardHeader className="pb-2">
        <CardTitle>Validation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Endpoint */}
        {data.primary_endpoint && (
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1">Primary Endpoint</p>
            <p className="text-sm">{humanize(data.primary_endpoint)}</p>
          </div>
        )}

        {/* Secondary Endpoints */}
        {data.secondary_endpoints?.length ? (
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1">Secondary Endpoints</p>
            <ul className="space-y-1">
              {data.secondary_endpoints.map((endpoint, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  {humanize(endpoint)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Success Criteria */}
        {data.success_criteria?.length ? (
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1">Success Criteria</p>
            <ul className="space-y-1">
              {data.success_criteria.map((criterion, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-emerald-500">✓</span>
                  {criterion}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Failure Criteria */}
        {data.failure_criteria?.length ? (
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1">Failure Criteria</p>
            <ul className="space-y-1">
              {data.failure_criteria.map((criterion, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-destructive">✕</span>
                  {criterion}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Quality Controls */}
        {data.quality_controls?.length ? (
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1">Quality Controls</p>
            <ul className="space-y-1">
              {data.quality_controls.map((control, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  {control}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Statistical Analysis */}
        {data.statistical_analysis && (
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1">Statistical Analysis</p>
            <p className="text-sm text-muted-foreground">{data.statistical_analysis}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
