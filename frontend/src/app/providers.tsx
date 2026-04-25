import { QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

import { queryClient } from "./query-client"
import { ThemeProvider } from "./theme-provider"
import { AuthProvider } from "./auth-provider"

type Props = {
  children: ReactNode
}

export function AppProviders({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
