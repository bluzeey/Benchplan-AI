import { FlaskConical, SearchCheck, Sparkles } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const nav = [
  {
    label: "New Plan",
    to: "/projects/new",
    icon: Sparkles,
    matches: ["/projects/", "/runs/", "/plans/"],
  },
  {
    label: "Sources & Safety",
    to: "/settings/sources",
    icon: SearchCheck,
    matches: ["/settings/"],
  },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="hidden border-r border-border/70 bg-background/60 px-4 py-5 backdrop-blur-xl lg:flex lg:flex-col lg:gap-5">
      <div className="rounded-2xl border border-border/70 bg-card/75 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">BenchPlan AI</p>
        <p className="mt-2 text-lg font-semibold">Scientific Command Center</p>
      </div>

      <nav className="space-y-1.5">
        {nav.map((item) => {
          const Icon = item.icon
          const active = location.pathname === item.to || item.matches.some((prefix) => location.pathname.startsWith(prefix))
          return (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all",
                active
                  ? "border-primary/35 bg-primary/10 text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <Icon size={16} className={active ? "text-primary" : ""} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">System Channel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Grid: 12-column fluid lab surface</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default" className="normal-case tracking-wide">
              Mode: empirical
            </Badge>
            <Badge variant="default" className="normal-case tracking-wide">
              Density: compact
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="mt-auto flex items-center gap-2 rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-sm text-muted-foreground">
        <FlaskConical size={16} />
        <span>Audit trail module</span>
      </div>
    </aside>
  )
}
