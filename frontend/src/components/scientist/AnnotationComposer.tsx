import { FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  onSubmit: (payload: Record<string, unknown>) => Promise<void> | void
}

const correctionTypes = [
  "wrong_protocol_step",
  "missing_control",
  "unsafe_condition",
  "wrong_reagent",
  "wrong_catalog_number",
  "wrong_concentration",
  "wrong_duration",
  "budget_underestimate",
  "budget_overestimate",
  "timeline_unrealistic",
  "missing_validation",
  "citation_not_relevant",
  "other",
]

export function AnnotationComposer({ onSubmit }: Props) {
  const [sectionKey, setSectionKey] = useState("materials")
  const [correctionType, setCorrectionType] = useState("wrong_catalog_number")
  const [originalText, setOriginalText] = useState("")
  const [correctedText, setCorrectedText] = useState("")
  const [rationale, setRationale] = useState("")

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!correctedText.trim()) return
    await onSubmit({
      section_key: sectionKey,
      correction_type: correctionType,
      original_text: originalText,
      corrected_text: correctedText,
      rationale,
      severity: "high",
      tags: ["scientist-review"],
    })
    setOriginalText("")
    setCorrectedText("")
    setRationale("")
  }

  return (
    <Card className="rounded-2xl border-border/70">
      <CardHeader className="space-y-2">
        <CardTitle>Add annotation</CardTitle>
        <p className="text-sm text-muted-foreground">Capture scientist correction with rationale for auditability.</p>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5 text-xs text-muted-foreground">
              Section
              <Input value={sectionKey} onChange={(event) => setSectionKey(event.target.value)} />
            </label>
            <label className="space-y-1.5 text-xs text-muted-foreground">
              Correction type
              <select
                value={correctionType}
                onChange={(event) => setCorrectionType(event.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-card/80 px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {correctionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Textarea rows={3} placeholder="Original text" value={originalText} onChange={(event) => setOriginalText(event.target.value)} />
          <Textarea rows={3} placeholder="Corrected text" value={correctedText} onChange={(event) => setCorrectedText(event.target.value)} />
          <Textarea rows={3} placeholder="Rationale" value={rationale} onChange={(event) => setRationale(event.target.value)} />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">Severity: high</span>
            <span className="font-mono">Tags: scientist-review</span>
          </div>
          <Button type="submit">Save annotation</Button>
        </form>
      </CardContent>
    </Card>
  )
}
