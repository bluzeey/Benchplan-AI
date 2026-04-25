import { FormEvent, useState } from "react"
import { FlaskConical, Mic, Plus, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type Props = {
  value?: string
  onSubmit: (hypothesis: string) => Promise<void> | void
  className?: string
}

export function HypothesisInput({ value = "", onSubmit, className }: Props) {
  const [text, setText] = useState(value)
  const [submitting, setSubmitting] = useState(false)
  const trimmedLength = text.trim().length

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (text.trim().length < 40) return
    setSubmitting(true)
    try {
      await onSubmit(text)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className={cn("w-full", className)} onSubmit={handleSubmit}>
      <div className="rounded-[2rem] border border-border/80 bg-card/85 p-3 shadow-dock backdrop-blur-xl">
        <Textarea
          rows={5}
          className="min-h-[150px] resize-none border-0 bg-transparent text-base leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder="Ask BenchPlan to evaluate your hypothesis, retrieve references, and draft a lab-ready plan..."
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/50 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground">
              <Plus size={16} />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs text-muted-foreground">
              <Sparkles size={14} className="mr-1.5" />
              Extended
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="hidden items-center gap-1 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] text-muted-foreground md:flex">
              <FlaskConical size={12} />
              Min 40 chars
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground">
              <Mic size={15} />
            </Button>
            <Button type="submit" className="h-8 rounded-full px-4 text-xs" disabled={submitting || trimmedLength < 40}>
              {submitting ? "Running..." : "Run QC"}
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between px-2 text-xs text-muted-foreground">
        <span className="font-mono">Chars: {trimmedLength}</span>
        <span className="font-mono">Workflow: input -&gt; QC -&gt; plan</span>
      </div>
    </form>
  )
}
