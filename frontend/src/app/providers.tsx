import { QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

import { queryClient } from "./query-client"

type Props = {
  children: ReactNode
}

export function AppProviders({ children }: Props) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
