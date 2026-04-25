import { FlaskConical, FileText, FolderOpen, SearchCheck, Settings, Sparkles } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

const nav = [
  { label: "New Plan", to: "/projects/new", icon: Sparkles },
  { label: "Projects", to: "/projects/new", icon: FolderOpen },
  { label: "Literature QC", to: "/projects/new", icon: SearchCheck },
  { label: "Reviews", to: "/settings/sources", icon: FileText },
  { label: "Feedback Library", to: "/settings/sources", icon: FlaskConical },
  { label: "Settings", to: "/settings/sources", icon: Settings },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="sidebar">
      <div className="brand">BenchPlan AI</div>
      <nav>
        {nav.map((item) => {
          const Icon = item.icon
          const active = location.pathname === item.to
          return (
            <Link key={item.label} to={item.to} className={`nav-item ${active ? "active" : ""}`}>
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
