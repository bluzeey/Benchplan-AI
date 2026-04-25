import { useLocation } from "react-router-dom"

import { Badge } from "@/components/ui/badge"

const routeLabels: Array<{ match: RegExp; label: string }> = [
  { match: /^\/projects\/new/, label: "Project Intake" },
  { match: /^\/projects\/[^/]+$/, label: "Project Workspace" },
  { match: /^\/projects$/, label: "All Projects" },
  { match: /^\/runs\//, label: "Live Agent Run" },
  { match: /^\/plans\/.+\/review/, label: "Scientist Review" },
  { match: /^\/plans\/[^/]+$/, label: "Experiment Plan" },
  { match: /^\/plans$/, label: "All Plans" },
  { match: /^\/reviews$/, label: "Reviews" },
  { match: /^\/analytics$/, label: "Analytics" },
  { match: /^\/settings\/sources/, label: "Sources and Safety" },
  { match: /^\/settings$/, label: "Settings" },
]

export function Topbar() {
  const location = useLocation()
  const route = routeLabels.find((item) => item.match.test(location.pathname))?.label ?? "Workspace"

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-secondary shadow-[0_0_0_3px_rgba(78,222,163,0.2)]" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Scientific Command Center</p>
            <p className="text-sm font-semibold">{route}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default">System nominal</Badge>
          <Badge variant="default">AA compliant</Badge>
        </div>
      </div>
    </header>
  )
}
