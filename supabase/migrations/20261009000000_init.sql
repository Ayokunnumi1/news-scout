-- NewsScout initial schema
-- Multi-tenant: every tenant-owned row carries bank_id. Composite foreign keys
-- (child.bank_id, child.parent_id) -> (parent.bank_id, parent.id) make it
-- impossible at the database level to link rows across institutions.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type bank_status as enum ('ACTIVE', 'INACTIVE');

create type source_type as enum (
  'OFFICIAL_PRESS_RELEASE',
  'OFFICIAL_WEBSITE',
  'REGULATORY_STATEMENT',
  'APPROVED_NEWS_SOURCE',
  'OTHER'
);

create type trust_level as enum ('HIGH', 'MEDIUM', 'LOW');

create type platform as enum ('X', 'FACEBOOK', 'INSTAGRAM', 'NEWS', 'BLOG', 'OTHER');

create type ingestion_status as enum ('PENDING', 'ANALYZING', 'ANALYZED', 'FAILED');

create type claim_classification as enum ('TRUE', 'FALSE', 'MISLEADING', 'UNVERIFIED');

create type risk_level as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

create type evidence_relationship as enum ('SUPPORTS', 'CONTRADICTS', 'NEUTRAL');

create type platform_action as enum (
  'MONITOR',
  'RESPOND',
  'ESCALATE_INTERNALLY',
  'REQUEST_PLATFORM_REVIEW',
  'REPORT_POLICY_VIOLATION',
  'NO_ACTION'
);

create type action_status as enum ('PENDING', 'COMPLETED', 'DISMISSED');

create type response_status as enum ('DRAFT', 'APPROVED', 'REJECTED');

-- ---------------------------------------------------------------------------
-- Shared trigger for updated_at
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Banks (tenants)
-- ---------------------------------------------------------------------------
create table banks (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  description text not null default '',
  logo_url text,
  status bank_status not null default 'ACTIVE',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Trusted sources
-- ---------------------------------------------------------------------------
create table trusted_sources (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references banks (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 200),
  source_type source_type not null,
  url text,
  content text not null default '',
  trust_level trust_level not null default 'HIGH',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bank_id, id)
);

create index trusted_sources_bank_idx on trusted_sources (bank_id, active);

create trigger trusted_sources_updated_at before update on trusted_sources
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Monitored content (posts / articles)
-- ---------------------------------------------------------------------------
create table monitored_content (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references banks (id) on delete cascade,
  platform platform not null,
  author text not null default '',
  author_handle text not null default '',
  content text not null check (char_length(btrim(content)) between 10 and 10000),
  -- sha256 of normalised content; used to reject duplicate submissions per bank
  content_hash text not null,
  source_url text,
  published_at timestamptz,
  engagement_count integer not null default 0 check (engagement_count >= 0),
  ingestion_status ingestion_status not null default 'PENDING',
  ingestion_error text,
  -- Set when an analysis run claims the row; used to reject concurrent duplicate runs
  analysis_started_at timestamptz,
  created_at timestamptz not null default now(),
  unique (bank_id, id),
  unique (bank_id, content_hash)
);

create index monitored_content_bank_created_idx on monitored_content (bank_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Investigations (one AI analysis run of one piece of content)
-- ---------------------------------------------------------------------------
create table investigations (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references banks (id) on delete cascade,
  content_id uuid not null,

  -- Audit snapshot of exactly what the model was shown
  input_content text not null,
  sources_snapshot jsonb not null default '[]'::jsonb,
  model text not null,
  prompt_version text not null,

  -- Claim extraction
  institution text not null,
  primary_claim text not null,
  secondary_claims jsonb not null default '[]'::jsonb,
  entities jsonb not null default '[]'::jsonb,
  financial_impact text not null default '',
  emotional_language jsonb not null default '[]'::jsonb,
  urgency text not null default '',
  misinformation_indicators jsonb not null default '[]'::jsonb,

  -- Verification
  classification claim_classification not null,
  confidence integer not null check (confidence between 0 and 100),
  reasoning_summary text not null,
  observed_facts jsonb not null default '[]'::jsonb,
  ai_inferences jsonb not null default '[]'::jsonb,
  guardrail_notes jsonb not null default '[]'::jsonb,

  -- Deterministic risk engine output
  risk_score integer not null check (risk_score between 0 and 100),
  risk_level risk_level not null,
  risk_factors jsonb not null,

  -- Recommendations
  recommended_action text not null,
  platform_action platform_action not null,
  platform_action_status action_status not null default 'PENDING',
  platform_action_note text,
  platform_action_updated_at timestamptz,
  requires_human_review boolean not null default true,

  created_at timestamptz not null default now(),
  unique (bank_id, id),
  foreign key (bank_id, content_id) references monitored_content (bank_id, id) on delete cascade
);

create index investigations_bank_created_idx on investigations (bank_id, created_at desc);
create index investigations_content_idx on investigations (content_id);

-- ---------------------------------------------------------------------------
-- Evidence items used by an investigation
-- ---------------------------------------------------------------------------
create table evidence_items (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null,
  investigation_id uuid not null,
  -- Nullable: the source may be deleted later; name/type/statement are snapshotted
  source_id uuid,
  source_name text not null,
  source_type source_type not null,
  relevant_statement text not null,
  -- true when relevant_statement was found verbatim in the source content
  statement_verified boolean not null default false,
  relationship evidence_relationship not null,
  summary text not null,
  confidence integer not null check (confidence between 0 and 100),
  created_at timestamptz not null default now(),
  foreign key (bank_id, investigation_id) references investigations (bank_id, id) on delete cascade,
  foreign key (bank_id, source_id) references trusted_sources (bank_id, id) on delete set null (source_id)
);

create index evidence_items_investigation_idx on evidence_items (investigation_id);

-- ---------------------------------------------------------------------------
-- Generated responses (human approval required)
-- ---------------------------------------------------------------------------
create table responses (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null,
  investigation_id uuid not null,
  public_response text not null,
  internal_communication text not null,
  recommended_action text not null,
  -- Original AI text is preserved for audit even after human edits
  original_public_response text not null,
  edited boolean not null default false,
  status response_status not null default 'DRAFT',
  reviewer_name text,
  reviewed_at timestamptz,
  model text not null,
  prompt_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (bank_id, investigation_id) references investigations (bank_id, id) on delete cascade
);

create index responses_bank_idx on responses (bank_id, created_at desc);
create index responses_investigation_idx on responses (investigation_id, created_at desc);

create trigger responses_updated_at before update on responses
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Append-only audit log
-- ---------------------------------------------------------------------------
create table audit_events (
  id bigint generated always as identity primary key,
  bank_id uuid not null references banks (id) on delete cascade,
  investigation_id uuid,
  event_type text not null,
  actor text not null default 'system',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_bank_idx on audit_events (bank_id, created_at desc);
create index audit_events_investigation_idx on audit_events (investigation_id, created_at);

create or replace function prevent_audit_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_events is append-only';
end;
$$;

create trigger audit_events_no_update before update on audit_events
  for each row execute function prevent_audit_mutation();

-- ---------------------------------------------------------------------------
-- Atomic write of one completed analysis: investigation + evidence + content
-- status + audit event, all in a single transaction.
-- ---------------------------------------------------------------------------
create or replace function record_investigation(p_investigation jsonb, p_evidence jsonb, p_actor text)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
  v_bank uuid := (p_investigation ->> 'bank_id')::uuid;
  v_content uuid := (p_investigation ->> 'content_id')::uuid;
begin
  insert into investigations (
    bank_id, content_id, input_content, sources_snapshot, model, prompt_version,
    institution, primary_claim, secondary_claims, entities, financial_impact,
    emotional_language, urgency, misinformation_indicators, classification,
    confidence, reasoning_summary, observed_facts, ai_inferences, guardrail_notes,
    risk_score, risk_level, risk_factors, recommended_action, platform_action,
    requires_human_review
  )
  select
    bank_id, content_id, input_content, sources_snapshot, model, prompt_version,
    institution, primary_claim, secondary_claims, entities, financial_impact,
    emotional_language, urgency, misinformation_indicators, classification,
    confidence, reasoning_summary, observed_facts, ai_inferences, guardrail_notes,
    risk_score, risk_level, risk_factors, recommended_action, platform_action,
    requires_human_review
  from jsonb_populate_record(null::investigations, p_investigation)
  returning id into v_id;

  insert into evidence_items (
    bank_id, investigation_id, source_id, source_name, source_type, relevant_statement,
    statement_verified, relationship, summary, confidence
  )
  select
    v_bank, v_id, e.source_id, e.source_name, e.source_type, e.relevant_statement,
    e.statement_verified, e.relationship, e.summary, e.confidence
  from jsonb_populate_recordset(null::evidence_items, coalesce(p_evidence, '[]'::jsonb)) e;

  update monitored_content
     set ingestion_status = 'ANALYZED', ingestion_error = null, analysis_started_at = null
   where id = v_content and bank_id = v_bank;

  insert into audit_events (bank_id, investigation_id, event_type, actor, details)
  values (
    v_bank, v_id, 'ANALYSIS_COMPLETED', coalesce(p_actor, 'system'),
    jsonb_build_object(
      'content_id', v_content,
      'classification', p_investigation ->> 'classification',
      'confidence', (p_investigation ->> 'confidence')::int,
      'risk_score', (p_investigation ->> 'risk_score')::int,
      'risk_level', p_investigation ->> 'risk_level',
      'evidence_count', jsonb_array_length(coalesce(p_evidence, '[]'::jsonb)),
      'model', p_investigation ->> 'model',
      'prompt_version', p_investigation ->> 'prompt_version'
    )
  );

  return v_id;
end;
$$;

revoke all on function record_investigation(jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function record_investigation(jsonb, jsonb, text) to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- All application access goes through the server using the service role,
-- which bypasses RLS. RLS is enabled with no policies so the public anon key
-- can never read or write tenant data directly.
-- ---------------------------------------------------------------------------
alter table banks enable row level security;
alter table trusted_sources enable row level security;
alter table monitored_content enable row level security;
alter table investigations enable row level security;
alter table evidence_items enable row level security;
alter table responses enable row level security;
alter table audit_events enable row level security;

-- Defence in depth: the public API roles get no table privileges at all.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
