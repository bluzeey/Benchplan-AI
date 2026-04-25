import { createBrowserRouter, Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/app/auth-provider"

import { AppShell } from "@/components/layout/AppShell"
import { AnalyticsPage } from "@/pages/AnalyticsPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { LandingPage } from "@/pages/LandingPage"
import { LoginPage } from "@/pages/LoginPage"
import { NewProjectPage } from "@/pages/NewProjectPage"
import { PlansPage } from "@/pages/PlansPage"
import { PlanPage } from "@/pages/PlanPage"
import { ProjectsPage } from "@/pages/ProjectsPage"
import { ProjectPage } from "@/pages/ProjectPage"
import { ReviewsPage } from "@/pages/ReviewsPage"
import { ReviewPage } from "@/pages/ReviewPage"
import { RunPage } from "@/pages/RunPage"
import { SettingsPage } from "@/pages/SettingsPage"
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

// Public only layout - renders immediately, redirects if already logged in
function PublicOnlyLayout() {
  const { isAuthenticated, isLoading } = useAuth()

  // Only redirect if we're sure the user is authenticated (not during initial loading)
  // This lets public pages render immediately without waiting for auth check
  if (!isLoading && isAuthenticated) {
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
      { path: "/projects", element: <ProjectsPage /> },
      { path: "/projects/new", element: <NewProjectPage /> },
      { path: "/projects/:projectId", element: <ProjectPage /> },
      { path: "/runs/:runId", element: <RunPage /> },
      { path: "/plans", element: <PlansPage /> },
      { path: "/plans/:planId", element: <PlanPage /> },
      { path: "/plans/:planId/review", element: <ReviewPage /> },
      { path: "/reviews", element: <ReviewsPage /> },
      { path: "/analytics", element: <AnalyticsPage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/settings/sources", element: <SettingsSourcesPage /> },
    ],
  },
  // Catch-all route: redirect to home
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
])
