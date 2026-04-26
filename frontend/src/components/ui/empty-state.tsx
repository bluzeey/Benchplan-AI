import { ReactNode } from "react"
import { motion } from "framer-motion"
import { 
  FolderOpen, 
  FileText, 
  FlaskConical, 
  Microscope, 
  Search,
  MessageSquare,
  BarChart3,
  CheckCircle,
  Plus,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { scaleIn, fadeInUp, staggerContainer, staggerItem } from "@/lib/motion"

// SVG Illustrations
const EmptyFolderIllustration = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.path
      d="M20 40C20 34.4772 24.4772 30 30 30H70L90 50H170C175.523 50 180 54.4772 180 60V130C180 135.523 175.523 140 170 140H30C24.4772 140 20 135.523 20 130V40Z"
      fill="url(#folderGradient)"
      fillOpacity="0.1"
      stroke="url(#folderGradient)"
      strokeWidth="2"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 1, ease: "easeInOut" }}
    />
    <motion.path
      d="M70 30L90 50H170"
      stroke="url(#folderGradient)"
      strokeWidth="2"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.8, delay: 0.3, ease: "easeInOut" }}
    />
    <defs>
      <linearGradient id="folderGradient" x1="20" y1="30" x2="180" y2="140" gradientUnits="userSpaceOnUse">
        <stop stopColor="#22d3ee" />
        <stop offset="1" stopColor="#a855f7" />
      </linearGradient>
    </defs>
  </svg>
)

const EmptyDocumentIllustration = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 160 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.rect
      x="20" y="10" width="120" height="180" rx="8"
      fill="url(#docGradient)"
      fillOpacity="0.1"
      stroke="url(#docGradient)"
      strokeWidth="2"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
    />
    <motion.path
      d="M45 50H115M45 80H115M45 110H85"
      stroke="url(#docGradient)"
      strokeWidth="2"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.8, delay: 0.3, ease: "easeInOut" }}
    />
    <motion.circle
      cx="100" cy="150" r="25"
      fill="url(#docGradient)"
      fillOpacity="0.2"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.5, delay: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }}
    />
    <motion.path
      d="M92 150L97 155L108 144"
      stroke="url(#docGradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.4, delay: 0.9, ease: "easeInOut" }}
    />
    <defs>
      <linearGradient id="docGradient" x1="20" y1="10" x2="140" y2="190" gradientUnits="userSpaceOnUse">
        <stop stopColor="#22d3ee" />
        <stop offset="1" stopColor="#a855f7" />
      </linearGradient>
    </defs>
  </svg>
)

const FlaskIllustration = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.path
      d="M45 10L35 50H85L75 10H45Z"
      stroke="url(#flaskGradient2)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="url(#flaskGradient2)"
      fillOpacity="0.1"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    />
    <motion.path
      d="M30 50L20 100C20 112.15 29.85 122 42 122H78C90.15 122 100 112.15 100 100L90 50"
      stroke="url(#flaskGradient2)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="url(#flaskGradient2)"
      fillOpacity="0.05"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1, delay: 0.3, ease: "easeInOut" }}
    />
    <motion.circle
      cx="50" cy="80" r="4"
      fill="url(#flaskGradient2)"
      initial={{ scale: 0 }}
      animate={{ scale: [0, 1.2, 1] }}
      transition={{ duration: 0.5, delay: 1, times: [0, 0.6, 1] }}
    />
    <motion.circle
      cx="70" cy="95" r="3"
      fill="url(#flaskGradient2)"
      initial={{ scale: 0 }}
      animate={{ scale: [0, 1.2, 1] }}
      transition={{ duration: 0.5, delay: 1.2, times: [0, 0.6, 1] }}
    />
    <motion.circle
      cx="60" cy="70" r="2"
      fill="url(#flaskGradient2)"
      initial={{ scale: 0 }}
      animate={{ scale: [0, 1.2, 1] }}
      transition={{ duration: 0.5, delay: 1.4, times: [0, 0.6, 1] }}
    />
    <defs>
      <linearGradient id="flaskGradient2" x1="20" y1="10" x2="100" y2="122" gradientUnits="userSpaceOnUse">
        <stop stopColor="#22d3ee" />
        <stop offset="1" stopColor="#a855f7" />
      </linearGradient>
    </defs>
  </svg>
)

const SearchIllustration = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.circle
      cx="70" cy="70" r="45"
      stroke="url(#searchGradient)"
      strokeWidth="2"
      fill="url(#searchGradient)"
      fillOpacity="0.05"
      initial={{ pathLength: 0, scale: 0.8, opacity: 0 }}
      animate={{ pathLength: 1, scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    />
    <motion.path
      d="M105 105L140 140"
      stroke="url(#searchGradient)"
      strokeWidth="3"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.4, delay: 0.5, ease: "easeInOut" }}
    />
    <motion.path
      d="M55 70H85M70 55V85"
      stroke="url(#searchGradient)"
      strokeWidth="2"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5, delay: 0.8, ease: "easeInOut" }}
    />
    <defs>
      <linearGradient id="searchGradient" x1="20" y1="20" x2="140" y2="140" gradientUnits="userSpaceOnUse">
        <stop stopColor="#22d3ee" />
        <stop offset="1" stopColor="#a855f7" />
      </linearGradient>
    </defs>
  </svg>
)

const MessageIllustration = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.rect
      x="10" y="10" width="140" height="100" rx="12"
      fill="url(#msgGradient)"
      fillOpacity="0.1"
      stroke="url(#msgGradient)"
      strokeWidth="2"
      initial={{ scale: 0.9, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
    />
    <motion.path
      d="M80 110L80 130L60 110"
      fill="url(#msgGradient)"
      fillOpacity="0.1"
      stroke="url(#msgGradient)"
      strokeWidth="2"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.4, ease: "easeInOut" }}
    />
    <motion.path
      d="M35 45H125M35 65H100M35 85H80"
      stroke="url(#msgGradient)"
      strokeWidth="2"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.6, delay: 0.3, staggerChildren: 0.1 }}
    />
    <defs>
      <linearGradient id="msgGradient" x1="10" y1="10" x2="150" y2="130" gradientUnits="userSpaceOnUse">
        <stop stopColor="#22d3ee" />
        <stop offset="1" stopColor="#a855f7" />
      </linearGradient>
    </defs>
  </svg>
)

// Icon mapping
const iconMap = {
  folder: FolderOpen,
  document: FileText,
  flask: FlaskConical,
  microscope: Microscope,
  search: Search,
  message: MessageSquare,
  chart: BarChart3,
  check: CheckCircle,
}

const illustrationMap = {
  folder: EmptyFolderIllustration,
  document: EmptyDocumentIllustration,
  flask: FlaskIllustration,
  search: SearchIllustration,
  message: MessageIllustration,
}

type EmptyStateType = keyof typeof iconMap | keyof typeof illustrationMap

interface EmptyStateProps {
  type?: EmptyStateType
  title?: string
  description?: string
  actionLabel?: string
  actionIcon?: React.ReactNode
  onAction?: () => void
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
  minHeight?: string | number
  children?: ReactNode
}

export function EmptyState({
  type = "folder",
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  secondaryAction,
  className,
  minHeight = "300px",
  children,
}: EmptyStateProps) {
  const Icon = iconMap[type] || FolderOpen
  const Illustration = illustrationMap[type as keyof typeof illustrationMap] || EmptyFolderIllustration

  const defaultTitles: Record<string, string> = {
    folder: "No projects found",
    document: "No plans yet",
    flask: "Start your research",
    microscope: "No experiments yet",
    search: "No results found",
    message: "No reviews yet",
    chart: "No data available",
    check: "All caught up!",
  }

  const defaultDescriptions: Record<string, string> = {
    folder: "Get started by creating your first research project.",
    document: "Create a plan to start documenting your experiments.",
    flask: "Enter a hypothesis to begin your research journey.",
    microscope: "Start analyzing your data and experiments.",
    search: "Try adjusting your search terms or filters.",
    message: "Review your plans to provide scientific feedback.",
    chart: "Collect more data to see analytics insights.",
    check: "You've completed all your tasks.",
  }

  const displayTitle = title || defaultTitles[type] || "Nothing to show"
  const displayDescription = description || defaultDescriptions[type] || ""

  return (
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12",
        "rounded-2xl border border-border/60 bg-gradient-to-b from-card/50 to-card/30",
        className
      )}
      style={{ minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight }}
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <motion.div
        className="relative mb-6"
        variants={scaleIn}
      >
        {/* Background glow */}
        <div className="absolute inset-0 blur-3xl opacity-30">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400/50 to-purple-500/50" />
        </div>
        
        {/* Illustration */}
        <Illustration className="relative w-32 h-32 text-muted-foreground/50" />
      </motion.div>

      <motion.h3
        className="text-lg font-semibold text-foreground mb-2"
        variants={fadeInUp}
      >
        {displayTitle}
      </motion.h3>

      {displayDescription && (
        <motion.p
          className="text-sm text-muted-foreground max-w-sm mb-6"
          variants={fadeInUp}
        >
          {displayDescription}
        </motion.p>
      )}

      {children && (
        <motion.div variants={fadeInUp} className="mb-4">
          {children}
        </motion.div>
      )}

      {(actionLabel || onAction) && (
        <motion.div
          className="flex flex-col sm:flex-row items-center gap-3"
          variants={staggerItem}
        >
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={onAction}
              className="gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90 transition-opacity"
            >
              {actionIcon || <Plus className="h-4 w-4" />}
              {actionLabel || "Get started"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>

          {secondaryAction && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="ghost"
                onClick={secondaryAction.onClick}
                className="text-muted-foreground hover:text-foreground"
              >
                {secondaryAction.label}
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

// Compact empty state for inline use
interface EmptyStateCompactProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyStateCompact({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateCompactProps) {
  return (
    <motion.div
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-muted/30",
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.175, 0.885, 0.32, 1.275] }}
    >
      {icon && (
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && (
        <Button
          variant="ghost"
          size="sm"
          onClick={action.onClick}
          className="flex-shrink-0 gap-1"
        >
          {action.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </motion.div>
  )
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ")
}
