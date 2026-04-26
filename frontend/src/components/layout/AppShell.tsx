import { ReactNode } from "react"
import { useLocation, Outlet } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"

import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"

type Props = { children?: ReactNode }

// Page transition variants
const pageVariants = {
  initial: { 
    opacity: 0, 
    y: 8,
    scale: 0.995
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: { 
      duration: 0.4, 
      ease: "easeOut" as const
    }
  },
  exit: { 
    opacity: 0, 
    y: -8,
    scale: 0.995,
    transition: { 
      duration: 0.2,
      ease: "easeIn" as const
    }
  }
}

// Stagger children for smooth loading
const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
}

export function AppShell({ children }: Props) {
  const location = useLocation()
  const isDashboard = location.pathname === "/dashboard"

  return (
    <div className="flex min-h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col relative">
        {/* Background gradient accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-500/5 to-transparent rounded-full blur-3xl" />
        </div>

        {!isDashboard && <Topbar />}
        
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              className="h-full"
            >
              {isDashboard ? (
                children
              ) : (
                <motion.div
                  className="w-full px-4 py-6 sm:px-6 lg:px-8"
                  variants={containerVariants}
                >
                  <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
                    {children || <Outlet />}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
