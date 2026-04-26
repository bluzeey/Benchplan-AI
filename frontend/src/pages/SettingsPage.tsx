import { useNavigate } from "react-router-dom"
import {
  Search,
  Shield,
  Bell,
  User,
  CreditCard,
  ChevronRight,
  ExternalLink,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface SettingsItemProps {
  icon: React.ReactNode
  title: string
  description: string
  to?: string
  onClick?: () => void
  external?: boolean
}

function SettingsItem({ icon, title, description, to, onClick, external }: SettingsItemProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (to) {
      navigate(to)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-card/60 p-4 transition-colors hover:bg-card"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
          {icon}
        </div>
        <div className="text-left">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {external ? (
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  )
}

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-semibold tracking-tight">Settings</h2>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Data & Safety Section */}
        <Card className="rounded-2xl border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Data & Safety</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SettingsItem
              icon={<Search className="h-5 w-5 text-cyan-400" />}
              title="Sources & Safety"
              description="Configure literature sources and safety settings"
              to="/settings/sources"
            />
            <SettingsItem
              icon={<Shield className="h-5 w-5 text-emerald-400" />}
              title="Safety Assessments"
              description="View and manage experiment safety reviews"
              to="/settings/sources"
            />
          </CardContent>
        </Card>

        {/* Account Section */}
        <Card className="rounded-2xl border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SettingsItem
              icon={<User className="h-5 w-5 text-violet-400" />}
              title="Profile"
              description="Manage your account information"
              onClick={() => {}}
            />
            <SettingsItem
              icon={<Bell className="h-5 w-5 text-amber-400" />}
              title="Notifications"
              description="Configure email and in-app notifications"
              onClick={() => {}}
            />
            <SettingsItem
              icon={<CreditCard className="h-5 w-5 text-pink-400" />}
              title="Billing"
              description="Manage subscription and payment methods"
              onClick={() => {}}
            />
          </CardContent>
        </Card>

        {/* About Section */}
        <Card className="rounded-2xl border-border/70 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">STRATA</p>
                <p className="text-sm text-muted-foreground">
                  Research-operations MVP for evidence-grounded experimental planning
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="http://localhost:8000/api/docs/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    API Docs
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="http://localhost:8000/api/schema/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    OpenAPI Schema
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
