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
      <p>Status: {review.status}</p>
      {(review.annotations ?? []).length === 0 ? <p className="muted">No annotations yet.</p> : null}
      {(review.annotations ?? []).map((annotation) => (
        <article key={annotation.id} className="card compact">
          <strong>{annotation.correction_type}</strong>
          <p>{annotation.corrected_text}</p>
          <p className="muted">{annotation.rationale}</p>
        </article>
      ))}
    </section>
  )
}
