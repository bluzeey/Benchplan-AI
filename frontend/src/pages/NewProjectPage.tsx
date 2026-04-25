import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"

import { apiFetchRaw } from "@/lib/api"

type NewProjectForm = {
  title?: string
  hypothesis: string
  domain?: "diagnostics" | "cell_biology" | "microbiology" | "animal_model" | "climate" | "chemistry" | "other"
  lab_type?: "academic" | "startup" | "cro" | "pharma" | "unknown"
  country?: string
  currency?: "USD" | "GBP" | "EUR"
  budget_ceiling?: number
  target_duration_weeks?: number
  notes?: string
}

export function NewProjectPage() {
  const navigate = useNavigate()
  const form = useForm<NewProjectForm>({
    defaultValues: {
      title: "New BenchPlan Project",
      domain: "other",
      lab_type: "academic",
      currency: "USD",
    },
  })

  const mutation = useMutation({
    mutationFn: async (payload: NewProjectForm) => {
      const project = await apiFetchRaw("/api/projects/", {
        method: "POST",
        body: JSON.stringify({
          title: payload.title || "BenchPlan Project",
          hypothesis: payload.hypothesis,
          domain: payload.domain,
          currency: payload.currency,
          target_duration_weeks: payload.target_duration_weeks,
          lab_type: payload.lab_type,
        }),
      })
      return project as { id: string }
    },
    onSuccess: (project) => navigate(`/projects/${project.id}`),
  })

  const hypothesis = form.watch("hypothesis") || ""
  const warnings: string[] = []
  if (hypothesis && !/control|compared to|vs\.?/i.test(hypothesis)) warnings.push("No control condition detected.")
  if (hypothesis && !/%|increase|decrease|improve|reduce|measured|assay/i.test(hypothesis)) warnings.push("No measurable outcome detected.")
  if (hypothesis && !/week|day|hour|month|endpoint/i.test(hypothesis)) warnings.push("No duration/endpoint detected.")

  return (
    <div className="stack">
      <div className="card compact">
        <h2>New project wizard</h2>
        <p className="muted">Define a hypothesis and constraints. BenchPlan handles literature retrieval and plan synthesis.</p>
      </div>
      <form
        className="card"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <label>
          Title
          <input {...form.register("title")} />
        </label>
        <label>
          Hypothesis
          <textarea rows={8} {...form.register("hypothesis", { required: true, minLength: 40 })} />
        </label>
        <label>
          Domain
          <select {...form.register("domain")}>
            <option value="diagnostics">diagnostics</option>
            <option value="cell_biology">cell_biology</option>
            <option value="microbiology">microbiology</option>
            <option value="animal_model">animal_model</option>
            <option value="climate">climate</option>
            <option value="chemistry">chemistry</option>
            <option value="other">other</option>
          </select>
        </label>
        <div className="row">
          <label>
            Currency
            <select {...form.register("currency")}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </label>
          <label>
            Target duration (weeks)
            <input type="number" {...form.register("target_duration_weeks", { valueAsNumber: true })} />
          </label>
        </div>
        {warnings.length ? (
          <div className="warning-block">
            {warnings.map((warning) => (
              <p key={warning}>- {warning}</p>
            ))}
          </div>
        ) : null}
        <div className="metadata-strip">
          <span className="mono">Rule checks: control, outcome, endpoint</span>
        </div>
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Create project"}
        </button>
      </form>
      {mutation.error ? <p className="error">{(mutation.error as Error).message}</p> : null}
    </div>
  )
}
