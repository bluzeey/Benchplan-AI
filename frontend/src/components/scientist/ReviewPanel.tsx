type ReviewSession = {
  status: string
  annotations?: Array<{
    id: string
    correction_type: string
    corrected_text: string
    rationale: string
  }>
}

export function ReviewPanel({ review }: { review: ReviewSession }) {
  return (
    <section className="card">
      <h3>Review annotations</h3>
      <div className="metadata-strip">
        <span className="mono">Status: {review.status}</span>
        <span className="mono">Annotations: {(review.annotations ?? []).length}</span>
      </div>
      {(review.annotations ?? []).length === 0 ? <p className="muted">No annotations yet.</p> : null}
      {(review.annotations ?? []).map((annotation) => (
        <article key={annotation.id} className="card compact">
          <strong className="mono">{annotation.correction_type}</strong>
          <p>{annotation.corrected_text}</p>
          <p className="muted">{annotation.rationale}</p>
        </article>
      ))}
    </section>
  )
}
