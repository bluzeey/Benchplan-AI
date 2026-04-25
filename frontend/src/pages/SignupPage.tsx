import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { FlaskConical, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/app/auth-provider"

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
    <div className="flex min-h-screen items-center justify-center bg-[hsl(222,47%,7%)] px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500">
            <FlaskConical className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-[hsl(215,20%,55%)]">
            Start planning your experiments with AI
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {(error || formError) && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error || formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="first_name" className="text-sm font-medium text-white">
                First name
              </label>
              <Input
                id="first_name"
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="h-11 border-[hsl(217,33%,18%)] bg-[hsl(222,47%,9%)] text-white placeholder:text-[hsl(215,20%,45%)] focus:border-[hsl(199,89%,48%)] focus:ring-[hsl(199,89%,48%)]"
                placeholder="John"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="last_name" className="text-sm font-medium text-white">
                Last name
              </label>
              <Input
                id="last_name"
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="h-11 border-[hsl(217,33%,18%)] bg-[hsl(222,47%,9%)] text-white placeholder:text-[hsl(215,20%,45%)] focus:border-[hsl(199,89%,48%)] focus:ring-[hsl(199,89%,48%)]"
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-white">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-11 border-[hsl(217,33%,18%)] bg-[hsl(222,47%,9%)] text-white placeholder:text-[hsl(215,20%,45%)] focus:border-[hsl(199,89%,48%)] focus:ring-[hsl(199,89%,48%)]"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-white">
              Password
            </label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="h-11 border-[hsl(217,33%,18%)] bg-[hsl(222,47%,9%)] text-white placeholder:text-[hsl(215,20%,45%)] focus:border-[hsl(199,89%,48%)] focus:ring-[hsl(199,89%,48%)]"
              placeholder="Minimum 8 characters"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password_confirm" className="text-sm font-medium text-white">
              Confirm password
            </label>
            <Input
              id="password_confirm"
              type="password"
              required
              value={formData.password_confirm}
              onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
              className="h-11 border-[hsl(217,33%,18%)] bg-[hsl(222,47%,9%)] text-white placeholder:text-[hsl(215,20%,45%)] focus:border-[hsl(199,89%,48%)] focus:ring-[hsl(199,89%,48%)]"
              placeholder="Re-enter password"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="h-11 w-full bg-[hsl(199,89%,48%)] font-medium text-white hover:bg-[hsl(199,89%,43%)] disabled:opacity-50"
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

          <p className="text-center text-sm text-[hsl(215,20%,55%)]">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-[hsl(199,89%,48%)] hover:text-[hsl(199,89%,60%)]">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
