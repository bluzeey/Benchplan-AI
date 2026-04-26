import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StrataLogo } from "@/components/ui/strata-logo"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useAuth } from "@/app/auth-provider"
import { ensureCsrfToken } from "@/lib/api"

export function SignupPage() {
  const { signup, error } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    password_confirm: "",
  })

  const displayError = error || formError
  const isDuplicateEmailError = displayError?.toLowerCase().includes("already exists")

  useEffect(() => {
    void ensureCsrfToken()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (formData.password.length < 8) {
      setFormError("Password must be at least 8 characters")
      return
    }

    if (formData.password !== formData.password_confirm) {
      setFormError("Passwords do not match")
      return
    }

    setIsLoading(true)
    try {
      await signup(formData)
      navigate("/dashboard")
    } catch {
      // Error is handled by auth provider
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      {/* Theme toggle */}
      <div className="absolute right-6 top-6">
        <ThemeToggle variant="small" />
      </div>
      
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center text-center">
          <StrataLogo orientation="vertical" markSize={56} wordmarkClassName="text-sm tracking-[0.3em]" />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start planning your experiments with AI
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {displayError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {isDuplicateEmailError ? (
                <div className="flex flex-col gap-2">
                  <span>{displayError}</span>
                  <Link
                    to="/login"
                    className="font-medium text-red-400 underline underline-offset-2 hover:text-red-300"
                  >
                    Go to login
                  </Link>
                </div>
              ) : (
                displayError
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="first_name" className="text-sm font-medium text-foreground">
                First name
              </label>
              <Input
                id="first_name"
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="h-11 border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                placeholder="John"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="last_name" className="text-sm font-medium text-foreground">
                Last name
              </label>
              <Input
                id="last_name"
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="h-11 border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-11 border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="h-11 border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
              placeholder="Minimum 8 characters"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password_confirm" className="text-sm font-medium text-foreground">
              Confirm password
            </label>
            <Input
              id="password_confirm"
              type="password"
              required
              value={formData.password_confirm}
              onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
              className="h-11 border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
              placeholder="Re-enter password"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="h-11 w-full bg-primary font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:opacity-80">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
