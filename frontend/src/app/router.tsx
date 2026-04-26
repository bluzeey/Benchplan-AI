import { lazy, Suspense } from "react"
import { createBrowserRouter, Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/app/auth-provider"

import { AppShell } from "@/components/layout/AppShell"
import { LandingPage } from "@/pages/LandingPage"
import { LoginPage } from "@/pages/LoginPage"
import { SignupPage } from "@/pages/SignupPage"

// Lazy loaded pages to improve performance
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })))
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then(m => ({ default: m.DashboardPage })))
const NewProjectPage = lazy(() => import("@/pages/NewProjectPage").then(m => ({ default: m.NewProjectPage })))
const PlansPage = lazy(() => import("@/pages/PlansPage").then(m => ({ default: m.PlansPage })))
const PlanPage = lazy(() => import("@/pages/PlanPage").then(m => ({ default: m.PlanPage })))
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage").then(m => ({ default: m.ProjectsPage })))
const ProjectPage = lazy(() => import("@/pages/ProjectPage").then(m => ({ default: m.ProjectPage })))
const ReviewsPage = lazy(() => import("@/pages/ReviewsPage").then(m => ({ default: m.ReviewsPage })))
const ReviewPage = lazy(() => import("@/pages/ReviewPage").then(m => ({ default: m.ReviewPage })))
const RunPage = lazy(() => import("@/pages/RunPage").then(m => ({ default: m.RunPage })))
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then(m => ({ default: m.SettingsPage })))
const SettingsSourcesPage = lazy(() => import("@/pages/SettingsSourcesPage").then(m => ({ default: m.SettingsSourcesPage })))

const LoadingPage = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
)

// Protected layout wrapper - uses Outlet to defer rendering
function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return (
    <AppShell>
      <Suspense fallback={<LoadingPage />}>
        <Outlet />
      </Suspense>
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
