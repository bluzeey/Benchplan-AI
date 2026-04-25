import { useQuery } from "@tanstack/react-query"
import { z } from "zod"

import { apiFetch } from "@/lib/api"

const SafetyAssessmentSchema = z.object({
  id: z.string(),
  state: z.string(),
  categories: z.array(z.string()),
  created_at: z.string(),
})

export function SettingsSourcesPage() {
  const safetyQuery = useQuery({
    queryKey: ["safety-assessments"],
    queryFn: () => apiFetch("/api/safety/assessments/", z.array(SafetyAssessmentSchema)),
  })

  return (
    <div className="stack">
      <h2>Source and safety status</h2>
      <section className="card">
        <h3>External sources</h3>
        <ul>
          <li>Semantic Scholar: optional when API key is present</li>
          <li>OpenAlex: active fallback and primary without Semantic key</li>
          <li>PubMed E-utilities: available</li>
          <li>Europe PMC: available</li>
          <li>protocols.io: stubbed in MVP</li>
        </ul>
      </section>
      <section className="card">
        <h3>Recent safety triage</h3>
        {safetyQuery.data?.map((item) => (
          <p key={item.id}>
            {item.state} • {item.categories.join(", ") || "no categories"}
          </p>
        ))}
      </section>
    </div>
  )
}
