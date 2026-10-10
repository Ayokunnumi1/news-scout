import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireCurrentBank } from "@/lib/bank-context";
import { analyzeContent } from "@/lib/services/analyze-content";
import { errorResponse, readJson } from "@/lib/utils/api";
import { AppError } from "@/lib/utils/errors";
import { enforceAiRateLimit } from "@/lib/utils/rate-limit";

export const maxDuration = 60;

const bodySchema = z.object({ contentId: z.uuid() });

/** Runs the AI analysis pipeline for one monitored post of the selected bank. */
export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await readJson(request));
    if (!parsed.success) throw new AppError("VALIDATION", "A valid contentId is required.");

    await enforceAiRateLimit("analyze");
    const bank = await requireCurrentBank();
    const investigationId = await analyzeContent(bank, parsed.data.contentId, "Demo Administrator");
    return Response.json({ investigationId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/investigations");
  }
}
