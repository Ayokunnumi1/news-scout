/**
 * Seeds demo data for the three fictional institutions.
 *
 *   npm run db:seed
 *
 * Idempotent: demo banks (matched by slug) are deleted and recreated, which
 * cascades to all their rows. Banks you created yourself are untouched.
 * Seeded analyses go through the same guardrails + deterministic risk engine
 * as live AI analyses, so their scores are computed, not hand-written.
 */
import { createClient } from "@supabase/supabase-js";
import { finalizeAnalysis, type PromptSource } from "@/lib/analysis/finalize";
import { claimAnalysisSchema } from "@/lib/ai/schemas";
import { contentHash } from "@/lib/utils/hash";
import { CLAIM_ANALYSIS_PROMPT_VERSION } from "@/prompts/claim-analysis";
import { RESPONSE_GENERATION_PROMPT_VERSION } from "@/prompts/response-generation";
import { SEED_BANKS, SEED_POSTS, SEED_SOURCES } from "@/data/seed/demo-data";

const SEED_MODEL = "seed-data";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}. Set it in .env.local (see .env.example).`);
    process.exit(1);
  }
  return value;
}

const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function check<T>(
  promise: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  what: string,
): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  if (data === null) throw new Error(`${what}: no data returned`);
  return data;
}

/** For writes that return no rows (no .select()): only the error matters. */
async function run(promise: PromiseLike<{ error: { message: string } | null }>, what: string): Promise<void> {
  const { error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

async function main() {
  const slugs = SEED_BANKS.map((b) => b.slug);
  await check(supabase.from("banks").delete().in("slug", slugs).select("id"), "remove previous demo banks");

  const bankIds = new Map<string, string>();
  for (const bank of SEED_BANKS) {
    const row = await check<{ id: string }>(
      supabase
        .from("banks")
        .insert({ name: bank.name, slug: bank.slug, description: bank.description, status: "ACTIVE" })
        .select("id")
        .single(),
      `insert bank ${bank.slug}`,
    );
    bankIds.set(bank.key, row.id);
  }

  const sourceIds = new Map<string, string>();
  for (const s of SEED_SOURCES) {
    const row = await check<{ id: string }>(
      supabase
        .from("trusted_sources")
        .insert({
          bank_id: bankIds.get(s.bank),
          name: s.name,
          source_type: s.source_type,
          url: s.url,
          content: s.content,
          trust_level: s.trust_level,
          active: s.active,
          created_at: hoursAgo(40 * 24),
        })
        .select("id")
        .single(),
      `insert source ${s.key}`,
    );
    sourceIds.set(s.key, row.id);
  }

  const problems: string[] = [];
  let analyzed = 0;
  let responses = 0;

  for (const post of SEED_POSTS) {
    const bankId = bankIds.get(post.bank)!;
    const createdAt = hoursAgo(post.hoursAgo);
    const content = await check<{ id: string }>(
      supabase
        .from("monitored_content")
        .insert({
          bank_id: bankId,
          platform: post.platform,
          author: post.author,
          author_handle: post.author_handle,
          content: post.content,
          content_hash: contentHash(post.content),
          source_url: post.source_url,
          published_at: hoursAgo(post.hoursAgo + 1),
          engagement_count: post.engagement_count,
          ingestion_status: "PENDING",
          created_at: createdAt,
        })
        .select("id")
        .single(),
      `insert post ${post.key}`,
    );

    if (!post.analysis) continue;

    // Rebuild the exact source list the live pipeline would send (active sources of this bank).
    const bankSources = SEED_SOURCES.filter((s) => s.bank === post.bank && s.active);
    const promptSources: PromptSource[] = bankSources.map((s, i) => ({
      ref: `S${i + 1}`,
      id: sourceIds.get(s.key)!,
      name: s.name,
      source_type: s.source_type,
      content: s.content,
    }));
    const refByKey = new Map(bankSources.map((s, i) => [s.key, `S${i + 1}`]));

    const output = claimAnalysisSchema.parse({
      ...post.analysis,
      evidence: post.analysis.evidence.map(({ source, ...e }) => ({
        ...e,
        source_ref: refByKey.get(source) ?? source,
      })),
    });
    const final = finalizeAnalysis(output, promptSources, post.engagement_count);
    for (const note of final.guardrail_notes) problems.push(`${post.key}: ${note}`);
    const { evidence, ...fields } = final;

    const investigationId = await check<string>(
      supabase.rpc("record_investigation", {
        p_investigation: {
          ...fields,
          bank_id: bankId,
          content_id: content.id,
          input_content: post.content,
          sources_snapshot: bankSources.map((s, i) => ({
            id: sourceIds.get(s.key),
            ref: `S${i + 1}`,
            name: s.name,
            source_type: s.source_type,
            trust_level: s.trust_level,
            url: s.url,
            included_chars: s.content.length,
            truncated: false,
            status: "INCLUDED",
          })),
          model: SEED_MODEL,
          prompt_version: CLAIM_ANALYSIS_PROMPT_VERSION,
        },
        p_evidence: evidence,
        p_actor: "seed",
      }),
      `record investigation ${post.key}`,
    );
    analyzed++;

    // Backdate the analysis to shortly after the post so dashboards show history.
    const analyzedAt = hoursAgo(Math.max(post.hoursAgo - 1, 0.5));
    await run(
      supabase.from("investigations").update({ created_at: analyzedAt }).eq("id", investigationId),
      "backdate investigation",
    );

    if (post.response) {
      const r = post.response;
      const reviewedAt = hoursAgo(Math.max(post.hoursAgo - 2, 0.25));
      const finalText = r.edited_public_response ?? r.public_response;
      await run(
        supabase.from("responses").insert({
          bank_id: bankId,
          investigation_id: investigationId,
          public_response: finalText,
          original_public_response: r.public_response,
          edited: Boolean(r.edited_public_response),
          internal_communication: r.internal_communication,
          recommended_action: r.recommended_action,
          status: r.status,
          reviewer_name: r.status === "DRAFT" ? null : (r.reviewer ?? "Demo Administrator"),
          reviewed_at: r.status === "DRAFT" ? null : reviewedAt,
          model: SEED_MODEL,
          prompt_version: RESPONSE_GENERATION_PROMPT_VERSION,
          created_at: analyzedAt,
        }),
        `insert response ${post.key}`,
      );
      await run(
        supabase.from("audit_events").insert([
          {
            bank_id: bankId,
            investigation_id: investigationId,
            event_type: "RESPONSE_GENERATED",
            actor: "seed",
            details: { public_response: r.public_response },
            created_at: analyzedAt,
          },
          ...(r.edited_public_response
            ? [
                {
                  bank_id: bankId,
                  investigation_id: investigationId,
                  event_type: "RESPONSE_EDITED",
                  actor: r.reviewer ?? "Demo Administrator",
                  details: { public_response: r.edited_public_response },
                  created_at: reviewedAt,
                },
              ]
            : []),
          ...(r.status !== "DRAFT"
            ? [
                {
                  bank_id: bankId,
                  investigation_id: investigationId,
                  event_type: r.status === "APPROVED" ? "RESPONSE_APPROVED" : "RESPONSE_REJECTED",
                  actor: r.reviewer ?? "Demo Administrator",
                  details: r.status === "APPROVED" ? { approved_text: finalText } : {},
                  created_at: reviewedAt,
                },
              ]
            : []),
        ]),
        `insert response audit ${post.key}`,
      );
      responses++;
    }
  }

  // Note: ANALYSIS_COMPLETED audit rows keep their real insertion time
  // (audit_events is append-only), which is the honest record of when seeding ran.

  console.log(
    `Seeded ${SEED_BANKS.length} banks, ${SEED_SOURCES.length} trusted sources, ${SEED_POSTS.length} monitored posts, ${analyzed} analysed claims, ${responses} responses.`,
  );
  if (problems.length) {
    console.error("\nSeed data did not pass guardrails cleanly:\n" + problems.map((p) => ` - ${p}`).join("\n"));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Seeding failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
