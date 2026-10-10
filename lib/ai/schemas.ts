import { z } from "zod";
import {
  CLASSIFICATIONS,
  EVIDENCE_RELATIONSHIPS,
  IMPACT_LEVELS,
  SEVERITY_LEVELS,
  URGENCY_LEVELS,
} from "@/types/domain";

// Schemas for structured model output. They are sent to the model as a strict
// JSON schema AND re-validated with Zod on the way back; nothing is saved
// unless it passes.
//
// OpenAI strict mode requires every property to be present, so "optional"
// values are expressed as empty strings/arrays rather than omitted keys.

const shortText = z.string().trim().min(1).max(600);
const textList = z.array(z.string().trim().min(1).max(400)).max(12);

const impactSchema = z.object({
  level: z.enum(IMPACT_LEVELS),
  description: z.string().trim().max(400),
});

export const claimAnalysisSchema = z.object({
  institution: z.string().trim().min(1).max(200),
  institution_matches_monitored_bank: z.boolean(),
  primary_claim: shortText,
  secondary_claims: textList,
  entities: textList,
  financial_impact: impactSchema,
  customer_impact: impactSchema,
  claim_severity: z.object({
    level: z.enum(SEVERITY_LEVELS),
    rationale: z.string().trim().max(400),
  }),
  urgency: z.object({
    level: z.enum(URGENCY_LEVELS),
    rationale: z.string().trim().max(400),
  }),
  emotional_language: textList,
  misinformation_indicators: textList,
  observed_facts: textList,
  ai_inferences: textList,
  evidence: z
    .array(
      z.object({
        source_ref: z.string().trim().min(1).max(20),
        relevant_statement: z.string().trim().min(1).max(1000),
        relationship: z.enum(EVIDENCE_RELATIONSHIPS),
        summary: z.string().trim().min(1).max(600),
        confidence: z.number().int().min(0).max(100),
      }),
    )
    .max(12),
  classification: z.enum(CLASSIFICATIONS),
  confidence: z.number().int().min(0).max(100),
  reasoning_summary: z.string().trim().min(1).max(2000),
  recommended_action: z.string().trim().min(1).max(600),
  requires_human_review: z.boolean(),
});

export type ClaimAnalysisOutput = z.infer<typeof claimAnalysisSchema>;

export const responseGenerationSchema = z.object({
  public_response: z.string().trim().min(20).max(1200),
  internal_communication: z.string().trim().min(20).max(3000),
  recommended_action: z.string().trim().min(5).max(800),
});

export type ResponseGenerationOutput = z.infer<typeof responseGenerationSchema>;
