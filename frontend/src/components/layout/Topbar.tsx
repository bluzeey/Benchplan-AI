import { useLocation } from "react-router-dom"

const routeLabels: Array<{ match: RegExp; label: string }> = [
  { match: /^\/projects\/new/, label: "Project Intake" },
  { match: /^\/projects\//, label: "Project Workspace" },
  { match: /^\/runs\//, label: "Live Agent Run" },
  { match: /^\/plans\/.+\/review/, label: "Scientist Review" },
  { match: /^\/plans\//, label: "Experiment Plan" },
  { match: /^\/settings\//, label: "Sources and Safety" },
]

export function Topbar() {
  const location = useLocation()
  const route = routeLabels.find((item) => item.match.test(location.pathname))?.label ?? "Workspace"

  return (
    <header className="topbar">
      <div className="row topbar-title">
        <div className="dot" />
        <div className="column">
          <span className="topbar-label">Scientific Command Center</span>
          <span className="topbar-route">{route}</span>
        </div>
      </div>
      <div className="topbar-readouts">
        <span className="badge">System nominal</span>
        <span className="badge">AA compliant</span>
      </div>
    </header>
  )
}
