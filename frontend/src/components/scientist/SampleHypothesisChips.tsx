import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  onSelect: (value: string) => void
  className?: string
}

const samples = [
  "Paper-based CRP electrochemical biosensor will improve sensitivity by at least 25% compared to colorimetric strips in diluted whole blood.",
  "Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls measured by FITC-dextran.",
  "Trehalose cryoprotectant optimization will increase post-thaw HeLa viability by at least 20% versus DMSO-only control.",
  "Sporomusa ovata in a bioelectrochemical reactor will increase acetate production rate from CO2 by at least 15% under controlled cathode potential.",
]

export function SampleHypothesisChips({ onSelect, className }: Props) {
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-2", className)}>
      {samples.map((sample, index) => (
        <Button
          key={sample}
          type="button"
          variant="outline"
          size="sm"
          className="h-9 max-w-full rounded-full border-primary/20 bg-card/70 px-4 normal-case tracking-normal text-muted-foreground hover:border-primary/40 hover:text-foreground"
          onClick={() => onSelect(sample)}
        >
          <span className="mr-2 text-[10px] uppercase tracking-[0.12em] text-primary/80">S-{String(index + 1).padStart(2, "0")}</span>
          <span className="max-w-[280px] truncate text-left">{sample}</span>
        </Button>
      ))}
    </div>
  )
}
