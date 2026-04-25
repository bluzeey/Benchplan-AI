import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { FlaskConical, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useAuth } from "@/app/auth-provider"

export function LoginPage() {
  const { login, error } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await login(formData.email, formData.password)
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500">
            <FlaskConical className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue planning experiments
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

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
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="h-11 border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
              placeholder="Enter your password"
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
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-primary hover:opacity-80">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
