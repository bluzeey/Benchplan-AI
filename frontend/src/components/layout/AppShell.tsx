import { ReactNode } from "react"
import { useLocation } from "react-router-dom"

import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"

type Props = { children: ReactNode }

export function AppShell({ children }: Props) {
  const location = useLocation()
  const isDashboard = location.pathname === "/dashboard"

  return (
    <div className="flex min-h-screen bg-[hsl(222,47%,7%)]">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        {!isDashboard && <Topbar />}
        {isDashboard ? (
          children
        ) : (
          <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">{children}</div>
          </div>
        )}
      </main>
    </div>
  )
}
