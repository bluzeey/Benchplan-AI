import { z } from "zod"

// Shared ID schema - backend always returns UUIDs as strings
export const IdSchema = z.string()

// Auth Schemas
export const UserSchema = z.object({
  id: IdSchema,
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string(),
})

export type User = z.infer<typeof UserSchema>

export const SignupRequestSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  password_confirm: z.string(),
}).refine((data) => data.password === data.password_confirm, {
  message: "Passwords do not match",
  path: ["password_confirm"],
})

export const LoginRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const AuthResponseSchema = z.object({
  user: UserSchema,
  message: z.string(),
})

// Literature Schemas
export const LiteratureSignalSchema = z.enum(["not_found", "similar_work_exists", "exact_match_found", "inconclusive"])

export const ReferenceSchema = z.object({
  id: IdSchema,
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
  id: IdSchema,
  status: z.string(),
  novelty_signal: LiteratureSignalSchema.nullable(),
  confidence: z.union([z.number(), z.string()]).nullable(),
  summary: z.string().nullable(),
  query_plan: z.record(z.string(), z.any()).optional(),
  references: z.array(ReferenceSchema).default([]),
})

export const QuestionSchema = z.object({
  id: IdSchema,
  project: IdSchema,
  raw_text: z.string(),
  parsed_json: z.record(z.string(), z.any()).default({}),
})

export const ProjectSchema = z.object({
  id: IdSchema,
  title: z.string(),
  domain: z.string().nullable().optional(),
  questions: z.array(QuestionSchema).default([]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const AgentEventSchema = z.object({
  id: IdSchema,
  label: z.string(),
  payload: z.record(z.string(), z.any()),
  created_at: z.string(),
})

export const AgentRunSchema = z.object({
  id: IdSchema,
  run_type: z.string(),
  status: z.string(),
  input_payload: z.record(z.string(), z.any()),
  output_payload: z.record(z.string(), z.any()),
  error_message: z.string().nullable().optional(),
  events: z.array(AgentEventSchema).default([]),
})

export const PlanSectionSchema = z.object({
  id: IdSchema,
  key: z.string(),
  title: z.string(),
  order: z.number(),
  content_markdown: z.string(),
  content_json: z.record(z.string(), z.any()).default({}),
  needs_review: z.boolean(),
})

export const ProtocolStepSchema = z.object({
  id: IdSchema,
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
  id: IdSchema,
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
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const MaterialSchema = z.object({
  id: IdSchema,
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
  id: IdSchema,
  category: z.string(),
  label: z.string(),
  quantity: z.union([z.number(), z.string()]).nullable(),
  unit_cost: z.union([z.number(), z.string()]).nullable(),
  total_cost: z.union([z.number(), z.string()]).nullable(),
  assumptions: z.string(),
})

export const TimelinePhaseSchema = z.object({
  id: IdSchema,
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
  id: IdSchema,
  section_key: z.string(),
  correction_type: z.string(),
  original_text: z.string(),
  corrected_text: z.string(),
  rationale: z.string(),
  severity: z.string(),
  tags: z.array(z.string()),
})

export const ReviewSessionSchema = z.object({
  id: IdSchema,
  status: z.string(),
  overall_rating: z.number().nullable(),
  annotations: z.array(ReviewAnnotationSchema).default([]),
})

export const FeedbackExampleSchema = z.object({
  id: IdSchema,
  domain: z.string(),
  experiment_type: z.string(),
  lesson: z.string(),
})

// Export output types (after transforms) for use in components
export type PlanSection = z.output<typeof PlanSectionSchema>
export type ProtocolStep = z.output<typeof ProtocolStepSchema>
export type Material = z.output<typeof MaterialSchema>
export type BudgetLine = z.output<typeof BudgetLineSchema>
export type TimelinePhase = z.output<typeof TimelinePhaseSchema>
export type ReviewAnnotation = z.output<typeof ReviewAnnotationSchema>
export type Reference = z.output<typeof ReferenceSchema>
// ReviewSession and LiteratureQcRun have default([]) for arrays, so make them required in the types
type _ReviewSession = z.output<typeof ReviewSessionSchema>
export type ReviewSession = Omit<_ReviewSession, "annotations"> & { annotations: ReviewAnnotation[] }
type _LiteratureQcRun = z.output<typeof LiteratureQcRunSchema>
export type LiteratureQcRun = Omit<_LiteratureQcRun, "references"> & { references: Reference[] }
export type Question = z.output<typeof QuestionSchema>
export type Project = z.output<typeof ProjectSchema>
