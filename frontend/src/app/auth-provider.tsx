import { ReactNode, createContext, useContext, useEffect, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { apiFetch, apiFetchRaw, resetCsrfToken } from "@/lib/api"

const UserSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((val) => String(val)),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string(),
})

const AuthResponseSchema = z.object({
  user: UserSchema,
  message: z.string(),
})

export type User = {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<User>
  signup: (data: SignupData) => Promise<User>
  logout: () => Promise<void>
  error: string | null
  setUser: (user: User | null) => void
}

interface SignupData {
  first_name: string
  last_name: string
  email: string
  password: string
  password_confirm: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await apiFetch("/api/auth/me/", UserSchema) as User
        setUser(userData)
      } catch {
        // User is not logged in, that's fine
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string): Promise<User> => {
    setError(null)
    try {
      const response = await apiFetch(
        "/api/auth/login/",
        AuthResponseSchema,
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }
      )
      const user = response.user as User
      setUser(user)
      toast.success("Welcome back!", {
        description: `Logged in as ${user.full_name}`,
      })
      return user
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed"
      setError(message)
      toast.error("Login failed", {
        description: message,
      })
      throw err
    }
  }

  const signup = async (data: SignupData): Promise<User> => {
    setError(null)
    try {
      const response = await apiFetch(
        "/api/auth/signup/",
        AuthResponseSchema,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      )
      const user = response.user as User
      setUser(user)
      toast.success("Account created!", {
        description: `Welcome, ${user.full_name}`,
      })
      return user
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed"
      setError(message)
      toast.error("Signup failed", {
        description: message,
      })
      throw err
    }
  }

  const logout = async () => {
    try {
      await apiFetchRaw("/api/auth/logout/", { method: "POST" })
      toast.success("Logged out", {
        description: "See you next time!",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Logout failed"
      toast.error("Logout failed", {
        description: message,
      })
    } finally {
      setUser(null)
      resetCsrfToken()
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        error,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
