import { ReactNode, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { HelpCircle, X, Info, AlertTriangle, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"
import { tooltip, fadeInUp, scaleIn } from "@/lib/motion"

interface TooltipProps {
  children: ReactNode
  content: ReactNode
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
  delay?: number
  className?: string
  showArrow?: boolean
}

export function Tooltip({
  children,
  content,
  side = "top",
  align = "center",
  delay = 200,
  className,
  showArrow = true,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = () => {
    const id = setTimeout(() => setIsVisible(true), delay)
    setTimeoutId(id)
  }

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId)
    setIsVisible(false)
  }

  const sideClasses = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2",
  }

  const alignClasses = {
    start: side === "top" || side === "bottom" ? "left-0" : "top-0",
    center: side === "top" || side === "bottom" ? "left-1/2 -translate-x-1/2" : "top-1/2 -translate-y-1/2",
    end: side === "top" || side === "bottom" ? "right-0" : "bottom-0",
  }

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-popover",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-popover",
    left: "left-full top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-popover",
    right: "right-full top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-popover",
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={cn(
              "absolute z-50 w-max max-w-xs",
              sideClasses[side],
              alignClasses[align],
              className
            )}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={tooltip}
          >
            <div className="rounded-lg border border-border/80 bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg">
              {content}
            </div>
            {showArrow && (
              <div className={cn("absolute w-0 h-0", arrowClasses[side])} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface HelpTooltipProps {
  content: ReactNode
  className?: string
  iconClassName?: string
}

export function HelpTooltip({ content, className, iconClassName }: HelpTooltipProps) {
  return (
    <Tooltip content={content} className={className}>
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          iconClassName
        )}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
    </Tooltip>
  )
}

interface InfoCardProps {
  title: string
  description: ReactNode
  type?: "info" | "tip" | "warning" | "error"
  className?: string
  onClose?: () => void
}

export function InfoCard({
  title,
  description,
  type = "info",
  className,
  onClose,
}: InfoCardProps) {
  const typeConfig = {
    info: {
      icon: Info,
      gradient: "from-cyan-500/20 to-blue-500/20",
      border: "border-cyan-500/30",
      iconColor: "text-cyan-400",
    },
    tip: {
      icon: Lightbulb,
      gradient: "from-amber-500/20 to-yellow-500/20",
      border: "border-amber-500/30",
      iconColor: "text-amber-400",
    },
    warning: {
      icon: AlertTriangle,
      gradient: "from-orange-500/20 to-red-500/20",
      border: "border-orange-500/30",
      iconColor: "text-orange-400",
    },
    error: {
      icon: X,
      gradient: "from-red-500/20 to-rose-500/20",
      border: "border-red-500/30",
      iconColor: "text-red-400",
    },
  }

  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <motion.div
      className={cn(
        "relative rounded-xl border bg-gradient-to-br p-4",
        config.gradient,
        config.border,
        className
      )}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={scaleIn}
    >
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-black/10 hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <div className="flex gap-3">
        <div className={cn("flex-shrink-0", config.iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-foreground">{title}</h4>
          <div className="text-sm text-muted-foreground mt-1">{description}</div>
        </div>
      </div>
    </motion.div>
  )
}

interface ContextualHelpProps {
  term: string
  explanation: string
  examples?: string[]
  children: ReactNode
  className?: string
}

export function ContextualHelp({
  term,
  explanation,
  examples,
  children,
  className,
}: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <span className={cn("relative inline-block", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2 cursor-help"
      >
        {children}
        <HelpCircle className="h-3 w-3 opacity-50" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={fadeInUp}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-xl border border-border/80 bg-card/95 backdrop-blur-xl p-4 shadow-xl">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h5 className="font-semibold text-sm text-foreground">{term}</h5>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{explanation}</p>
              {examples && examples.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Examples
                  </p>
                  <ul className="space-y-1">
                    {examples.map((example, i) => (
                      <li
                        key={i}
                        className="text-xs text-muted-foreground pl-2 border-l-2 border-cyan-500/30"
                      >
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-card/95" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

interface RichTooltipProps {
  trigger: ReactNode
  title: string
  description?: string
  content?: ReactNode
  footer?: ReactNode
  className?: string
}

export function RichTooltip({
  trigger,
  title,
  description,
  content,
  footer,
  className,
}: RichTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {trigger}
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={cn(
              "absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-3 w-80",
              className
            )}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={fadeInUp}
          >
            <div className="rounded-xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-xl overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-border/50 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
                <h4 className="font-semibold text-sm text-foreground">{title}</h4>
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                )}
              </div>
              
              {/* Content */}
              {content && (
                <div className="p-4">
                  {content}
                </div>
              )}
              
              {/* Footer */}
              {footer && (
                <div className="px-4 py-3 border-t border-border/50 bg-muted/30">
                  {footer}
                </div>
              )}
            </div>
            
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-card/95" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
