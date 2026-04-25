export function fmtCurrency(value: number | null | undefined, currency = "USD") {
  if (value == null) return "-"
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value)
}

export function fmtConfidence(value: number | null | undefined) {
  if (value == null) return "-"
  return `${Math.round(value * 100)}%`
}
