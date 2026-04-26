import { QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"
import { Toaster } from "sonner"

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
          <Toaster 
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                fontSize: "14px",
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
