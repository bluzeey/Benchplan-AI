type Props = {
  validation: Record<string, unknown>
}

export function ValidationPanel({ validation }: Props) {
  return (
    <div className="card">
      <h3>Validation</h3>
      <pre>{JSON.stringify(validation, null, 2)}</pre>
    </div>
  )
}
