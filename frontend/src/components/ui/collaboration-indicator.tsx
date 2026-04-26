import { motion } from "framer-motion"
import { Bot, Users, Activity, Wifi, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollaborationIndicatorProps {
  type: "ai" | "user"
  status: "typing" | "active" | "offline" | "idle"
  name?: string
  className?: string
}

export function CollaborationIndicator({
  type,
  status,
  name,
  className,
}: CollaborationIndicatorProps) {
  const Icon = type === "ai" ? Bot : Users

  const statusConfig = {
    typing: {
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/20",
      borderColor: "border-cyan-500/30",
      dotColor: "bg-cyan-400",
      label: type === "ai" ? "AI is typing..." : `${name || "Someone"} is typing...`,
      animate: true,
    },
    active: {
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/20",
      borderColor: "border-emerald-500/30",
      dotColor: "bg-emerald-400",
      label: type === "ai" ? "AI Agent Active" : `${name || "User"} is online`,
      animate: false,
    },
    offline: {
      color: "text-gray-400",
      bgColor: "bg-gray-500/20",
      borderColor: "border-gray-500/30",
      dotColor: "bg-gray-400",
      label: "Offline",
      animate: false,
    },
    idle: {
      color: "text-amber-400",
      bgColor: "bg-amber-500/20",
      borderColor: "border-amber-500/30",
      dotColor: "bg-amber-400",
      label: "Idle",
      animate: false,
    },
  }

  const config = statusConfig[status]

  return (
    <motion.div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border",
        config.bgColor,
        config.borderColor,
        config.color,
        className
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Icon className="h-3.5 w-3.5" />

      {/* Animated dots for typing */}
      {config.animate && status === "typing" ? (
        <div className="flex items-center gap-0.5">
          <motion.span
            className={cn("h-1 w-1 rounded-full", config.dotColor)}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className={cn("h-1 w-1 rounded-full", config.dotColor)}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
          />
          <motion.span
            className={cn("h-1 w-1 rounded-full", config.dotColor)}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      ) : (
        <motion.span
          className={cn("h-2 w-2 rounded-full", config.dotColor)}
          animate={status === "active" ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <span>{config.label}</span>
    </motion.div>
  )
}

// Multi-user presence indicator
interface UserPresenceProps {
  users: Array<{
    id: string
    name: string
    avatar?: string
    status: "active" | "typing" | "idle" | "offline"
  }>
  maxDisplay?: number
  className?: string
}

export function UserPresence({ users, maxDisplay = 3, className }: UserPresenceProps) {
  const activeUsers = users.filter((u) => u.status !== "offline")
  const displayUsers = activeUsers.slice(0, maxDisplay)
  const remainingCount = activeUsers.length - maxDisplay

  if (activeUsers.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <WifiOff className="h-3.5 w-3.5" />
        <span>No active users</span>
      </div>
    )
  }

  return (
    <motion.div
      className={cn("flex items-center gap-2", className)}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: { staggerChildren: 0.05 }
        }
      }}
    >
      <Wifi className="h-3.5 w-3.5 text-emerald-400" />

      <div className="flex -space-x-2">
        {displayUsers.map((user, i) => (
          <motion.div
            key={user.id}
            className={cn(
              "relative h-6 w-6 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white",
              user.status === "typing" && "ring-2 ring-cyan-400 ring-offset-1 ring-offset-background",
              user.status === "active" && "ring-2 ring-emerald-400 ring-offset-1 ring-offset-background",
            )}
            style={{
              background: `hsl(${(i * 60) % 360}, 70%, 50%)`,
              zIndex: maxDisplay - i,
            }}
            variants={{
              hidden: { opacity: 0, scale: 0.8, x: -10 },
              visible: { opacity: 1, scale: 1, x: 0 }
            }}
            whileHover={{ scale: 1.1, zIndex: 10 }}
          >
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}

            {/* Status dot */}
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background",
              user.status === "typing" && "bg-cyan-400",
              user.status === "active" && "bg-emerald-400",
              user.status === "idle" && "bg-amber-400",
            )} />
          </motion.div>
        ))}

        {remainingCount > 0 && (
          <motion.div
            className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground"
            variants={{
              hidden: { opacity: 0, scale: 0.8 },
              visible: { opacity: 1, scale: 1 }
            }}
          >
            +{remainingCount}
          </motion.div>
        )}
      </div>

      <span className="text-xs text-muted-foreground">
        {activeUsers.length} active
      </span>
    </motion.div>
  )
}

// Real-time activity feed
interface ActivityItem {
  id: string
  type: "user_join" | "user_leave" | "ai_update" | "plan_update" | "review_update"
  message: string
  timestamp: string
  user?: {
    name: string
    avatar?: string
  }
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  className?: string
}

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "user_join": return Users
      case "user_leave": return Users
      case "ai_update": return Bot
      case "plan_update": return Activity
      case "review_update": return Activity
      default: return Activity
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {activities.slice(0, 5).map((activity, index) => {
        const Icon = getIcon(activity.type)
        return (
          <motion.div
            key={activity.id}
            className="flex items-center gap-2 text-xs"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full",
              activity.type.includes("ai") && "bg-cyan-500/20 text-cyan-400",
              activity.type.includes("user") && "bg-emerald-500/20 text-emerald-400",
              activity.type.includes("plan") && "bg-purple-500/20 text-purple-400",
              activity.type.includes("review") && "bg-amber-500/20 text-amber-400",
            )}>
              <Icon className="h-3 w-3" />
            </div>
            <span className="text-muted-foreground flex-1">{activity.message}</span>
            <span className="text-muted-foreground/50 text-[10px]">
              {new Date(activity.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
