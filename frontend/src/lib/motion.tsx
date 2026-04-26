import { motion, AnimatePresence, Variants } from "framer-motion"
import { ReactNode } from "react"

// Standard animation variants
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }
  },
  exit: { 
    opacity: 0, 
    y: -8,
    transition: { duration: 0.2 }
  }
}

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }
  },
  exit: { 
    opacity: 0, 
    y: 8,
    transition: { duration: 0.2 }
  }
}

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }
  },
  exit: { 
    opacity: 0, 
    x: 8,
    transition: { duration: 0.2 }
  }
}

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 12 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }
  },
  exit: { 
    opacity: 0, 
    x: -8,
    transition: { duration: 0.2 }
  }
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: [0.175, 0.885, 0.32, 1.275] }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2 }
  }
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }
  },
  exit: { 
    opacity: 0, 
    y: 20,
    transition: { duration: 0.3 }
  }
}

// Stagger children animations
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: [0.175, 0.885, 0.32, 1.275] }
  },
  exit: { 
    opacity: 0, 
    y: -5,
    transition: { duration: 0.2 }
  }
}

// Hover animations
export const hoverLift = {
  rest: { y: 0, transition: { duration: 0.2 } },
  hover: { y: -4, transition: { duration: 0.2, ease: [0.175, 0.885, 0.32, 1.275] } }
}

export const hoverGlow = {
  rest: { 
    boxShadow: "0 0 0 rgba(34, 211, 238, 0)",
    transition: { duration: 0.3 }
  },
  hover: { 
    boxShadow: "0 0 20px rgba(34, 211, 238, 0.3), 0 0 40px rgba(34, 211, 238, 0.2)",
    transition: { duration: 0.3 }
  }
}

export const hoverScale = {
  rest: { scale: 1, transition: { duration: 0.2 } },
  hover: { 
    scale: 1.02, 
    transition: { duration: 0.2, ease: [0.175, 0.885, 0.32, 1.275] } 
  }
}

// Page transition
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
  },
  exit: { 
    opacity: 0, 
    y: -8,
    transition: { duration: 0.2 }
  }
}

// Card hover with neon border effect
export const cardHover = {
  rest: { 
    scale: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    transition: { duration: 0.3 }
  },
  hover: { 
    scale: 1.01,
    borderColor: "rgba(34, 211, 238, 0.5)",
    transition: { duration: 0.3 }
  }
}

// Animated number counter
export const countUp = (value: number, duration: number = 0.5) => ({
  initial: { opacity: 0, scale: 0.8 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration, ease: [0.175, 0.885, 0.32, 1.275] }
  }
})

// Table row stagger
export const tableStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    }
  }
}

export const tableRow: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }
  }
}

// Skeleton shimmer
export const shimmer = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear"
    }
  }
}

// Pulse animation for live indicators
export const pulseIndicator = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

// Typing dots for collaboration indicators
export const typingDots: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.15
    }
  }
}

export const typingDot: Variants = {
  initial: { opacity: 0.3, scale: 0.8 },
  animate: { 
    opacity: [0.3, 1, 0.3], 
    scale: [0.8, 1, 0.8],
    transition: { duration: 1.4, repeat: Infinity }
  }
}

// Modal/Dialog animations
export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
}

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { duration: 0.3, ease: [0.175, 0.885, 0.32, 1.275] }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 10,
    transition: { duration: 0.2 }
  }
}

// Tooltip animations
export const tooltip: Variants = {
  hidden: { 
    opacity: 0, 
    y: 4, 
    scale: 0.95,
    transition: { duration: 0.15 }
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.2, ease: [0.175, 0.885, 0.32, 1.275] }
  },
  exit: { 
    opacity: 0, 
    y: 4, 
    scale: 0.95,
    transition: { duration: 0.15 }
  }
}

// Re-export framer-motion components for convenience
export { motion, AnimatePresence }

// Animated wrapper component
interface AnimatedProps {
  children: ReactNode
  variants?: Variants
  className?: string
  delay?: number
}

export function AnimatedDiv({ children, variants = fadeInUp, className = "", delay = 0 }: AnimatedProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={variants}
      className={className}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </motion.div>
  )
}

// Stagger container component
export function StaggerContainer({ 
  children, 
  className = "",
  delayChildren = 0.1
}: { 
  children: ReactNode
  className?: string
  delayChildren?: number
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.08,
            delayChildren,
          }
        },
        exit: {
          opacity: 0,
          transition: {
            staggerChildren: 0.05,
            staggerDirection: -1
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Stagger item component
export function StaggerItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={staggerItem}
      className={className}
    >
      {children}
    </motion.div>
  )
}
