import { ReactNode } from "react"

import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"

type Props = { children: ReactNode }

export function AppShell({ children }: Props) {
  return (
    <div className="shell">
      <Sidebar />
      <main className="main-panel">
        <Topbar />
        <div className="content">
          <div className="stack">{children}</div>
        </div>
      </main>
    </div>
  )
}
