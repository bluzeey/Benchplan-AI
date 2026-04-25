import { createBrowserRouter, Navigate } from "react-router-dom"
import { useAuth } from "@/app/auth-provider"

import { AppShell } from "@/components/layout/AppShell"
import { DashboardPage } from "@/pages/DashboardPage"
import { LandingPage } from "@/pages/LandingPage"
import { LoginPage } from "@/pages/LoginPage"
import { NewProjectPage } from "@/pages/NewProjectPage"
import { PlanPage } from "@/pages/PlanPage"
import { ProjectPage } from "@/pages/ProjectPage"
import { ReviewPage } from "@/pages/ReviewPage"
import { RunPage } from "@/pages/RunPage"
import { SettingsSourcesPage } from "@/pages/SettingsSourcesPage"
import { SignupPage } from "@/pages/SignupPage"

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[hsl(222,47%,7%)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[hsl(199,89%,48%)] border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Public only route (redirect if logged in)
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[hsl(222,47%,7%)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[hsl(199,89%,48%)] border-t-transparent" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <PublicOnlyRoute>
        <LandingPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: "/signup",
    element: (
      <PublicOnlyRoute>
        <SignupPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: "/login",
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <AppShell>
          <DashboardPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: "/projects/new",
    element: (
      <ProtectedRoute>
        <AppShell>
          <NewProjectPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: "/projects/:projectId",
    element: (
      <ProtectedRoute>
        <AppShell>
          <ProjectPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: "/runs/:runId",
    element: (
      <ProtectedRoute>
        <AppShell>
          <RunPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: "/plans/:planId",
    element: (
      <ProtectedRoute>
        <AppShell>
          <PlanPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: "/plans/:planId/review",
    element: (
      <ProtectedRoute>
        <AppShell>
          <ReviewPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: "/settings/sources",
    element: (
      <ProtectedRoute>
        <AppShell>
          <SettingsSourcesPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
])
