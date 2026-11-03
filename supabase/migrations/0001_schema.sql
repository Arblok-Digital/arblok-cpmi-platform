-- ARBLOK CPMI Platform — core schema (pilot)
-- Mirrors src/lib/types.ts. Tenant-aware since day one.
-- Safe to run on Supabase (auth schema already exists) and on plain PostgreSQL
-- once the auth shim from the test bootstrap is present.

create schema if not exists app;

-- ---------------------------------------------------------------------------
-- Reference codes
-- ---------------------------------------------------------------------------

create sequence if not exists referral_code_seq;
create sequence if not exists candidate_code_seq;
create sequence if not exists complaint_code_seq;
create sequence if not exists ledger_code_seq;
create sequence if not exists payment_code_seq;

create or replace function app.next_code(prefix text, seq regclass, pad int)
returns text
language plpgsql
as $$
begin
  return prefix || lpad(nextval(seq)::text, pad, '0');
end;
$$;

create or replace function app.normalize_phone(p text)
returns text
language sql
immutable
as $$
  select case
    when digits = '' then ''
    when left(digits, 1) = '0' then '62' || substr(digits, 2)
    when left(digits, 1) = '8' then '62' || digits
    else digits
  end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as digits) s;
$$;

create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Identity and tenancy
-- ---------------------------------------------------------------------------

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  short_name text not null,
  slug text not null unique,
  status text not null default 'onboarding'
    check (status in ('active', 'onboarding', 'suspended')),
  city text,
  province text,
  joined_at timestamptz not null default now(),
  plan text not null default 'pilot',
  contact_email text,
  quota jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  phone text,
  email text,
  status text not null default 'active'
    check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in (
    'arblok_admin', 'p3mi_admin', 'p3mi_reviewer', 'agent_coordinator', 'agent', 'cpmi'
  )),
  status text not null default 'active'
    check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists organization_memberships_user_idx
  on public.organization_memberships (user_id, status);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  code text not null,
  region text not null,
  phone text,
  status text not null default 'pending'
    check (status in ('active', 'pending', 'inactive')),
  coordinator_id uuid references public.agents (id) on delete set null,
  joined_at timestamptz not null default now(),
  agreement_number text,
  agreement_valid_until date,
  note text,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create unique index if not exists agents_org_user_idx
  on public.agents (organization_id, user_id)
  where user_id is not null;

create index if not exists agents_coordinator_idx
  on public.agents (coordinator_id);

create table if not exists public.agent_agreements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  agent_id uuid not null references public.agents (id) on delete restrict,
  agreement_number text not null,
  valid_from date not null,
  valid_until date,
  storage_path text,
  status text not null default 'active'
    check (status in ('draft', 'active', 'ended')),
  created_at timestamptz not null default now(),
  unique (organization_id, agreement_number)
);

-- ---------------------------------------------------------------------------
-- Vacancies
-- ---------------------------------------------------------------------------

create table if not exists public.job_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  reference_code text not null,
  country text not null,
  sector text not null,
  employer_label text not null,
  status text not null default 'draft'
    check (status in ('draft', 'verified', 'closed')),
  verified_at timestamptz,
  source_document_id uuid,
  created_at timestamptz not null default now(),
  unique (organization_id, reference_code)
);

create table if not exists public.vacancies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  job_order_id uuid not null references public.job_orders (id) on delete restrict,
  title text not null,
  country text not null,
  sector text not null,
  requirements text[] not null default '{}',
  wage_currency text not null default 'IDR',
  wage_min numeric(14, 2),
  wage_max numeric(14, 2),
  wage_type text not null default 'bulanan'
    check (wage_type in ('bulanan', 'per jam')),
  published_at timestamptz,
  status text not null default 'draft'
    check (status in ('published', 'draft', 'closed')),
  slots int not null default 0 check (slots >= 0),
  created_at timestamptz not null default now()
);

create index if not exists vacancies_org_status_idx
  on public.vacancies (organization_id, status);

-- ---------------------------------------------------------------------------
-- Candidates, consents, referrals
-- ---------------------------------------------------------------------------

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  account_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  nickname text,
  phone text not null,
  phone_normalized text not null,
  birth_date date,
  gender text check (gender in ('P', 'L')),
  education text,
  region text not null,
  address text,
  status text not null default 'lead_registered' check (status in (
    'lead_registered', 'referral_acknowledged', 'office_visit_confirmed',
    'initial_verification', 'candidate_screening', 'job_matching',
    'overseas_partner_review', 'employer_selection', 'employer_approved',
    'placement_agreement', 'employment_contract', 'visa_work_permit',
    'pre_departure', 'departure_approved', 'departed', 'arrived',
    'employer_handover', 'working', 'monitoring'
  )),
  branch_status text check (branch_status in (
    'on_hold', 'revision_required', 'rejected', 'withdrawn', 'closed'
  )),
  branch_reason text,
  agent_id uuid references public.agents (id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid,
  source text not null default 'agent'
    check (source in ('agent', 'p3mi', 'walk_in')),
  internal_note text,
  last_activity_at timestamptz not null default now(),
  candidate_code text not null unique
);

create index if not exists candidates_org_status_idx
  on public.candidates (organization_id, status, last_activity_at desc);
create index if not exists candidates_agent_idx
  on public.candidates (agent_id);
create index if not exists candidates_org_phone_idx
  on public.candidates (organization_id, phone_normalized);

create table if not exists public.candidate_consents (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  consent_type text not null check (consent_type in ('data_processing', 'data_sharing')),
  purpose text not null,
  recipient text not null,
  notice_version text not null,
  consented_at timestamptz not null default now(),
  revoked_at timestamptz,
  evidence text not null,
  recorded_by uuid,
  created_at timestamptz not null default now(),
  unique (candidate_id, consent_type, notice_version)
);

create index if not exists candidate_consents_candidate_idx
  on public.candidate_consents (candidate_id);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete restrict,
  agent_id uuid not null references public.agents (id) on delete restrict,
  vacancy_id uuid references public.vacancies (id) on delete set null,
  code text not null unique,
  submitted_at timestamptz,
  accepted_at timestamptz,
  decided_at timestamptz,
  status text not null default 'submitted' check (status in (
    'draft', 'submitted', 'accepted', 'rejected', 'disputed', 'withdrawn'
  )),
  rejection_reason text,
  duplicate_of_id uuid references public.candidates (id) on delete set null,
  duplicate_warning boolean not null default false,
  attribution_locked boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists referrals_candidate_open_idx
  on public.referrals (candidate_id)
  where status in ('submitted', 'accepted', 'disputed');

create index if not exists referrals_org_status_idx
  on public.referrals (organization_id, status, submitted_at desc);
create index if not exists referrals_agent_idx
  on public.referrals (agent_id);

create table if not exists public.referral_events (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals (id) on delete cascade,
  event_type text not null check (event_type in (
    'submitted', 'duplicate_warning', 'accepted', 'rejected', 'disputed',
    'withdrawn', 'source_locked'
  )),
  actor_user_id uuid,
  actor_name text,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists referral_events_referral_idx
  on public.referral_events (referral_id, created_at desc);

create table if not exists public.referral_disputes (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  opened_by uuid,
  reason text not null,
  evidence_path text,
  status text not null default 'open'
    check (status in ('open', 'resolved', 'rejected')),
  resolved_by uuid,
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Visits and handovers
-- ---------------------------------------------------------------------------

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  referral_id uuid references public.referrals (id) on delete set null,
  scheduled_at timestamptz not null,
  location_label text not null,
  status text not null default 'proposed'
    check (status in ('proposed', 'confirmed', 'attended', 'no_show', 'cancelled')),
  confirmed_by uuid,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists visits_org_schedule_idx
  on public.visits (organization_id, scheduled_at);

create table if not exists public.handovers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  referral_id uuid not null references public.referrals (id) on delete restrict,
  from_agent_id uuid not null references public.agents (id) on delete restrict,
  received_by uuid,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  proof_reference text,
  notes text,
  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create index if not exists handovers_org_status_idx
  on public.handovers (organization_id, status);

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------

create table if not exists public.candidate_documents (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  document_type text not null check (document_type in (
    'ktp', 'kartu_keluarga', 'ijazah', 'skck', 'paspor', 'foto', 'sertifikat'
  )),
  file_name text not null,
  storage_path text not null,
  mime_type text not null check (mime_type in (
    'application/pdf', 'image/jpeg', 'image/png'
  )),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 3145728),
  sha256 text,
  version int not null check (version > 0),
  status text not null default 'pending_review' check (status in (
    'uploaded', 'pending_review', 'approved', 'revision_required', 'rejected'
  )),
  uploaded_by uuid,
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz,
  is_dummy boolean not null default true,
  unique (candidate_id, document_type, version)
);

create index if not exists candidate_documents_org_status_idx
  on public.candidate_documents (organization_id, status, uploaded_at desc);

create table if not exists public.document_reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.candidate_documents (id) on delete cascade,
  reviewer_user_id uuid,
  reviewer_name text,
  decision text not null check (decision in ('approved', 'revision_required', 'rejected')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists document_reviews_document_idx
  on public.document_reviews (document_id, created_at desc);

create table if not exists public.candidate_status_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_user_id uuid,
  actor_name text,
  reason text,
  visibility text not null default 'candidate'
    check (visibility in ('internal', 'candidate')),
  created_at timestamptz not null default now()
);

create index if not exists candidate_status_events_candidate_idx
  on public.candidate_status_events (candidate_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Commission
-- ---------------------------------------------------------------------------

create table if not exists public.commission_agreements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  agent_id uuid not null references public.agents (id) on delete restrict,
  agreement_number text not null,
  agreement_type text not null default 'fixed'
    check (agreement_type in ('fixed', 'tiered')),
  trigger_definition text not null,
  milestones jsonb not null default '[]'::jsonb,
  valid_from date not null,
  valid_until date,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'ended')),
  document_path text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, agreement_number)
);

create index if not exists commission_agreements_agent_idx
  on public.commission_agreements (agent_id, status);

create table if not exists public.commission_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  agreement_id uuid not null references public.commission_agreements (id) on delete restrict,
  referral_id uuid not null references public.referrals (id) on delete restrict,
  agent_id uuid not null references public.agents (id) on delete restrict,
  code text not null,
  milestone_code text not null,
  label text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'IDR',
  earned_at timestamptz not null default now(),
  due_at timestamptz,
  status text not null default 'earned' check (status in (
    'pending', 'earned', 'submitted', 'under_review', 'approved', 'due',
    'partially_paid', 'paid', 'disputed', 'cancelled'
  )),
  paid_amount numeric(14, 2) not null default 0
    check (paid_amount >= 0 and paid_amount <= amount),
  source_event_id uuid,
  note text,
  created_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (agreement_id, referral_id, milestone_code)
);

create index if not exists commission_ledger_org_status_idx
  on public.commission_ledger (organization_id, status, due_at);
create index if not exists commission_ledger_agent_idx
  on public.commission_ledger (agent_id, status);

create table if not exists public.commission_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  agent_id uuid not null references public.agents (id) on delete restrict,
  reference text not null,
  paid_at timestamptz not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'IDR',
  recorded_by uuid,
  proof_path text,
  created_at timestamptz not null default now(),
  unique (organization_id, reference)
);

create table if not exists public.commission_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.commission_payments (id) on delete cascade,
  ledger_id uuid not null references public.commission_ledger (id) on delete restrict,
  allocated_amount numeric(14, 2) not null check (allocated_amount > 0),
  created_at timestamptz not null default now(),
  unique (payment_id, ledger_id)
);

create index if not exists commission_allocations_ledger_idx
  on public.commission_payment_allocations (ledger_id);

-- ---------------------------------------------------------------------------
-- Complaints, notifications, audit
-- ---------------------------------------------------------------------------

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  code text not null,
  category text not null check (category in ('biaya', 'dokumen', 'jadwal', 'komunikasi', 'lainnya')),
  description text not null,
  urgency text not null default 'medium' check (urgency in ('low', 'medium', 'high')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to uuid,
  resolution text,
  created_at timestamptz not null default now(),
  created_by uuid,
  created_by_name text,
  resolved_at timestamptz,
  unique (organization_id, code)
);

create index if not exists complaints_org_status_idx
  on public.complaints (organization_id, status, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  body text not null,
  link_path text,
  read_at timestamptz,
  kind text not null default 'info'
    check (kind in ('info', 'action', 'success', 'warning')),
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, read_at, created_at desc);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  actor_user_id uuid,
  actor_name text,
  action text not null,
  entity_type text not null,
  entity_id text,
  entity_label text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_org_idx
  on public.audit_events (organization_id, created_at desc);
create index if not exists audit_events_actor_idx
  on public.audit_events (actor_user_id, created_at desc);

create table if not exists public.data_access_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_user_id uuid,
  actor_name text,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  document_id uuid not null references public.candidate_documents (id) on delete cascade,
  action text not null check (action in ('view', 'download')),
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists data_access_events_org_idx
  on public.data_access_events (organization_id, created_at desc);
create index if not exists data_access_events_document_idx
  on public.data_access_events (document_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function app.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function app.set_updated_at();
