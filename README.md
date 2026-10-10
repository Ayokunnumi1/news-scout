# NewsScout

AI-assisted misinformation and reputation-risk monitoring for financial institutions.

NewsScout takes a suspicious post or article about a bank, extracts the claim, checks it against that bank's own
trusted sources, and classifies it as **TRUE / FALSE / MISLEADING / UNVERIFIED** with a confidence level. It then
computes a **deterministic reputation-risk score**, recommends a platform action, and drafts an official response.
A person must approve that response before anyone uses it.

```
Suspicious post → claim extraction → evidence collection → AI verification → classification
→ confidence → reputation risk score → recommended action → AI-drafted response → human approval
```

NewsScout never posts to or reports accounts on social platforms. Content is entered manually, imported from
JSON/CSV, or seeded.

---

## Contents

- [Quick start (local)](#quick-start-local)
- [Environment variables](#environment-variables)
- [Database migrations](#database-migrations)
- [Seed data](#seed-data)
- [Production deployment (Vercel + Supabase)](#production-deployment-vercel--supabase)
- [Test credentials](#test-credentials)
- [Architecture](#architecture)
- [How a verdict is reached](#how-a-verdict-is-reached)
- [Scripts](#scripts)
- [Known limitations](#known-limitations)
- [Recommended next production upgrades](#recommended-next-production-upgrades)

---

## Quick start (local)

Prerequisites: **Node.js 20.9+** (22 recommended), **Docker** (for local Supabase), an **OpenAI API key** (optional;
everything except the AI actions works without one).

```bash
npm install
cp .env.example .env.local        # then fill in values (see below)

npm run db:start                  # starts local Supabase in Docker and applies migrations
npm run db:seed                   # loads 3 fictional banks with demo data

npm run dev                       # http://localhost:3000
```

`npm run db:start` prints the local API URL. Local Supabase uses the standard demo service-role key, so for local
development `.env.local` should contain:

```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<"service_role key" printed by `npx supabase status`>
OPENAI_API_KEY=sk-...
```

> To keep the local stack small you can start only what NewsScout needs:
> `npx supabase start -x gotrue,realtime,storage-api,imgproxy,edge-runtime,logflare,vector,supavisor,mailpit,studio,postgres-meta`.
> If you exclude auth, `supabase status` won't print keys. Use the standard local demo service-role JWT from the
> Supabase CLI docs instead.

### Acceptance walkthrough

1. Open the app, then pick an institution in the header switcher.
2. **Trusted sources** → _Add trusted source_ and paste an official statement.
3. **Monitoring** → _Submit suspicious post_ with _Analyse immediately_ on.
4. You land on the investigation: claim, classification, confidence, risk score and factors, evidence, AI analysis
   (observed facts vs inference), and the recommended action.
5. _Generate official response_ → **Edit** → **Approve** (with a reviewer name) → **Copy**.
6. **Dashboard** and **Investigations** show it. Switch institution and it disappears: data is per-institution.

## Environment variables

All variables are **server-side only**. The app has no `NEXT_PUBLIC_*` variables, and no secret reaches the browser.

| Variable                    | Required | Default        | Purpose                                                                                |
| --------------------------- | -------- | -------------- | -------------------------------------------------------------------------------------- |
| `SUPABASE_URL`              | yes      | —              | Supabase project URL                                                                   |
| `SUPABASE_SERVICE_ROLE_KEY` | yes      | —              | Server-side DB access (bypasses RLS; never exposed client-side)                        |
| `OPENAI_API_KEY`            | for AI   | —              | Enables claim analysis and response drafting                                           |
| `OPENAI_MODEL`              | no       | `gpt-4.1-mini` | Any chat-completions model that supports structured outputs (json_schema)              |
| `OPENAI_BASE_URL`           | no       | OpenAI         | OpenAI-compatible endpoint (gateway/proxy)                                             |
| `AI_TIMEOUT_MS`             | no       | `45000`        | Per-call timeout (5–55 s); each request's AI work is capped at 55 s total              |
| `AI_REASONING_EFFORT`       | no       | not sent       | `none`/`minimal`/`low`/`medium`/`high` for reasoning models; use `low` with Gemini 3.x |
| `AI_RATE_LIMIT_PER_MINUTE`  | no       | `10`           | AI requests per client IP per minute                                                   |
| `BASIC_AUTH_USER`           | no       | —              | With `BASIC_AUTH_PASSWORD`, gates the whole app behind HTTP Basic auth                 |
| `BASIC_AUTH_PASSWORD`       | no       | —              | See above. **Strongly recommended for any deployed demo**                              |

Without `OPENAI_API_KEY` the app runs normally and AI actions show a friendly "AI is not configured" message.

### Free option: Google Gemini

NewsScout talks to any OpenAI-compatible endpoint. Gemini has a free tier (a key from
[Google AI Studio](https://aistudio.google.com), no card required):

```bash
OPENAI_API_KEY=<your Gemini API key>
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
OPENAI_MODEL=gemini-3.8-flash
AI_REASONING_EFFORT=low   # default "thinking" took ~85s per analysis; low took 12–28s on the free tier
```

Tested with the strict structured-output schema: replies validate. The free tier is rate-limited, and Google may use
free-tier prompts to improve its products, so use it only with the fictional demo data.

## Database migrations

The schema lives in [`supabase/migrations/`](supabase/migrations/).

- **Local:** `npm run db:start` applies migrations automatically. `npm run db:reset` rebuilds the database from
  scratch (re-run `npm run db:seed` afterwards).
- **Hosted Supabase:**
  ```bash
  npx supabase login
  npx supabase link --project-ref <your-project-ref>
  npm run db:push                 # = supabase db push
  ```
  Alternatively, paste the migration SQL into the Supabase dashboard's SQL editor and run it.

What the migration creates:

- Tables: `banks`, `trusted_sources`, `monitored_content`, `investigations`, `evidence_items`, `responses`, and an
  append-only `audit_events`.
- **Tenant isolation in the schema:** child tables reference parents through composite keys `(bank_id, id)`, so a row
  can never point at another institution's data.
- **RLS enabled with no policies**, and all table privileges revoked from `anon`/`authenticated`. The public anon key
  can read nothing; all access goes through the server.
- `record_investigation(...)`: a transactional function that writes an analysis, its evidence, the content status
  and the audit event atomically.

## Seed data

```bash
npm run db:seed
```

Seeds three **fictional** institutions (Aurelia Trust Bank, Kestrel Federal Savings, Northwind Cooperative Bank) and a
fictional regulator:

- 13 trusted sources (one inactive),
- 24 monitored posts (6 left pending for live demos),
- 18 analysed claims covering TRUE, FALSE, MISLEADING and UNVERIFIED across every risk level,
- 6 responses (approved, draft, rejected, and one edited).

Seeded analyses go through the **same guardrails and deterministic risk engine** as live ones, so their scores are
computed rather than hand-written. The script fails if any seeded quote doesn't appear verbatim in its source.
Re-running is idempotent: demo banks are dropped and recreated, and other banks are untouched.

## Production deployment (Vercel + Supabase)

1. Create a Supabase project and apply the migration (see above). Optionally run the seed against it:
   `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run db:seed`.
2. Import the repository into Vercel (framework preset: Next.js; `vercel.json` is included).
3. Set the environment variables in _Project → Settings → Environment Variables_. At minimum set `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, plus `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`.
4. Deploy. `GET /api/health` reports `{status, database, ai}` for uptime checks and is exempt from Basic auth.

The AI routes declare `maxDuration = 60`. Each AI call is bounded by `AI_TIMEOUT_MS`, and a request never spends more
than 55 s on AI in total (a retry for malformed output only starts if enough of that budget remains).

## Test credentials

There is no user authentication in this MVP: everyone acts as **"Demo Administrator"**, and reviewers type their
name when approving. If you set `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`, those are the credentials for the whole
site.

## Architecture

One Next.js 16 (App Router) application. There are no microservices, no queue, and no LangChain.

```
app/
  (console)/            dashboard, monitoring, investigations, responses, sources, banks, settings
  actions/              server actions (CRUD, approvals); every input re-validated with Zod
  api/                  JSON routes for AI work (rate-limited) + import + health
components/             ui/ (shadcn/ui on Radix), dashboard/, investigations/, monitoring/, sources/, ...
lib/
  ai/                   OpenAI client (strict JSON schema + Zod re-validation), output schemas
  analysis/finalize.ts  guardrails: source/quote verification, verdict downgrades
  scoring/              deterministic risk engine + platform-action matrix
  db/                   data access (every function takes bankId)
  services/             analyze-content and generate-response pipelines
  validation/           Zod input schemas + text sanitisation
prompts/                claim-analysis.ts, response-generation.ts (versioned templates)
data/seed/              fictional demo data
supabase/migrations/    schema
tests/                  unit tests (risk engine, guardrails, schemas)
```

**Multi-tenancy.** The selected institution is stored in an httpOnly cookie and resolved on the server for every
request. Every query is scoped by `bank_id`, and IDs from the client are only looked up inside the current bank. An
ID from another institution simply returns _not found_. The schema enforces the same rule with composite foreign keys.

**Security.** Server-only secrets (`server-only` imports). Zod validation and control/bidi-character stripping on all
input. A same-origin and JSON content-type check on API routes. Parameterised queries via supabase-js. Security
headers. Optional Basic auth. Per-IP AI rate limiting. User-facing errors never include SQL, stack traces or keys;
details go to server logs only.

## How a verdict is reached

1. **Claim analysis prompt** ([`prompts/claim-analysis.ts`](prompts/claim-analysis.ts)) gives the model the post and
   the bank's active trusted sources (labelled `S1…Sn`, highest trust first). It instructs the model to never invent
   evidence, to quote sources verbatim, to separate observed facts from inference, to treat absence of evidence as
   UNVERIFIED rather than FALSE, to acknowledge uncertainty, and to return strict JSON.
2. The reply is validated against a **strict JSON schema** and re-checked with **Zod**. Invalid output is retried once
   and then rejected, and nothing is saved.
3. **Guardrails** ([`lib/analysis/finalize.ts`](lib/analysis/finalize.ts)):
   - evidence citing a source that wasn't supplied is discarded;
   - every quote is checked word-for-word against the stored source text (flagged _Not found verbatim_ if not);
   - FALSE needs a verified contradicting quote, TRUE a verified supporting quote, and MISLEADING at least one verified
     quote. Otherwise the verdict is downgraded to **UNVERIFIED** with confidence capped at 50%.
4. **Risk score** ([`lib/scoring/risk.ts`](lib/scoring/risk.ts)) = Σ(value × weight), from 0 to 100:
   severity 25 · falsity likelihood 20 · virality (log of engagement) 20 · financial impact 15 · customer impact 10 ·
   urgency 10. The AI supplies only ordinal ratings, and the app computes the number. Bands: 0–25 Low · 26–50 Medium ·
   51–75 High · 76–100 Critical.
5. **Platform action** comes from a fixed matrix (classification × risk level). Review or policy reports are only
   suggested for claims that trusted evidence contradicts. Staff carry them out manually and record the outcome.
6. **Response drafting** ([`prompts/response-generation.ts`](prompts/response-generation.ts)) receives only verified
   quotes and is instructed to be factual, concise, non-speculative, non-confrontational and never to admit liability.
   The draft must be approved by a named reviewer, and editing an approved draft returns it to review. The original
   AI text is kept for audit.

Every analysis stores its input, the snapshot of sources sent, the model and prompt versions, the classification,
confidence, evidence, risk factors, responses and reviewer actions, plus an append-only audit trail.

## Scripts

| Command                              | What it does                                         |
| ------------------------------------ | ---------------------------------------------------- |
| `npm run dev`                        | Development server                                   |
| `npm run build` / `npm start`        | Production build / server                            |
| `npm run lint` / `npm run typecheck` | ESLint / strict TypeScript                           |
| `npm test`                           | Unit tests (Vitest)                                  |
| `npm run format` / `format:check`    | Prettier                                             |
| `npm run db:start` / `db:stop`       | Local Supabase                                       |
| `npm run db:reset` / `db:push`       | Rebuild local DB / push migrations to linked project |
| `npm run db:seed`                    | Load demo data                                       |

## Known limitations

- **No user accounts or roles.** The bank switcher is open to anyone who can reach the app (use Basic auth when
  deployed). The schema is multi-tenant-ready, but authorisation per institution isn't implemented.
- **No live ingestion.** Content is manual, imported (JSON/CSV, 200 rows per batch) or seeded, and trusted sources are
  pasted text (URLs are not fetched).
- **Verbatim-quote checking is strict.** If the model reformats a quote, it is flagged even when the meaning matches,
  which may downgrade a verdict to UNVERIFIED. This errs on the side of caution.
- **Large source sets are truncated** (6,000 chars per source, 40,000 in total, highest trust first). Investigations
  record which sources were included, truncated or skipped.
- **Rate limiting is in-memory**, so it applies per server instance.
- Dashboard aggregation runs in application code, which is fine for MVP volumes.
- The interface is in English with UTC timestamps.

## Recommended next production upgrades

1. **Authentication and RBAC** (Supabase Auth or SSO): a membership table that links users to banks, RLS policies keyed
   on `auth.uid()`, and separate _analyst_ and _approver_ roles (four-eyes approval).
2. **Source ingestion:** scheduled fetching of official URLs and platform/news APIs through per-source connectors
   (the `monitored_content.platform` and `trusted_sources.url` fields are ready for this), with a job queue for analysis.
3. **Retrieval for large source libraries:** chunking + pgvector embeddings to select relevant passages instead of
   truncation.
4. **Shared rate limiting and caching** (e.g. Upstash Redis), plus retries with backoff for transient AI errors.
5. **Evaluation harness:** a labelled claim set run in CI against prompt and model changes, tracking accuracy and
   false-FALSE rates.
6. **Alerting** (email/Slack/Teams) for new CRITICAL items, and SLA tracking on approvals and actions.
7. **Observability:** structured logs, OpenTelemetry tracing and error monitoring (e.g. Sentry).
8. **Data retention and export** policies for audit records, plus SQL views/materialised views for analytics at scale.
