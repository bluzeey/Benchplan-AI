import { FormEvent, useState } from "react"

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
    <form className="card" onSubmit={submit}>
      <h3>Add annotation</h3>
      <label>
        Section
        <input value={sectionKey} onChange={(event) => setSectionKey(event.target.value)} />
      </label>
      <label>
        Correction type
        <select value={correctionType} onChange={(event) => setCorrectionType(event.target.value)}>
          {correctionTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <textarea rows={3} placeholder="Original text" value={originalText} onChange={(event) => setOriginalText(event.target.value)} />
      <textarea rows={3} placeholder="Corrected text" value={correctedText} onChange={(event) => setCorrectedText(event.target.value)} />
      <textarea rows={3} placeholder="Rationale" value={rationale} onChange={(event) => setRationale(event.target.value)} />
      <button type="submit">Save annotation</button>
    </form>
  )
}
