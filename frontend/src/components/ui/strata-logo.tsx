import { useId } from "react"

import { cn } from "@/lib/utils"

type StrataMarkProps = {
  className?: string
  size?: number
  title?: string
}

type StrataLogoProps = {
  className?: string
  markClassName?: string
  markSize?: number
  showWordmark?: boolean
  wordmarkClassName?: string
  orientation?: "horizontal" | "vertical"
}

export function StrataMark({ className, size = 40, title = "STRATA" }: StrataMarkProps) {
  const uid = useId().replace(/:/g, "")
  const clipId = `${uid}-clip`
  const glossId = `${uid}-gloss`
  const rimId = `${uid}-rim`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={className}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="60" cy="60" r="54" />
        </clipPath>
        <radialGradient id={glossId} cx="38%" cy="32%" r="58%">
          <stop offset="0%" stopColor="white" stopOpacity="0.08" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={rimId} cx="50%" cy="50%" r="50%">
          <stop offset="78%" stopColor="transparent" />
          <stop offset="100%" stopColor="#081426" stopOpacity="0.7" />
        </radialGradient>
      </defs>

      <circle cx="60" cy="60" r="54" fill="#0c1d34" />
      <g clipPath={`url(#${clipId})`}>
        <path d="M 0 90 Q 18 86 36 89 Q 54 92 72 88 Q 90 84 120 90 L 120 0 L 0 0 Z" fill="#13305a" />
        <path d="M 0 76 Q 22 72 42 75 Q 60 78 80 73 Q 100 68 120 76 L 120 0 L 0 0 Z" fill="#1d4d8a" />
        <path d="M 0 61 Q 16 57 38 60 Q 58 63 78 58 Q 100 53 120 61 L 120 0 L 0 0 Z" fill="#2b6ab8" />
        <path d="M 0 47 Q 20 43 40 46 Q 62 49 82 44 Q 102 39 120 47 L 120 0 L 0 0 Z" fill="#4488e0" />
        <path d="M 0 32 Q 22 28 44 31 Q 64 34 86 29 Q 104 25 120 32 L 120 0 L 0 0 Z" fill="#60a5fa" />
        <line x1="22" y1="90" x2="22" y2="32" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        <line x1="18" y1="90" x2="26" y2="90" stroke="rgba(255,255,255,0.24)" strokeWidth="1" />
        <line x1="18" y1="76" x2="26" y2="76" stroke="rgba(255,255,255,0.24)" strokeWidth="1" />
        <line x1="18" y1="61" x2="26" y2="61" stroke="rgba(255,255,255,0.24)" strokeWidth="1" />
        <line x1="18" y1="47" x2="26" y2="47" stroke="rgba(255,255,255,0.24)" strokeWidth="1" />
        <line x1="18" y1="32" x2="26" y2="32" stroke="rgba(255,255,255,0.24)" strokeWidth="1" />
      </g>
      <circle cx="60" cy="60" r="54" fill={`url(#${glossId})`} />
      <circle cx="60" cy="60" r="54" fill={`url(#${rimId})`} />
      <circle cx="60" cy="60" r="54" fill="none" stroke="#1a3060" strokeWidth="1.5" />
      <path
        d="M 24 30 A 54 54 0 0 1 80 10"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function StrataLogo({
  className,
  markClassName,
  markSize = 32,
  showWordmark = true,
  wordmarkClassName,
  orientation = "horizontal",
}: StrataLogoProps) {
  return (
    <div
      className={cn(
        "flex items-center",
        orientation === "vertical" ? "flex-col text-center" : "flex-row",
        className
      )}
    >
      <StrataMark size={markSize} className={cn("shrink-0", markClassName)} />
      {showWordmark && (
        <span
          className={cn(
            "font-display text-foreground font-semibold tracking-[0.2em]",
            orientation === "vertical" ? "mt-2" : "ml-2.5",
            wordmarkClassName
          )}
        >
          STRATA
        </span>
      )}
    </div>
  )
}
