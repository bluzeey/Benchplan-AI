import { ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { useMemo, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Material } from "@/lib/schemas"

const columns: Array<ColumnDef<Material>> = [
  { accessorKey: "name", header: "Item" },
  { accessorKey: "role", header: "Role" },
  { accessorKey: "supplier", header: "Supplier" },
  { accessorKey: "catalog_number", header: "Catalog" },
  { accessorKey: "quantity", header: "Quantity" },
  { accessorKey: "estimated_total_cost", header: "Est. Total" },
  {
    accessorKey: "needs_supplier_verification",
    header: "Verification",
    cell: ({ row }) => (row.original.needs_supplier_verification ? "Needs verification" : "Source-backed"),
  },
]

export function MaterialsTable({ materials }: { materials: Material[] }) {
  const [sorting, setSorting] = useState<any[]>([])
  const data = useMemo(() => materials, [materials])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <Card className="rounded-2xl border-border/70">
      <CardHeader className="pb-2">
        <CardTitle>Materials</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="min-w-[760px] w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer border-b border-border/70 bg-accent/70 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="odd:bg-background/20 even:bg-card/20 hover:bg-primary/5">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="border-b border-border/60 px-3 py-2 align-top text-xs text-muted-foreground">
                    {cell.column.columnDef.cell ? flexRender(cell.column.columnDef.cell, cell.getContext()) : String(cell.getValue() ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
          <span className="font-mono">Rows: {materials.length}</span>
          <span>Verification field marks supplier confidence</span>
        </div>
      </CardContent>
    </Card>
  )
}
