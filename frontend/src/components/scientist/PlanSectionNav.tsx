import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Section = {
  id: string
  title: string
}

export function PlanSectionNav({ sections }: { sections: Section[] }) {
  return (
    <Card className="sticky top-24 hidden h-fit rounded-2xl lg:block">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sections</CardTitle>
        <p className="text-sm text-muted-foreground">Jump to generated modules</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {sections.length === 0 ? <p className="font-mono text-xs text-muted-foreground">No structured sections found</p> : null}
        {sections.map((section, index) => (
          <Button key={section.id} asChild variant="outline" className="h-auto w-full justify-start rounded-xl px-3 py-2 text-left text-xs">
            <a href={`#section-${section.id}`}>
              {String(index + 1).padStart(2, "0")} - {section.title}
            </a>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
