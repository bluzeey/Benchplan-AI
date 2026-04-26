import { useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/ui/theme-toggle"

const routeLabels: Array<{ match: RegExp; label: string; icon?: string }> = [
  { match: /^\/projects\/new/, label: "Project Intake", icon: "📝" },
  { match: /^\/projects\/[^/]+$/, label: "Project Workspace", icon: "🔬" },
  { match: /^\/projects$/, label: "All Projects", icon: "📁" },
  { match: /^\/runs\//, label: "Live Agent Run", icon: "⚡" },
  { match: /^\/plans\/.+\/review/, label: "Scientist Review", icon: "🔍" },
  { match: /^\/plans\/[^/]+$/, label: "Experiment Plan", icon: "📋" },
  { match: /^\/plans$/, label: "All Plans", icon: "📄" },
  { match: /^\/reviews$/, label: "Reviews", icon: "✓" },
  { match: /^\/analytics$/, label: "Analytics", icon: "📊" },
  { match: /^\/settings\/sources/, label: "Sources and Safety", icon: "🔒" },
  { match: /^\/settings$/, label: "Settings", icon: "⚙️" },
]

export function Topbar() {
  const location = useLocation()
  const route = routeLabels.find((item) => item.match.test(location.pathname))
  const routeLabel = route?.label ?? "Workspace"
  const routeIcon = route?.icon ?? "⚡"

  return (
    <motion.header
      className="sticky top-0 z-20 glass border-b border-border/50"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          {/* Status indicator */}
          <motion.div
            className="relative flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 500, damping: 30 }}
          >
            <motion.span
              className="absolute inline-flex h-3 w-3 rounded-full bg-emerald-400"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
              Scientific Command Center
            </p>
            <div className="flex items-center gap-2">
              <span className="text-lg">{routeIcon}</span>
              <p className="text-sm font-display font-semibold text-foreground">
                {routeLabel}
              </p>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status badges */}
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="hidden sm:flex"
            >
              <Badge
                variant="default"
                className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border-emerald-500/30"
              >
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                System Nominal
              </Badge>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="hidden md:flex"
            >
              <Badge
                variant="default"
                className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border-blue-500/30"
              >
                AI Ready
              </Badge>
            </motion.div>

            <ThemeToggle variant="small" />
          </motion.div>
        </div>
      </div>
    </motion.header>
  )
}
