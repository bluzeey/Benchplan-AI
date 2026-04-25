import { FormEvent, useState } from "react"
import { Paperclip, Send, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  value?: string
  onSubmit: (hypothesis: string) => Promise<void> | void
  isSubmitting?: boolean
  className?: string
}

export function HypothesisInput({
  value = "",
  onSubmit,
  isSubmitting = false,
  className,
}: Props) {
  const [text, setText] = useState(value)
  const trimmedLength = text.trim().length

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (text.trim().length < 10) return
    await onSubmit(text)
  }

  return (
    <form className={cn("w-full", className)} onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-[hsl(217,33%,18%)] bg-[hsl(222,47%,10%)] p-4">
        <textarea
          rows={5}
          className="min-h-[140px] w-full resize-none border-0 bg-transparent text-base leading-relaxed text-white placeholder:text-[hsl(215,20%,45%)] focus:outline-none focus:ring-0"
          placeholder="e.g. Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will..."
          value={text}
          onChange={(event) => setText(event.target.value)}
        />

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Paperclip button */}
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[hsl(215,20%,55%)] transition-colors hover:text-white"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            {/* Deep Research dropdown */}
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-[hsl(217,33%,18%)] bg-[hsl(222,47%,9%)] px-3 py-2 text-sm text-[hsl(215,20%,55%)] transition-colors hover:text-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              Deep Research
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={isSubmitting || trimmedLength < 10}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(199,89%,48%)] text-white transition-all hover:bg-[hsl(199,89%,43%)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
