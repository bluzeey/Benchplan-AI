import { ReactNode, createContext, useContext, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { apiFetch, apiFetchRaw } from "@/lib/api"

const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string(),
})

const AuthResponseSchema = z.object({
  user: UserSchema,
  message: z.string(),
})

export type User = z.infer<typeof UserSchema>

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (data: SignupData) => Promise<void>
  logout: () => Promise<void>
  error: string | null
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
  const navigate = useNavigate()

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await apiFetch("/api/auth/me/", UserSchema)
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

  const login = async (email: string, password: string) => {
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
      setUser(response.user)
      navigate("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
      throw err
    }
  }

  const signup = async (data: SignupData) => {
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
      setUser(response.user)
      navigate("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed")
      throw err
    }
  }

  const logout = async () => {
    try {
      await apiFetchRaw("/api/auth/logout/", { method: "POST" })
    } finally {
      setUser(null)
      navigate("/login")
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
