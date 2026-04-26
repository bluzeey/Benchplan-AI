import { ReactNode } from "react"
import { useLocation, Outlet } from "react-router-dom"

import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"

type Props = { children?: ReactNode }

export function AppShell({ children }: Props) {
  const location = useLocation()
  const isDashboard = location.pathname === "/dashboard"

  return (
    <div className="flex min-h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 min-h-0 flex-1 flex-col relative">
        {/* Background gradient accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-500/5 to-transparent rounded-full blur-3xl" />
        </div>

        {!isDashboard && <Topbar />}
        
        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar relative">
          {isDashboard ? (
            children || <Outlet />
          ) : (
            <div className="w-full h-full px-4 py-6 sm:px-6 lg:px-8">
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
                {children || <Outlet />}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
