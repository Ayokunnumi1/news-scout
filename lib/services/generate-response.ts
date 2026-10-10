import "server-only";
import { generateStructured } from "@/lib/ai/client";
import { responseGenerationSchema } from "@/lib/ai/schemas";
import { logAudit } from "@/lib/db/audit";
import { getInvestigationWithEvidence } from "@/lib/db/investigations";
import { insertResponse } from "@/lib/db/responses";
import { AppError } from "@/lib/utils/errors";
import {
  buildResponseUserPrompt,
  RESPONSE_GENERATION_PROMPT_VERSION,
  RESPONSE_GENERATION_SYSTEM_PROMPT,
} from "@/prompts/response-generation";
import type { Bank, GeneratedResponse } from "@/types/domain";

/**
 * Drafts a public response, internal note and recommended action for an
 * investigation. Only verified (verbatim-quoted) evidence is passed to the
 * model. The draft is saved as DRAFT and is never published automatically.
 */
export async function generateResponse(bank: Bank, investigationId: string, actor: string): Promise<GeneratedResponse> {
  const found = await getInvestigationWithEvidence(bank.id, investigationId);
  if (!found) throw new AppError("NOT_FOUND", "That investigation was not found for the selected institution.");
  const { investigation, evidence, content } = found;

  const verifiedEvidence = evidence
    .filter((e) => e.statement_verified && e.relationship !== "NEUTRAL")
    .map((e) => ({
      source_name: e.source_name,
      relationship: e.relationship,
      relevant_statement: e.relevant_statement,
    }));

  const { data, model } = await generateStructured({
    schema: responseGenerationSchema,
    schemaName: "response_drafts",
    system: RESPONSE_GENERATION_SYSTEM_PROMPT,
    user: buildResponseUserPrompt({
      bankName: bank.name,
      platform: content.platform,
      primaryClaim: investigation.primary_claim,
      classification: investigation.classification,
      confidence: investigation.confidence,
      riskLevel: investigation.risk_level,
      riskScore: investigation.risk_score,
      platformAction: investigation.platform_action,
      reasoningSummary: investigation.reasoning_summary,
      verifiedEvidence,
    }),
  });

  const response = await insertResponse({
    bank_id: bank.id,
    investigation_id: investigation.id,
    public_response: data.public_response,
    internal_communication: data.internal_communication,
    recommended_action: data.recommended_action,
    model,
    prompt_version: RESPONSE_GENERATION_PROMPT_VERSION,
  });

  await logAudit({
    bankId: bank.id,
    investigationId: investigation.id,
    type: "RESPONSE_GENERATED",
    actor,
    details: {
      response_id: response.id,
      model,
      prompt_version: RESPONSE_GENERATION_PROMPT_VERSION,
      verified_evidence_count: verifiedEvidence.length,
      public_response: data.public_response,
    },
  });

  return response;
}
