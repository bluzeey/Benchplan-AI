import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { PlanSection } from "@/lib/schemas"

interface PlanSectionNavProps {
  sections: Pick<PlanSection, "id" | "title">[]
  activeSectionId?: string | null
  onSectionClick?: (sectionId: string) => void
}

export function PlanSectionNav({ sections, activeSectionId, onSectionClick }: PlanSectionNavProps) {
  const handleClick = (sectionId: string) => {
    if (onSectionClick) {
      onSectionClick(sectionId)
    }
  }

  return (
    <Card className="h-full overflow-y-auto rounded-2xl">
      <CardHeader className="pb-3 shrink-0 sticky top-0 bg-card z-10 border-b border-border/40">
        <CardTitle className="text-base">Sections</CardTitle>
        <p className="text-sm text-muted-foreground">Jump to generated modules</p>
      </CardHeader>
      <CardContent className="space-y-2 pt-4">
        {sections.length === 0 ? <p className="font-mono text-xs text-muted-foreground">No structured sections found</p> : null}
        {sections.map((section, index) => {
          const isActive = activeSectionId === section.id
          return (
            <Button
              key={section.id}
              variant={isActive ? "default" : "outline"}
              onClick={() => handleClick(section.id)}
              className={cn(
                "h-auto w-full justify-start rounded-xl px-3 py-2 text-left text-xs transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/20 border-transparent"
                  : "hover:bg-accent/50 hover:border-cyan-500/30"
              )}
            >
              {String(index + 1).padStart(2, "0")} - {section.title}
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}
