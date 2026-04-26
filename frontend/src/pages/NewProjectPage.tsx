import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { AlertCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { apiFetchRaw } from "@/lib/api"
import { invalidatePatterns } from "@/lib/query-keys"

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
  const queryClient = useQueryClient()
  const form = useForm<NewProjectForm>({
    defaultValues: {
      title: "New STRATA Project",
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
          title: payload.title || "STRATA Project",
          hypothesis: payload.hypothesis,
          domain: payload.domain,
          currency: payload.currency,
          target_duration_weeks: payload.target_duration_weeks,
          lab_type: payload.lab_type,
        }),
      })
      return project as { id: string }
    },
    onSuccess: (project) => {
      // Invalidate projects list so it appears in sidebar/pages
      queryClient.invalidateQueries({ queryKey: invalidatePatterns.projects.all })
      navigate(`/projects/${project.id}`)
    },
  })

  const hypothesis = form.watch("hypothesis") || ""
  const warnings: string[] = []
  if (hypothesis && !/control|compared to|vs\.?/i.test(hypothesis)) warnings.push("No control condition detected.")
  if (hypothesis && !/%|increase|decrease|improve|reduce|measured|assay/i.test(hypothesis)) warnings.push("No measurable outcome detected.")
  if (hypothesis && !/week|day|hour|month|endpoint/i.test(hypothesis)) warnings.push("No duration/endpoint detected.")

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/70">
        <CardHeader>
          <CardTitle>New project wizard</CardTitle>
          <p className="text-sm text-muted-foreground">Define a hypothesis and constraints. STRATA handles literature retrieval and plan synthesis.</p>
        </CardHeader>
      </Card>

      <Card className="rounded-2xl border-border/70">
        <CardContent className="p-6">
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <label className="space-y-1.5 text-xs text-muted-foreground">
              Title
              <Input {...form.register("title")} />
            </label>
            <label className="space-y-1.5 text-xs text-muted-foreground">
              Hypothesis
              <Textarea rows={8} {...form.register("hypothesis", { required: true, minLength: 40 })} />
            </label>
            <label className="space-y-1.5 text-xs text-muted-foreground">
              Domain
              <select
                {...form.register("domain")}
                className="flex h-11 w-full rounded-xl border border-input bg-card/80 px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <option value="diagnostics">diagnostics</option>
                <option value="cell_biology">cell_biology</option>
                <option value="microbiology">microbiology</option>
                <option value="animal_model">animal_model</option>
                <option value="climate">climate</option>
                <option value="chemistry">chemistry</option>
                <option value="other">other</option>
              </select>
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5 text-xs text-muted-foreground">
                Currency
                <select
                  {...form.register("currency")}
                  className="flex h-11 w-full rounded-xl border border-input bg-card/80 px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </label>
              <label className="space-y-1.5 text-xs text-muted-foreground">
                Target duration (weeks)
                <Input type="number" {...form.register("target_duration_weeks", { valueAsNumber: true })} />
              </label>
            </div>
            {warnings.length ? (
              <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 p-3 text-xs text-amber-200">
                {warnings.map((warning) => (
                  <p key={warning} className="inline-flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    {warning}
                  </p>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
              <span className="font-mono">Rule checks: control, outcome, endpoint</span>
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : "Create project"}
            </Button>
          </form>
          {mutation.error ? <p className="mt-3 text-sm text-destructive">{(mutation.error as Error).message}</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
