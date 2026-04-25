import { Sun, Moon } from "lucide-react"
import { useTheme } from "@/app/theme-provider"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  className?: string
  variant?: "default" | "small" | "sidebar"
}

export function ThemeToggle({ className, variant = "default" }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  if (variant === "sidebar") {
    return (
      <button
        onClick={toggleTheme}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          className
        )}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    )
  }

  if (variant === "small") {
    return (
      <button
        onClick={toggleTheme}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground",
          className
        )}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </button>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
