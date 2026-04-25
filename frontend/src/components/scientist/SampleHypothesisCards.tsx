import { cn } from "@/lib/utils"

export type Sample = {
  title: string
  hypothesis: string
  icon: "teal" | "green" | "purple" | "yellow"
}

type Props = {
  samples: Sample[]
  onSelect: (hypothesis: string) => void
  className?: string
}

const iconColors = {
  teal: {
    bg: "bg-teal-500/15",
    text: "text-teal-400",
    border: "border-teal-500/30",
  },
  green: {
    bg: "bg-green-500/15",
    text: "text-green-400",
    border: "border-green-500/30",
  },
  purple: {
    bg: "bg-purple-500/15",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  yellow: {
    bg: "bg-yellow-500/15",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
  },
}

const icons = {
  teal: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  green: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  purple: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  yellow: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}

export function SampleHypothesisCards({ samples, onSelect, className }: Props) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {samples.map((sample, index) => {
        const colors = iconColors[sample.icon]
        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(sample.hypothesis)}
            className="group flex items-start gap-3 rounded-xl border border-[hsl(217,33%,18%)] bg-[hsl(222,47%,9%)] p-4 text-left transition-all hover:border-[hsl(217,33%,25%)] hover:bg-[hsl(222,47%,11%)]"
          >
            <div
              className={cn(
                "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border",
                colors.bg,
                colors.text,
                colors.border
              )}
            >
              {icons[sample.icon]}
            </div>
            <span className="text-sm font-medium leading-snug text-white group-hover:text-[hsl(210,40%,98%)]">
              {sample.title}
            </span>
          </button>
        )
      })}
    </div>
  )
}
