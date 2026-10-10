import type { NextRequest } from "next/server";
import { requireCurrentBank } from "@/lib/bank-context";
import { generateResponse } from "@/lib/services/generate-response";
import { errorResponse, readJson } from "@/lib/utils/api";
import { AppError } from "@/lib/utils/errors";
import { enforceAiRateLimit } from "@/lib/utils/rate-limit";
import { uuidSchema } from "@/lib/validation/schemas";

export const maxDuration = 60;

/** Generates a new DRAFT response for an investigation of the selected bank. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/investigations/[id]/responses">) {
  try {
    const { id } = await ctx.params;
    if (!uuidSchema.safeParse(id).success) throw new AppError("NOT_FOUND", "Investigation not found.");
    await readJson(request);

    await enforceAiRateLimit("respond");
    const bank = await requireCurrentBank();
    const response = await generateResponse(bank, id, "Demo Administrator");
    return Response.json({ responseId: response.id }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/investigations/[id]/responses");
  }
}
