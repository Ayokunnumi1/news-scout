import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireCurrentBank } from "@/lib/bank-context";
import { logAudit } from "@/lib/db/audit";
import { importContent } from "@/lib/db/content";
import { errorResponse, readJson } from "@/lib/utils/api";
import { AppError } from "@/lib/utils/errors";
import { contentInputSchema, IMPORT_MAX_ROWS, type ContentInput } from "@/lib/validation/schemas";

const bodySchema = z.object({ rows: z.array(z.record(z.string(), z.unknown())).min(1).max(IMPORT_MAX_ROWS) });

/**
 * Bulk import of monitored posts (parsed client-side from JSON or CSV).
 * Every row is validated independently; invalid rows are reported back and
 * valid rows are inserted. Duplicates are skipped.
 */
export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.safeParse(await readJson(request));
    if (!body.success) {
      throw new AppError("VALIDATION", `Provide between 1 and ${IMPORT_MAX_ROWS} rows to import.`);
    }
    const bank = await requireCurrentBank();

    const valid: ContentInput[] = [];
    const invalid: { row: number; errors: string[] }[] = [];
    body.data.rows.forEach((raw, index) => {
      const normalized = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [
          k.trim().toLowerCase(),
          v === null ? undefined : typeof v === "number" ? String(v) : v,
        ]),
      );
      const parsed = contentInputSchema.safeParse(normalized);
      if (parsed.success) valid.push(parsed.data);
      else
        invalid.push({ row: index + 1, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
    });

    const result = valid.length > 0 ? await importContent(bank.id, valid) : { inserted: 0, duplicates: 0 };
    if (result.inserted > 0) {
      await logAudit({
        bankId: bank.id,
        type: "CONTENT_IMPORTED",
        details: { inserted: result.inserted, duplicates: result.duplicates, invalid: invalid.length },
      });
      revalidatePath("/", "layout");
    }
    return Response.json({ ...result, invalid });
  } catch (error) {
    return errorResponse(error, "POST /api/content/import");
  }
}
