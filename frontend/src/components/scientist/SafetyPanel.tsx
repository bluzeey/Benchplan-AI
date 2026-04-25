type Props = {
  risks: unknown[]
}

export function SafetyPanel({ risks }: Props) {
  return (
    <div className="card">
      <h3>Risks & safety</h3>
      <p className="warning">
        This plan is a draft for qualified scientific review. Confirm biosafety, ethics, chemical hygiene, supplier, and institutional requirements before execution.
      </p>
      <pre>{JSON.stringify(risks, null, 2)}</pre>
      <div className="metadata-strip">
        <span className="mono">Risk entries: {risks.length}</span>
        <span>Flag high-risk items for human oversight</span>
      </div>
    </div>
  )
}
