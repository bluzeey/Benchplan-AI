import { createBrowserRouter } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { LandingPage } from "@/pages/LandingPage"
import { NewProjectPage } from "@/pages/NewProjectPage"
import { PlanPage } from "@/pages/PlanPage"
import { ProjectPage } from "@/pages/ProjectPage"
import { ReviewPage } from "@/pages/ReviewPage"
import { RunPage } from "@/pages/RunPage"
import { SettingsSourcesPage } from "@/pages/SettingsSourcesPage"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/projects/new",
    element: (
      <AppShell>
        <NewProjectPage />
      </AppShell>
    ),
  },
  {
    path: "/projects/:projectId",
    element: (
      <AppShell>
        <ProjectPage />
      </AppShell>
    ),
  },
  {
    path: "/runs/:runId",
    element: (
      <AppShell>
        <RunPage />
      </AppShell>
    ),
  },
  {
    path: "/plans/:planId",
    element: (
      <AppShell>
        <PlanPage />
      </AppShell>
    ),
  },
  {
    path: "/plans/:planId/review",
    element: (
      <AppShell>
        <ReviewPage />
      </AppShell>
    ),
  },
  {
    path: "/settings/sources",
    element: (
      <AppShell>
        <SettingsSourcesPage />
      </AppShell>
    ),
  },
])
