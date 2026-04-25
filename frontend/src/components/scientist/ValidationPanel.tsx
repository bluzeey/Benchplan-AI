import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Props = {
  validation: Record<string, unknown>
}

export function ValidationPanel({ validation }: Props) {
  return (
    <Card className="rounded-2xl border-border/70">
      <CardHeader className="pb-2">
        <CardTitle>Validation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <pre className="max-h-80 overflow-auto rounded-xl border border-border/70 bg-background/70 p-3 text-xs text-muted-foreground">
          {JSON.stringify(validation, null, 2)}
        </pre>
        <p className="text-xs font-mono text-muted-foreground">Schema: validation-json</p>
      </CardContent>
    </Card>
  )
}
