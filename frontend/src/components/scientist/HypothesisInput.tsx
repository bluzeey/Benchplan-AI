import { FormEvent, useState } from "react"

type Props = {
  value?: string
  onSubmit: (hypothesis: string) => Promise<void> | void
}

export function HypothesisInput({ value = "", onSubmit }: Props) {
  const [text, setText] = useState(value)
  const [submitting, setSubmitting] = useState(false)

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
      <textarea
        rows={10}
        placeholder="Example: Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls..."
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="actions">
        <button type="submit" disabled={submitting || text.trim().length < 40}>
          {submitting ? "Running..." : "Run Literature QC"}
        </button>
      </div>
    </form>
  )
}
