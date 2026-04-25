import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Reference } from "@/lib/schemas"

export function ReferenceCard({ reference }: { reference: Reference }) {
  return (
    <Card className="h-full rounded-xl border-border/70">
      <CardHeader className="space-y-2 p-4 pb-0">
        <CardTitle className="text-base leading-snug">{reference.title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Source: {reference.source} {reference.year ? `- ${reference.year}` : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {reference.why_relevant && <p className="text-sm text-muted-foreground">{reference.why_relevant}</p>}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3 text-xs font-mono text-muted-foreground">
          <span>{reference.doi ? `DOI: ${reference.doi}` : "DOI unavailable"}</span>
          {reference.url ? (
            <a href={reference.url} target="_blank" rel="noreferrer" className="text-primary transition-colors hover:text-primary/80">
              open source
            </a>
          ) : (
            <span>No external link</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
