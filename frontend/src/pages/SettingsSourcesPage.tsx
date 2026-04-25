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
        <div className="metadata-strip">
          <span className="mono">Retrieval channel: multi-source fallback</span>
        </div>
      </section>
      <section className="card">
        <h3>Recent safety triage</h3>
        {safetyQuery.isLoading ? <p className="muted">Loading safety assessments...</p> : null}
        {safetyQuery.error ? <p className="error">{(safetyQuery.error as Error).message}</p> : null}
        {safetyQuery.data?.map((item) => (
          <div key={item.id} className="card compact">
            <p className="mono">{item.state}</p>
            <p>{item.categories.join(", ") || "no categories"}</p>
            <div className="metadata-strip">
              <span className="mono">{item.created_at}</span>
            </div>
          </div>
        ))}
        {!safetyQuery.data?.length ? <p className="muted">No safety assessments available yet.</p> : null}
      </section>
    </div>
  )
}
