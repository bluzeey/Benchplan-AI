type Props = {
  onSelect: (value: string) => void
}

const samples = [
  "Paper-based CRP electrochemical biosensor will improve sensitivity by at least 25% compared to colorimetric strips in diluted whole blood.",
  "Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls measured by FITC-dextran.",
  "Trehalose cryoprotectant optimization will increase post-thaw HeLa viability by at least 20% versus DMSO-only control.",
  "Sporomusa ovata in a bioelectrochemical reactor will increase acetate production rate from CO2 by at least 15% under controlled cathode potential.",
]

export function SampleHypothesisChips({ onSelect }: Props) {
  return (
    <div className="chips">
      {samples.map((sample) => (
        <button key={sample} className="chip" onClick={() => onSelect(sample)}>
          {sample.slice(0, 75)}...
        </button>
      ))}
    </div>
  )
}
