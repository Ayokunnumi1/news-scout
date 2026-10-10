import "server-only";
import { finalizeAnalysis, type PromptSource } from "@/lib/analysis/finalize";
import { generateStructured } from "@/lib/ai/client";
import { claimAnalysisSchema } from "@/lib/ai/schemas";
import { logAudit } from "@/lib/db/audit";
import { claimForAnalysis, getContent, markAnalysisFailed } from "@/lib/db/content";
import { recordInvestigation } from "@/lib/db/investigations";
import { isAiConfigured } from "@/lib/env";
import { listActiveSources } from "@/lib/db/sources";
import { AppError, toSafeError } from "@/lib/utils/errors";
import {
  buildClaimAnalysisUserPrompt,
  CLAIM_ANALYSIS_PROMPT_VERSION,
  CLAIM_ANALYSIS_SYSTEM_PROMPT,
} from "@/prompts/claim-analysis";
import type { Bank, SourceSnapshot, TrustedSource } from "@/types/domain";

const MAX_CHARS_PER_SOURCE = 6_000;
const MAX_TOTAL_SOURCE_CHARS = 40_000;
const TRUST_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;

/**
 * Full pipeline for one post:
 *   claim extraction → evidence collection → AI verification → classification
 *   → guardrails → deterministic risk score → platform action → persist + audit.
 * Returns the new investigation id.
 */
export async function analyzeContent(bank: Bank, contentId: string, actor: string): Promise<string> {
  // A missing key is a server configuration problem, not a failure of this post:
  // reject before touching the row so its status is left unchanged.
  if (!isAiConfigured()) {
    throw new AppError(
      "AI_NOT_CONFIGURED",
      "AI analysis is not configured. An administrator needs to set OPENAI_API_KEY on the server.",
    );
  }
  const before = await getContent(bank.id, contentId);
  if (!before) throw new AppError("NOT_FOUND", "That post was not found for the selected institution.");

  const content = await claimForAnalysis(bank.id, contentId);

  try {
    const { promptSources, snapshot } = selectSources(await listActiveSources(bank.id));

    const { data, model } = await generateStructured({
      schema: claimAnalysisSchema,
      schemaName: "claim_analysis",
      system: CLAIM_ANALYSIS_SYSTEM_PROMPT,
      user: buildClaimAnalysisUserPrompt({
        bankName: bank.name,
        platform: content.platform,
        author: content.author,
        authorHandle: content.author_handle,
        publishedAt: content.published_at,
        engagementCount: content.engagement_count,
        content: content.content,
        sources: promptSources,
      }),
    });

    const final = finalizeAnalysis(data, promptSources, content.engagement_count);
    const { evidence, ...fields } = final;

    return await recordInvestigation(
      {
        ...fields,
        bank_id: bank.id,
        content_id: content.id,
        input_content: content.content,
        sources_snapshot: snapshot,
        model,
        prompt_version: CLAIM_ANALYSIS_PROMPT_VERSION,
      },
      evidence.map((e) => ({ ...e })),
      actor,
    );
  } catch (error) {
    const safe = toSafeError(error, "analyzeContent");
    await markAnalysisFailed(bank.id, contentId, safe.message, before.ingestion_status);
    await logAudit({
      bankId: bank.id,
      type: "ANALYSIS_FAILED",
      actor,
      details: { content_id: contentId, code: safe.code },
    });
    throw error;
  }
}

/**
 * Chooses which trusted sources to send to the model, highest trust first,
 * within a size budget. Sources with no stored text are reported as
 * unavailable rather than silently ignored.
 */
function selectSources(sources: TrustedSource[]) {
  const sorted = [...sources].sort((a, b) => TRUST_ORDER[a.trust_level] - TRUST_ORDER[b.trust_level]);
  const promptSources: (PromptSource & Pick<TrustedSource, "trust_level" | "url">)[] = [];
  const snapshot: SourceSnapshot[] = [];
  let budget = MAX_TOTAL_SOURCE_CHARS;

  for (const s of sorted) {
    const base = {
      id: s.id,
      name: s.name,
      source_type: s.source_type,
      trust_level: s.trust_level,
      url: s.url,
    };
    const text = s.content.trim();
    if (!text) {
      snapshot.push({ ...base, ref: "", included_chars: 0, truncated: false, status: "UNAVAILABLE" });
      continue;
    }
    if (budget <= 500) {
      snapshot.push({ ...base, ref: "", included_chars: 0, truncated: false, status: "OVER_BUDGET" });
      continue;
    }
    const limit = Math.min(MAX_CHARS_PER_SOURCE, budget);
    const included = text.slice(0, limit);
    budget -= included.length;
    const ref = `S${promptSources.length + 1}`;
    promptSources.push({ ...base, ref, content: included });
    snapshot.push({
      ...base,
      ref,
      included_chars: included.length,
      truncated: included.length < text.length,
      status: "INCLUDED",
    });
  }
  return { promptSources, snapshot };
}
