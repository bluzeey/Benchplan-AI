import { FormEvent, useState } from "react"

type Props = {
  value?: string
  onSubmit: (hypothesis: string) => Promise<void> | void
}

export function HypothesisInput({ value = "", onSubmit }: Props) {
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
    <form className="card" onSubmit={handleSubmit}>
      <h3>Hypothesis input</h3>
      <p className="muted">Use a measurable endpoint, explicit control, and timeline to improve planning quality.</p>
      <textarea
        rows={10}
        placeholder="Example: Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls..."
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="metadata-strip">
        <span className="mono">Character count: {trimmedLength}</span>
        <span className="mono">Minimum required: 40</span>
      </div>
      <div className="actions">
        <button type="submit" disabled={submitting || trimmedLength < 40}>
          {submitting ? "Running..." : "Run Literature QC"}
        </button>
      </div>
    </form>
  )
}
