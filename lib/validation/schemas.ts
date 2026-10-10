import { z } from "zod";
import { ACTION_STATUSES, PLATFORMS, SOURCE_TYPES, TRUST_LEVELS } from "@/types/domain";

// Input validation for every user-supplied value (forms, API bodies, imports).
// React escapes text when rendering; on top of that we strip control
// characters and NULs and normalise whitespace before anything is stored.

export function sanitizeText(value: string): string {
  return (
    value
      .normalize("NFC")
      // Strip C0/C1 control characters except tab/newline/carriage return.
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
      // Strip zero-width / bidi override characters often used to disguise text.
      .replace(/[​-‏‪-‮⁦-⁩﻿]/g, "")
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

const cleanText = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} is required.` })
    .transform(sanitizeText)
    .pipe(
      z
        .string()
        .min(min, min <= 1 ? `${label} is required.` : `${label} must be at least ${min} characters.`)
        .max(max, `${label} must be at most ${max} characters.`),
    );

const optionalText = (max: number, label: string) =>
  z
    .string()
    .optional()
    .transform((v) => sanitizeText(v ?? ""))
    .pipe(z.string().max(max, `${label} must be at most ${max} characters.`));

const optionalHttpUrl = z
  .string()
  .optional()
  .transform((v) => (v ?? "").trim())
  .pipe(
    z.union([
      z.literal(""),
      z.url({ protocol: /^https?$/, error: "Enter a valid http(s) URL." }).max(2000, "URL is too long."),
    ]),
  )
  .transform((v) => (v === "" ? null : v));

export const uuidSchema = z.uuid({ error: "Invalid identifier." });

export const bankInputSchema = z.object({
  name: cleanText(2, 120, "Name"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,60}$/, "Slug may contain lowercase letters, numbers and hyphens (2–60 chars)."),
  description: optionalText(1000, "Description"),
  logo_url: optionalHttpUrl,
});
export type BankInput = z.infer<typeof bankInputSchema>;

export const sourceInputSchema = z.object({
  name: cleanText(2, 200, "Name"),
  source_type: z.enum(SOURCE_TYPES, { error: "Choose a valid source type." }),
  url: optionalHttpUrl,
  content: cleanText(20, 20_000, "Content"),
  trust_level: z.enum(TRUST_LEVELS, { error: "Choose a valid trust level." }),
  active: z.boolean().default(true),
});
export type SourceInput = z.infer<typeof sourceInputSchema>;

const platformSchema = z
  .string({ error: "Platform is required." })
  .trim()
  .toUpperCase()
  .transform((v) => (v === "TWITTER" ? "X" : v))
  .pipe(z.enum(PLATFORMS, { error: `Unsupported platform. Use one of: ${PLATFORMS.join(", ")}.` }));

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ?? "").trim())
  .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Enter a valid date.")
  .refine((v) => v === "" || Date.parse(v) <= Date.now() + 5 * 60_000, "Published date cannot be in the future.")
  .transform((v) => (v === "" ? null : new Date(v).toISOString()));

export const contentInputSchema = z.object({
  platform: platformSchema,
  author: optionalText(200, "Author"),
  author_handle: optionalText(200, "Handle"),
  content: cleanText(10, 10_000, "Post content"),
  source_url: optionalHttpUrl,
  published_at: optionalDate,
  engagement_count: z.coerce
    .number({ error: "Engagement must be a number." })
    .int("Engagement must be a whole number.")
    .min(0, "Engagement cannot be negative.")
    .max(1_000_000_000, "Engagement is unrealistically large.")
    .default(0),
});
export type ContentInput = z.infer<typeof contentInputSchema>;

export const IMPORT_MAX_ROWS = 200;

export const responseEditSchema = z.object({
  public_response: cleanText(20, 1200, "Public response"),
  internal_communication: cleanText(20, 3000, "Internal communication"),
});

export const reviewerSchema = z.object({
  reviewer_name: cleanText(2, 120, "Reviewer name"),
});

export const platformActionUpdateSchema = z.object({
  status: z.enum(ACTION_STATUSES),
  note: optionalText(1000, "Note"),
});

/** Flattens Zod issues into {field: [messages]} for form display. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
