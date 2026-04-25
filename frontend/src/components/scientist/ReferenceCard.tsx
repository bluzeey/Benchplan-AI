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
      <div className="metadata-strip">
        {reference.doi ? <span className="mono">DOI: {reference.doi}</span> : <span className="mono">DOI unavailable</span>}
        {reference.url ? (
          <a href={reference.url} target="_blank" rel="noreferrer" className="mono">
            open source
          </a>
        ) : (
          <span className="mono">No external link</span>
        )}
      </div>
    </article>
  )
}
