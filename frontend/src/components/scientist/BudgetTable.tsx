import { z } from "zod"

import { fmtCurrency } from "@/lib/format"
import { BudgetLineSchema } from "@/lib/schemas"

type BudgetLine = z.infer<typeof BudgetLineSchema>

export function BudgetTable({ lines }: { lines: BudgetLine[] }) {
  return (
    <div className="card">
      <h3>Budget</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Label</th>
              <th>Total</th>
              <th>Assumptions</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td>{line.category}</td>
                <td>{line.label}</td>
                <td>{fmtCurrency(line.total_cost == null ? null : Number(line.total_cost))}</td>
                <td>{line.assumptions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="metadata-strip">
        <span className="mono">Budget lines: {lines.length}</span>
      </div>
    </div>
  )
}
