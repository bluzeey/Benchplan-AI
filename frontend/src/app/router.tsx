import { createBrowserRouter, Navigate, Outlet, useLocation } from "react-router-dom"
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

// Protected layout wrapper - uses Outlet to defer rendering
function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[hsl(222,47%,7%)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[hsl(199,89%,48%)] border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

// Public only layout - redirects to dashboard if logged in
function PublicOnlyLayout() {
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

  return <Outlet />
}

export const router = createBrowserRouter([
  {
    element: <PublicOnlyLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/signup", element: <SignupPage /> },
      { path: "/login", element: <LoginPage /> },
    ],
  },
  {
    element: <ProtectedLayout />,
    children: [
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/projects/new", element: <NewProjectPage /> },
      { path: "/projects/:projectId", element: <ProjectPage /> },
      { path: "/runs/:runId", element: <RunPage /> },
      { path: "/plans/:planId", element: <PlanPage /> },
      { path: "/plans/:planId/review", element: <ReviewPage /> },
      { path: "/settings/sources", element: <SettingsSourcesPage /> },
    ],
  },
])
