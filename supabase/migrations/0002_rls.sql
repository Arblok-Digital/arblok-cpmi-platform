-- ARBLOK CPMI Platform — row level security
-- Deny by default. Every policy is scoped by organization membership; agents
-- are further scoped to their own book or their coordinator network, and CPMI
-- to their own candidate record.

-- ---------------------------------------------------------------------------
-- Helper functions (security definer: they must read membership tables without
-- being filtered by the very policies that call them).
-- ---------------------------------------------------------------------------

create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$ select auth.uid() $$;

create or replace function app.org_role(p_org uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.role
  from organization_memberships m
  where m.user_id = auth.uid()
    and m.organization_id = p_org
    and m.status = 'active'
  limit 1
$$;

create or replace function app.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from organization_memberships m
    where m.user_id = auth.uid()
      and m.organization_id = p_org
      and m.status = 'active'
  )
$$;

create or replace function app.is_p3mi(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from organization_memberships m
    where m.user_id = auth.uid()
      and m.organization_id = p_org
      and m.status = 'active'
      and m.role in ('p3mi_admin', 'p3mi_reviewer')
  )
$$;

create or replace function app.is_p3mi_admin(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from organization_memberships m
    where m.user_id = auth.uid()
      and m.organization_id = p_org
      and m.status = 'active'
      and m.role = 'p3mi_admin'
  )
$$;

create or replace function app.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from organization_memberships m
    where m.user_id = auth.uid()
      and m.role = 'arblok_admin'
      and m.status = 'active'
  )
$$;

create or replace function app.shares_org(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from organization_memberships me
    join organization_memberships them
      on them.organization_id = me.organization_id
    where me.user_id = auth.uid()
      and me.status = 'active'
      and them.user_id = p_user
      and them.status = 'active'
  )
$$;

create or replace function app.agent_id_for(p_org uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.id
  from agents a
  where a.organization_id = p_org
    and a.user_id = auth.uid()
    and a.status in ('active', 'pending')
  limit 1
$$;

create or replace function app.is_coordinator_of(p_agent uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from agents a
    where a.id = p_agent
      and a.coordinator_id = (
        select me.id from agents me
        where me.user_id = auth.uid()
          and me.organization_id = a.organization_id
        limit 1
      )
  )
$$;

create or replace function app.can_access_candidate(p_candidate uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from candidates c
    where c.id = p_candidate
      and (
        app.is_p3mi(c.organization_id)
        or c.account_id = auth.uid()
        or c.agent_id = app.agent_id_for(c.organization_id)
        or (c.agent_id is not null and app.is_coordinator_of(c.agent_id))
      )
  )
$$;

create or replace function app.can_access_referral(p_referral uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from referrals r
    where r.id = p_referral
      and (
        app.is_p3mi(r.organization_id)
        or r.agent_id = app.agent_id_for(r.organization_id)
        or app.is_coordinator_of(r.agent_id)
        or app.can_access_candidate(r.candidate_id)
      )
  )
$$;

create or replace function app.can_access_document(p_document uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from candidate_documents d
    where d.id = p_document
      and app.can_access_candidate(d.candidate_id)
  )
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.agents enable row level security;
alter table public.agent_agreements enable row level security;
alter table public.job_orders enable row level security;
alter table public.vacancies enable row level security;
alter table public.candidates enable row level security;
alter table public.candidate_consents enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_events enable row level security;
alter table public.referral_disputes enable row level security;
alter table public.visits enable row level security;
alter table public.handovers enable row level security;
alter table public.candidate_documents enable row level security;
alter table public.document_reviews enable row level security;
alter table public.candidate_status_events enable row level security;
alter table public.commission_agreements enable row level security;
alter table public.commission_ledger enable row level security;
alter table public.commission_payments enable row level security;
alter table public.commission_payment_allocations enable row level security;
alter table public.complaints enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_events enable row level security;
alter table public.data_access_events enable row level security;

-- ---------------------------------------------------------------------------
-- Organizations & profiles
-- ---------------------------------------------------------------------------

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select to authenticated
  using (app.is_org_member(id) or app.is_platform_admin());

drop policy if exists organizations_write on public.organizations;
create policy organizations_write on public.organizations
  for all to authenticated
  using (app.is_platform_admin())
  with check (app.is_platform_admin());

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    user_id = auth.uid()
    or app.is_platform_admin()
    or app.shares_org(user_id)
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists memberships_select on public.organization_memberships;
create policy memberships_select on public.organization_memberships
  for select to authenticated
  using (
    user_id = auth.uid()
    or app.is_p3mi(organization_id)
    or app.is_platform_admin()
  );

drop policy if exists memberships_write on public.organization_memberships;
create policy memberships_write on public.organization_memberships
  for all to authenticated
  using (app.is_p3mi_admin(organization_id) or app.is_platform_admin())
  with check (app.is_p3mi_admin(organization_id) or app.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Agents & agreements
-- ---------------------------------------------------------------------------

drop policy if exists agents_select on public.agents;
create policy agents_select on public.agents
  for select to authenticated
  using (
    app.is_p3mi(organization_id)
    or app.is_platform_admin()
    or user_id = auth.uid()
    or id = app.agent_id_for(organization_id)
    or app.is_coordinator_of(id)
  );

drop policy if exists agents_write on public.agents;
create policy agents_write on public.agents
  for all to authenticated
  using (app.is_p3mi_admin(organization_id))
  with check (app.is_p3mi_admin(organization_id));

drop policy if exists agent_agreements_select on public.agent_agreements;
create policy agent_agreements_select on public.agent_agreements
  for select to authenticated
  using (
    app.is_p3mi(organization_id)
    or agent_id = app.agent_id_for(organization_id)
    or agent_id = (select a.id from public.agents a where a.user_id = auth.uid() limit 1)
  );

drop policy if exists agent_agreements_write on public.agent_agreements;
create policy agent_agreements_write on public.agent_agreements
  for all to authenticated
  using (app.is_p3mi_admin(organization_id))
  with check (app.is_p3mi_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Job orders & vacancies
-- ---------------------------------------------------------------------------

drop policy if exists job_orders_select on public.job_orders;
create policy job_orders_select on public.job_orders
  for select to authenticated
  using (app.is_org_member(organization_id));

drop policy if exists job_orders_write on public.job_orders;
create policy job_orders_write on public.job_orders
  for all to authenticated
  using (app.is_p3mi(organization_id))
  with check (app.is_p3mi(organization_id));

drop policy if exists vacancies_select on public.vacancies;
create policy vacancies_select on public.vacancies
  for select to authenticated
  using (app.is_org_member(organization_id));

drop policy if exists vacancies_write on public.vacancies;
create policy vacancies_write on public.vacancies
  for all to authenticated
  using (app.is_p3mi(organization_id))
  with check (app.is_p3mi(organization_id));

-- ---------------------------------------------------------------------------
-- Candidates, consents, referrals
-- ---------------------------------------------------------------------------

drop policy if exists candidates_select on public.candidates;
create policy candidates_select on public.candidates
  for select to authenticated
  using (app.can_access_candidate(id));

drop policy if exists candidate_consents_select on public.candidate_consents;
create policy candidate_consents_select on public.candidate_consents
  for select to authenticated
  using (app.can_access_candidate(candidate_id));

drop policy if exists candidate_consents_insert on public.candidate_consents;
create policy candidate_consents_insert on public.candidate_consents
  for insert to authenticated
  with check (app.can_access_candidate(candidate_id));

drop policy if exists candidate_consents_revoke on public.candidate_consents;
create policy candidate_consents_revoke on public.candidate_consents
  for update to authenticated
  using (
    app.can_access_candidate(candidate_id)
    and (
      exists (
        select 1 from public.candidates c
        where c.id = candidate_id and c.account_id = auth.uid()
      )
      or app.is_p3mi_admin(organization_id)
    )
  )
  with check (app.can_access_candidate(candidate_id));

drop policy if exists referrals_select on public.referrals;
create policy referrals_select on public.referrals
  for select to authenticated
  using (app.can_access_referral(id));

drop policy if exists referral_events_select on public.referral_events;
create policy referral_events_select on public.referral_events
  for select to authenticated
  using (app.can_access_referral(referral_id));

drop policy if exists referral_disputes_select on public.referral_disputes;
create policy referral_disputes_select on public.referral_disputes
  for select to authenticated
  using (app.can_access_referral(referral_id));

drop policy if exists referral_disputes_write on public.referral_disputes;
create policy referral_disputes_write on public.referral_disputes
  for all to authenticated
  using (app.is_p3mi(organization_id))
  with check (app.is_p3mi(organization_id));

-- ---------------------------------------------------------------------------
-- Visits, handovers, documents
-- ---------------------------------------------------------------------------

drop policy if exists visits_select on public.visits;
create policy visits_select on public.visits
  for select to authenticated
  using (app.is_p3mi(organization_id) or app.can_access_candidate(candidate_id));

drop policy if exists handovers_select on public.handovers;
create policy handovers_select on public.handovers
  for select to authenticated
  using (app.is_p3mi(organization_id) or app.can_access_candidate(candidate_id));

drop policy if exists candidate_documents_select on public.candidate_documents;
create policy candidate_documents_select on public.candidate_documents
  for select to authenticated
  using (app.can_access_candidate(candidate_id));

drop policy if exists candidate_documents_insert on public.candidate_documents;
create policy candidate_documents_insert on public.candidate_documents
  for insert to authenticated
  with check (
    app.can_access_candidate(candidate_id)
    and (
      app.is_p3mi(organization_id)
      or exists (
        select 1 from public.candidates c
        where c.id = candidate_id and c.account_id = auth.uid()
      )
    )
  );

drop policy if exists candidate_documents_update on public.candidate_documents;
create policy candidate_documents_update on public.candidate_documents
  for update to authenticated
  using (app.is_p3mi(organization_id))
  with check (app.is_p3mi(organization_id));

drop policy if exists document_reviews_select on public.document_reviews;
create policy document_reviews_select on public.document_reviews
  for select to authenticated
  using (app.can_access_document(document_id));

drop policy if exists status_events_select on public.candidate_status_events;
create policy status_events_select on public.candidate_status_events
  for select to authenticated
  using (
    app.is_p3mi(organization_id)
    or (visibility = 'candidate' and app.can_access_candidate(candidate_id))
  );

-- ---------------------------------------------------------------------------
-- Commission
-- ---------------------------------------------------------------------------

drop policy if exists commission_agreements_select on public.commission_agreements;
create policy commission_agreements_select on public.commission_agreements
  for select to authenticated
  using (
    app.is_p3mi(organization_id)
    or agent_id = app.agent_id_for(organization_id)
  );

drop policy if exists commission_agreements_write on public.commission_agreements;
create policy commission_agreements_write on public.commission_agreements
  for all to authenticated
  using (app.is_p3mi_admin(organization_id))
  with check (app.is_p3mi_admin(organization_id));

drop policy if exists commission_ledger_select on public.commission_ledger;
create policy commission_ledger_select on public.commission_ledger
  for select to authenticated
  using (
    app.is_p3mi(organization_id)
    or agent_id = app.agent_id_for(organization_id)
  );

drop policy if exists commission_payments_select on public.commission_payments;
create policy commission_payments_select on public.commission_payments
  for select to authenticated
  using (
    app.is_p3mi(organization_id)
    or agent_id = app.agent_id_for(organization_id)
  );

drop policy if exists commission_allocations_select on public.commission_payment_allocations;
create policy commission_allocations_select on public.commission_payment_allocations
  for select to authenticated
  using (
    exists (
      select 1 from public.commission_payments p
      where p.id = payment_id
        and (app.is_p3mi(p.organization_id) or p.agent_id = app.agent_id_for(p.organization_id))
    )
  );

-- ---------------------------------------------------------------------------
-- Complaints, notifications, audit
-- ---------------------------------------------------------------------------

drop policy if exists complaints_select on public.complaints;
create policy complaints_select on public.complaints
  for select to authenticated
  using (
    app.is_p3mi(organization_id)
    or created_by = auth.uid()
    or app.can_access_candidate(candidate_id)
  );

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists audit_events_select on public.audit_events;
create policy audit_events_select on public.audit_events
  for select to authenticated
  using (
    app.is_platform_admin()
    or (organization_id is not null and app.is_p3mi_admin(organization_id))
  );

drop policy if exists data_access_events_select on public.data_access_events;
create policy data_access_events_select on public.data_access_events
  for select to authenticated
  using (
    app.is_platform_admin()
    or app.is_p3mi(organization_id)
  );

-- ---------------------------------------------------------------------------
-- Grants (Supabase normally provides these; declare them explicitly so a plain
-- PostgreSQL instance behaves the same).
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant usage on schema app to anon, authenticated;
grant execute on all functions in schema app to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
