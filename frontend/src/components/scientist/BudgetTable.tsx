import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fmtCurrency } from "@/lib/format"
import type { BudgetLine } from "@/lib/schemas"

export function BudgetTable({ lines }: { lines: BudgetLine[] }) {
  return (
    <Card className="rounded-2xl border-border/70">
      <CardHeader className="pb-2">
        <CardTitle>Budget</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="min-w-[640px] w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-border/70 bg-accent/70 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Category</th>
              <th className="border-b border-border/70 bg-accent/70 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Label</th>
              <th className="border-b border-border/70 bg-accent/70 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Total</th>
              <th className="border-b border-border/70 bg-accent/70 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Assumptions</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="odd:bg-background/20 even:bg-card/20 hover:bg-primary/5">
                <td className="border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">{line.category}</td>
                <td className="border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">{line.label}</td>
                <td className="border-b border-border/60 px-3 py-2 text-xs font-medium text-foreground">{fmtCurrency(line.total_cost == null ? null : Number(line.total_cost))}</td>
                <td className="border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">{line.assumptions}</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
        <p className="border-t border-border/70 pt-3 text-xs font-mono text-muted-foreground">Budget lines: {lines.length}</p>
      </CardContent>
    </Card>
  )
}
