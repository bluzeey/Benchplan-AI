import { ReactNode } from "react"

import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"

type Props = { children: ReactNode }

export function AppShell({ children }: Props) {
  return (
    <div className="grid min-h-screen bg-transparent lg:grid-cols-[260px_1fr]">
      <Sidebar />
      <main className="flex min-w-0 flex-col">
        <Topbar />
        <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">{children}</div>
        </div>
      </main>
    </div>
  )
}
