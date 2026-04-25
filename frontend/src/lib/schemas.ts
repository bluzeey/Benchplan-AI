import { z } from "zod"

export const LiteratureSignalSchema = z.enum(["not_found", "similar_work_exists", "exact_match_found", "inconclusive"])

export const ReferenceSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string(),
  year: z.number().nullable(),
  doi: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  relevance_score: z.union([z.number(), z.string()]).nullable().optional(),
  why_relevant: z.string().optional(),
  match_json: z.record(z.string(), z.string()).optional(),
})

export const LiteratureQcRunSchema = z.object({
  id: z.string(),
  status: z.string(),
  novelty_signal: LiteratureSignalSchema.nullable(),
  confidence: z.union([z.number(), z.string()]).nullable(),
  summary: z.string().nullable(),
  query_plan: z.record(z.string(), z.any()).optional(),
  references: z.array(ReferenceSchema).default([]),
})

export const QuestionSchema = z.object({
  id: z.string(),
  project: z.string(),
  raw_text: z.string(),
  parsed_json: z.record(z.string(), z.any()).default({}),
})

export const ProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  domain: z.string().nullable().optional(),
  questions: z.array(QuestionSchema).default([]),
})

export const AgentEventSchema = z.object({
  id: z.string(),
  label: z.string(),
  payload: z.record(z.string(), z.any()),
  created_at: z.string(),
})

export const AgentRunSchema = z.object({
  id: z.string(),
  run_type: z.string(),
  status: z.string(),
  input_payload: z.record(z.string(), z.any()),
  output_payload: z.record(z.string(), z.any()),
  error_message: z.string().nullable().optional(),
  events: z.array(AgentEventSchema).default([]),
})

export const PlanSectionSchema = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string(),
  order: z.number(),
  content_markdown: z.string(),
  content_json: z.record(z.string(), z.any()).default({}),
  needs_review: z.boolean(),
})

export const ProtocolStepSchema = z.object({
  id: z.string(),
  step_number: z.number(),
  title: z.string(),
  description: z.string(),
  duration_minutes: z.number().nullable(),
  critical_parameters: z.array(z.string()),
  equipment: z.array(z.string()),
  expected_output: z.string(),
  citations: z.array(z.string()),
  safety_notes: z.string(),
})

export const ExperimentPlanSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  executive_summary: z.string(),
  estimated_budget_min: z.union([z.number(), z.string()]).nullable(),
  estimated_budget_max: z.union([z.number(), z.string()]).nullable(),
  estimated_duration_weeks_min: z.number().nullable(),
  estimated_duration_weeks_max: z.number().nullable(),
  scientist_review_status: z.string(),
  sections: z.array(PlanSectionSchema).default([]),
  protocol_steps: z.array(ProtocolStepSchema).default([]),
  plan_json: z.record(z.string(), z.any()).default({}),
})

export const MaterialSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  role: z.string().optional(),
  supplier: z.string(),
  catalog_number: z.string(),
  quantity: z.string(),
  estimated_unit_cost: z.union([z.number(), z.string()]).nullable(),
  estimated_total_cost: z.union([z.number(), z.string()]).nullable(),
  lead_time_days_min: z.number().nullable(),
  lead_time_days_max: z.number().nullable(),
  storage_conditions: z.string(),
  needs_supplier_verification: z.boolean(),
})

export const BudgetLineSchema = z.object({
  id: z.string(),
  category: z.string(),
  label: z.string(),
  quantity: z.union([z.number(), z.string()]).nullable(),
  unit_cost: z.union([z.number(), z.string()]).nullable(),
  total_cost: z.union([z.number(), z.string()]).nullable(),
  assumptions: z.string(),
})

export const TimelinePhaseSchema = z.object({
  id: z.string(),
  phase_number: z.number(),
  title: z.string(),
  start_week: z.number(),
  end_week: z.number(),
  dependencies: z.array(z.number()),
  parallelizable: z.boolean(),
  risk_of_delay: z.string(),
  mitigation: z.string(),
})

export const ReviewAnnotationSchema = z.object({
  id: z.string(),
  section_key: z.string(),
  correction_type: z.string(),
  original_text: z.string(),
  corrected_text: z.string(),
  rationale: z.string(),
  severity: z.string(),
  tags: z.array(z.string()),
})

export const ReviewSessionSchema = z.object({
  id: z.string(),
  status: z.string(),
  overall_rating: z.number().nullable(),
  annotations: z.array(ReviewAnnotationSchema).default([]),
})

export const FeedbackExampleSchema = z.object({
  id: z.string(),
  domain: z.string(),
  experiment_type: z.string(),
  lesson: z.string(),
})
