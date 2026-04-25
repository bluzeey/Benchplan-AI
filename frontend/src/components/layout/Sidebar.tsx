import { FlaskConical, SearchCheck, Sparkles } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

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
    <aside className="sidebar">
      <div className="brand">
        <strong>BenchPlan AI</strong>
        <p>Scientific Command Center</p>
      </div>
      <nav>
        {nav.map((item) => {
          const Icon = item.icon
          const active = location.pathname === item.to || item.matches.some((prefix) => location.pathname.startsWith(prefix))
          return (
            <Link key={item.label} to={item.to} className={`nav-item ${active ? "active" : ""}`}>
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <section className="card compact">
        <h4 className="mono">System Channel</h4>
        <p className="muted">Grid: 12-column fluid lab surface</p>
        <div className="metadata-strip">
          <span>Mode: empirical</span>
          <span>Density: compact</span>
        </div>
      </section>
      <div className="nav-item">
        <FlaskConical size={16} />
        <span>Audit trail module</span>
      </div>
    </aside>
  )
}
