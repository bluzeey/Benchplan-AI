import { ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { z } from "zod"

import { MaterialSchema } from "@/lib/schemas"

type Material = z.infer<typeof MaterialSchema>

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
    <div className="card">
      <h3>Materials</h3>
      <div className="table-wrap">
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{cell.column.columnDef.cell ? flexRender(cell.column.columnDef.cell, cell.getContext()) : String(cell.getValue() ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="metadata-strip">
        <span className="mono">Rows: {materials.length}</span>
        <span>Verification field marks supplier confidence</span>
      </div>
    </div>
  )
}
