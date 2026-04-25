type Props = {
  citation: string
}

export function CitationPopover({ citation }: Props) {
  return <span className="badge">Citation: {citation}</span>
}
