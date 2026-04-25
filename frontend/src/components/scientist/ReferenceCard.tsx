import { z } from "zod"

import { ReferenceSchema } from "@/lib/schemas"

type Reference = z.infer<typeof ReferenceSchema>

export function ReferenceCard({ reference }: { reference: Reference }) {
  return (
    <article className="card compact">
      <h4>{reference.title}</h4>
      <p className="muted">
        Source: {reference.source} {reference.year ? `• ${reference.year}` : ""}
      </p>
      {reference.why_relevant && <p>{reference.why_relevant}</p>}
      <p className="muted">
        {reference.doi ? `DOI: ${reference.doi}` : ""} {reference.url ? ` ${reference.url}` : ""}
      </p>
    </article>
  )
}
