import { Badge } from "@/components/ui/badge"

type Props = {
  citation: string
}

export function CitationPopover({ citation }: Props) {
  return <Badge variant="default">Citation: {citation}</Badge>
}
