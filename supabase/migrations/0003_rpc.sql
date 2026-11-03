-- ARBLOK CPMI Platform — transactional RPCs
-- All mutations that touch more than one table live here so the browser never
-- has to assemble a multi-step write. Functions are security definer and check
-- auth.uid() plus organization membership themselves.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function app.actor_name()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select p.display_name from profiles p where p.user_id = auth.uid()),
    'Sistem'
  )
$$;

create or replace function app.audit(
  p_org uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_entity_label text,
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into audit_events (
    organization_id, actor_user_id, actor_name, action,
    entity_type, entity_id, entity_label, metadata
  ) values (
    p_org, auth.uid(), app.actor_name(), p_action,
    p_entity_type, p_entity_id, p_entity_label, p_metadata
  );
end;
$$;

create or replace function app.notify_user(
  p_user uuid,
  p_org uuid,
  p_title text,
  p_body text,
  p_link text,
  p_kind text default 'info'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user is null then
    return;
  end if;
  insert into notifications (user_id, organization_id, title, body, link_path, kind)
  values (p_user, p_org, p_title, p_body, p_link, p_kind);
end;
$$;

-- ---------------------------------------------------------------------------
-- Referral intake
-- ---------------------------------------------------------------------------

create or replace function public.create_referral(
  p_full_name text,
  p_phone text,
  p_region text,
  p_purpose text,
  p_recipient text,
  p_notice_version text,
  p_vacancy_id uuid default null,
  p_birth_date date default null,
  p_gender text default null,
  p_education text default null,
  p_address text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_role text;
  v_agent uuid;
  v_agent_name text;
  v_phone text;
  v_duplicate uuid;
  v_candidate uuid := gen_random_uuid();
  v_referral uuid := gen_random_uuid();
  v_candidate_code text;
  v_referral_code text;
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'Sesi berakhir. Silakan masuk kembali.';
  end if;

  select m.organization_id, m.role
    into v_org, v_role
  from organization_memberships m
  where m.user_id = v_uid and m.status = 'active'
  limit 1;

  if v_org is null then
    raise exception 'Akun tidak terhubung ke organisasi aktif.';
  end if;
  if v_role not in ('agent', 'agent_coordinator') then
    raise exception 'Hanya agen berwenang yang dapat membuat referral.';
  end if;

  select a.id, a.name into v_agent, v_agent_name
  from agents a
  where a.organization_id = v_org
    and a.user_id = v_uid
    and a.status in ('active', 'pending')
  limit 1;

  if v_agent is null then
    raise exception 'Profil agen tidak terhubung dengan akun ini.';
  end if;
  if coalesce(trim(p_full_name), '') = '' or length(trim(p_full_name)) < 3 then
    raise exception 'Nama kandidat minimal 3 karakter.';
  end if;

  v_phone := app.normalize_phone(p_phone);
  if length(v_phone) < 10 or length(v_phone) > 15 then
    raise exception 'Nomor telepon tidak valid. Gunakan format 08xx atau 62xx.';
  end if;
  if coalesce(trim(p_region), '') = '' then
    raise exception 'Wilayah kandidat wajib diisi.';
  end if;
  if coalesce(trim(p_purpose), '') = ''
     or coalesce(trim(p_recipient), '') = ''
     or coalesce(trim(p_notice_version), '') = '' then
    raise exception 'Persetujuan pemrosesan dan pembagian data wajib dicatat.';
  end if;

  select c.id into v_duplicate
  from candidates c
  where c.organization_id = v_org
    and c.phone_normalized = v_phone
  limit 1;

  v_candidate_code := app.next_code(
    'CP-' || to_char(v_now, 'YYYY') || '-', 'candidate_code_seq', 5
  );
  v_referral_code := app.next_code(
    'RF-' || to_char(v_now, 'YYYY') || '-', 'referral_code_seq', 6
  );

  insert into candidates (
    id, organization_id, full_name, nickname, phone, phone_normalized,
    birth_date, gender, education, region, address, status, agent_id,
    created_at, created_by, source, internal_note, last_activity_at, candidate_code
  ) values (
    v_candidate, v_org, trim(p_full_name), split_part(trim(p_full_name), ' ', 1),
    trim(p_phone), v_phone, p_birth_date, p_gender, p_education,
    trim(p_region), p_address, 'lead_registered', v_agent,
    v_now, v_uid, 'agent', p_notes, v_now, v_candidate_code
  );

  insert into candidate_consents (
    candidate_id, organization_id, consent_type, purpose, recipient,
    notice_version, consented_at, evidence, recorded_by
  ) values
    (
      v_candidate, v_org, 'data_processing', trim(p_purpose),
      'PT Mitra Bhayangkara Nusantara (P3MI pilot)', trim(p_notice_version), v_now,
      'Onboarding terbantu oleh agen ' || v_agent_name || '; bukti persetujuan dicatat pada platform.',
      v_uid
    ),
    (
      v_candidate, v_org, 'data_sharing', trim(p_purpose), trim(p_recipient),
      trim(p_notice_version), v_now,
      'Persetujuan pembagian data kepada P3MI dicatat terpisah dari kepentingan komisi agen.',
      v_uid
    );

  insert into referrals (
    id, organization_id, candidate_id, agent_id, vacancy_id, code,
    submitted_at, status, duplicate_of_id, duplicate_warning, attribution_locked
  ) values (
    v_referral, v_org, v_candidate, v_agent, p_vacancy_id, v_referral_code,
    v_now, 'submitted', v_duplicate, v_duplicate is not null, false
  );

  insert into referral_events (referral_id, event_type, actor_user_id, actor_name, created_at)
  values (v_referral, 'submitted', v_uid, v_agent_name, v_now);

  if v_duplicate is not null then
    insert into referral_events (referral_id, event_type, actor_user_id, actor_name, reason, created_at)
    values (
      v_referral, 'duplicate_warning', null, 'Sistem',
      'Nomor telepon cocok dengan kandidat lain pada tenant yang sama. Andai berbeda orang, buka dispute dengan bukti.',
      v_now
    );
  end if;

  insert into candidate_status_events (
    candidate_id, organization_id, from_status, to_status,
    actor_user_id, actor_name, reason, visibility, created_at
  ) values (
    v_candidate, v_org, null, 'lead_registered', v_uid, v_agent_name,
    'Referral baru dimasukkan.', 'candidate', v_now
  );

  perform app.audit(
    v_org, 'referral.submitted', 'referral', v_referral::text,
    v_referral_code || ' — ' || trim(p_full_name),
    jsonb_build_object('duplicate_warning', v_duplicate is not null)
  );

  if v_duplicate is not null then
    perform app.audit(
      v_org, 'referral.duplicate_flagged', 'referral', v_referral::text,
      v_referral_code, jsonb_build_object('matched_candidate', v_duplicate)
    );
  end if;

  insert into notifications (user_id, organization_id, title, body, link_path, kind)
  select m.user_id, v_org,
         case when v_duplicate is not null
              then 'Referral baru — peringatan duplikat'
              else 'Referral baru menunggu respons' end,
         trim(p_full_name) || ' diajukan oleh ' || v_agent_name || '. Kode ' || v_referral_code || '.',
         '/p3mi/referral',
         case when v_duplicate is not null then 'warning' else 'action' end
  from organization_memberships m
  where m.organization_id = v_org
    and m.status = 'active'
    and m.role in ('p3mi_admin', 'p3mi_reviewer');

  return jsonb_build_object(
    'referral_id', v_referral,
    'candidate_id', v_candidate,
    'code', v_referral_code,
    'duplicate', v_duplicate is not null
  );
end;
$$;

create or replace function public.respond_referral(
  p_referral_id uuid,
  p_decision text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_role text;
  v_ref referrals%rowtype;
  v_candidate candidates%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_now timestamptz := now();
  v_agent_user uuid;
begin
  select m.organization_id, m.role into v_org, v_role
  from organization_memberships m
  where m.user_id = v_uid and m.status = 'active'
  limit 1;

  if v_org is null or v_role not in ('p3mi_admin', 'p3mi_reviewer') then
    raise exception 'Anda tidak memiliki wewenang merespons referral.';
  end if;
  if p_decision not in ('accepted', 'rejected', 'disputed') then
    raise exception 'Keputusan referral tidak dikenal.';
  end if;

  select * into v_ref from referrals where id = p_referral_id for update;
  if not found then
    raise exception 'Referral tidak ditemukan.';
  end if;
  if v_ref.organization_id <> v_org then
    raise exception 'Akses lintas tenant ditolak.';
  end if;
  if v_ref.status in ('accepted', 'rejected') then
    raise exception 'Referral ini sudah memiliki keputusan final.';
  end if;
  if p_decision <> 'accepted' and v_reason is null then
    raise exception 'Alasan wajib diisi untuk penolakan atau dispute.';
  end if;

  select * into v_candidate from candidates where id = v_ref.candidate_id for update;
  if not found then
    raise exception 'Kandidat tidak ditemukan.';
  end if;

  if p_decision = 'accepted' then
    update referrals
    set status = 'accepted', accepted_at = v_now, decided_at = v_now,
        attribution_locked = true
    where id = p_referral_id;

    if array_position(
      array[
        'lead_registered', 'referral_acknowledged', 'office_visit_confirmed',
        'initial_verification', 'candidate_screening', 'job_matching',
        'overseas_partner_review', 'employer_selection', 'employer_approved',
        'placement_agreement', 'employment_contract', 'visa_work_permit',
        'pre_departure', 'departure_approved', 'departed', 'arrived',
        'employer_handover', 'working', 'monitoring'
      ]::text[],
      v_candidate.status
    ) < array_position(
      array[
        'lead_registered', 'referral_acknowledged', 'office_visit_confirmed',
        'initial_verification', 'candidate_screening', 'job_matching',
        'overseas_partner_review', 'employer_selection', 'employer_approved',
        'placement_agreement', 'employment_contract', 'visa_work_permit',
        'pre_departure', 'departure_approved', 'departed', 'arrived',
        'employer_handover', 'working', 'monitoring'
      ]::text[],
      'referral_acknowledged'
    ) then
      update candidates set status = 'referral_acknowledged' where id = v_candidate.id;
    end if;

    update candidates
    set branch_status = null, branch_reason = null, last_activity_at = v_now
    where id = v_candidate.id;

    insert into candidate_status_events (
      candidate_id, organization_id, from_status, to_status,
      actor_user_id, actor_name, reason, visibility, created_at
    ) values (
      v_candidate.id, v_org, v_candidate.status, 'referral_acknowledged',
      v_uid, app.actor_name(),
      'Referral diterima P3MI dan sumber dikunci secara operasional.',
      'candidate', v_now
    );

    insert into referral_events (referral_id, event_type, actor_user_id, actor_name, created_at)
    values (p_referral_id, 'accepted', v_uid, app.actor_name(), v_now);
    insert into referral_events (referral_id, event_type, actor_user_id, actor_name, reason, created_at)
    values (p_referral_id, 'source_locked', null, 'Sistem',
            'Sumber referral dikunci setelah diterima.', v_now);

    perform app.audit(v_org, 'referral.accepted', 'referral', p_referral_id::text, v_ref.code);
  else
    update referrals
    set status = p_decision, rejection_reason = v_reason, decided_at = v_now
    where id = p_referral_id;

    insert into referral_events (referral_id, event_type, actor_user_id, actor_name, reason, created_at)
    values (p_referral_id, p_decision, v_uid, app.actor_name(), v_reason, v_now);

    if p_decision = 'rejected' then
      update candidates
      set branch_status = 'rejected', branch_reason = v_reason, last_activity_at = v_now
      where id = v_candidate.id;

      insert into candidate_status_events (
        candidate_id, organization_id, from_status, to_status,
        actor_user_id, actor_name, reason, visibility, created_at
      ) values (
        v_candidate.id, v_org, v_candidate.status, 'rejected',
        v_uid, app.actor_name(), v_reason, 'candidate', v_now
      );
    end if;

    perform app.audit(
      v_org, 'referral.' || p_decision, 'referral', p_referral_id::text,
      v_ref.code, jsonb_build_object('reason', coalesce(v_reason, ''))
    );
  end if;

  select a.user_id into v_agent_user from agents a where a.id = v_ref.agent_id;
  perform app.notify_user(
    v_agent_user, v_org,
    case when p_decision = 'accepted' then 'Referral diterima P3MI'
         when p_decision = 'rejected' then 'Referral ditolak P3MI'
         else 'Referral memasuki dispute' end,
    v_candidate.full_name || ' (' || v_ref.code || '). ' || coalesce(v_reason, ''),
    '/agen/kandidat/' || v_candidate.id,
    case when p_decision = 'accepted' then 'success'
         when p_decision = 'rejected' then 'warning'
         else 'action' end
  );

  return jsonb_build_object('referral_id', p_referral_id, 'status', p_decision);
end;
$$;

-- ---------------------------------------------------------------------------
-- Pipeline
-- ---------------------------------------------------------------------------

create or replace function public.transition_candidate_status(
  p_candidate_id uuid,
  p_to_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_role text;
  v_candidate candidates%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_order text[] := array[
    'lead_registered', 'referral_acknowledged', 'office_visit_confirmed',
    'initial_verification', 'candidate_screening', 'job_matching',
    'overseas_partner_review', 'employer_selection', 'employer_approved',
    'placement_agreement', 'employment_contract', 'visa_work_permit',
    'pre_departure', 'departure_approved', 'departed', 'arrived',
    'employer_handover', 'working', 'monitoring'
  ];
  v_milestone text;
  v_event uuid;
  v_agreement uuid;
  v_label text;
  v_amount numeric;
  v_currency text;
  v_agent_user uuid;
  v_now timestamptz := now();
begin
  select m.organization_id, m.role into v_org, v_role
  from organization_memberships m
  where m.user_id = v_uid and m.status = 'active'
  limit 1;

  if v_org is null or v_role not in ('p3mi_admin', 'p3mi_reviewer') then
    raise exception 'Hanya P3MI yang dapat memperbarui status penempatan.';
  end if;
  if p_to_status is null or not (p_to_status = any (v_order)) then
    raise exception 'Status tujuan tidak dikenal.';
  end if;

  select * into v_candidate
  from candidates
  where id = p_candidate_id and organization_id = v_org
  for update;

  if not found then
    raise exception 'Kandidat tidak ditemukan pada tenant Anda.';
  end if;
  if v_candidate.status = p_to_status then
    raise exception 'Status tidak berubah.';
  end if;
  if array_position(v_order, p_to_status) < array_position(v_order, v_candidate.status)
     and v_reason is null then
    raise exception 'Alasan wajib diisi saat mengembalikan status ke tahap sebelumnya.';
  end if;

  update candidates
  set status = p_to_status,
      branch_status = null,
      branch_reason = null,
      last_activity_at = v_now
  where id = p_candidate_id;

  insert into candidate_status_events (
    candidate_id, organization_id, from_status, to_status,
    actor_user_id, actor_name, reason, visibility, created_at
  ) values (
    p_candidate_id, v_org, v_candidate.status, p_to_status,
    v_uid, app.actor_name(),
    coalesce(v_reason, 'Status diperbarui oleh P3MI.'),
    'candidate', v_now
  ) returning id into v_event;

  v_milestone := case p_to_status
    when 'employer_handover' then 'handover'
    when 'departed' then 'departed'
    when 'working' then 'working'
    else null
  end;

  if v_milestone is not null then
    select a.id, (m->>'label'), (m->>'amount')::numeric, coalesce(m->>'currency', 'IDR')
      into v_agreement, v_label, v_amount, v_currency
    from referrals r
    join commission_agreements a
      on a.agent_id = r.agent_id
     and a.organization_id = r.organization_id
     and a.status = 'active'
    cross join lateral jsonb_array_elements(a.milestones) m
    where r.candidate_id = p_candidate_id
      and r.status = 'accepted'
      and m->>'code' = v_milestone
    limit 1;

    if v_agreement is not null then
      insert into commission_ledger (
        organization_id, agreement_id, referral_id, agent_id, code,
        milestone_code, label, amount, currency, earned_at, due_at,
        status, paid_amount, source_event_id, note
      )
      select
        v_org, v_agreement, r.id, r.agent_id,
        app.next_code('KMS-' || to_char(v_now, 'YYYY') || '-', 'ledger_code_seq', 5),
        v_milestone, v_label || ' — ' || v_candidate.full_name,
        v_amount, v_currency, v_now, v_now + interval '14 days',
        'earned', 0, v_event,
        'Dibuat otomatis dari milestone pipeline. Wajib diverifikasi admin P3MI.'
      from referrals r
      where r.candidate_id = p_candidate_id
        and r.status = 'accepted'
      limit 1
      on conflict (agreement_id, referral_id, milestone_code) do nothing;
    end if;
  end if;

  perform app.notify_user(
    v_candidate.account_id, v_org,
    'Status proses diperbarui',
    v_candidate.full_name || ': status penempatan diperbarui P3MI.',
    '/cpmi/perkembangan', 'info'
  );
  perform app.notify_user(
    (select a.user_id from agents a where a.id = v_candidate.agent_id),
    v_org, 'Status proses diperbarui',
    v_candidate.full_name || ': status penempatan diperbarui P3MI.',
    '/agen/kandidat/' || v_candidate.id, 'info'
  );

  perform app.audit(
    v_org, 'candidate.status_changed', 'candidate', p_candidate_id::text,
    v_candidate.full_name,
    jsonb_build_object(
      'from_status', v_candidate.status,
      'to_status', p_to_status,
      'reason', coalesce(v_reason, '')
    )
  );

  return jsonb_build_object('candidate_id', p_candidate_id, 'status', p_to_status);
end;
$$;

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------

create or replace function public.review_candidate_document(
  p_document_id uuid,
  p_decision text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_role text;
  v_doc candidate_documents%rowtype;
  v_candidate candidates%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_still int;
  v_cpmi_user uuid;
  v_agent_user uuid;
  v_now timestamptz := now();
begin
  select m.organization_id, m.role into v_org, v_role
  from organization_memberships m
  where m.user_id = v_uid and m.status = 'active'
  limit 1;

  if v_org is null or v_role not in ('p3mi_admin', 'p3mi_reviewer') then
    raise exception 'Hanya reviewer P3MI yang dapat memutuskan dokumen.';
  end if;
  if p_decision not in ('approved', 'revision_required', 'rejected') then
    raise exception 'Keputusan dokumen tidak dikenal.';
  end if;
  if p_decision <> 'approved' and v_reason is null then
    raise exception 'Alasan wajib diisi untuk permintaan revisi atau penolakan.';
  end if;

  select * into v_doc from candidate_documents where id = p_document_id for update;
  if not found then
    raise exception 'Dokumen tidak ditemukan.';
  end if;
  if v_doc.organization_id <> v_org then
    raise exception 'Akses lintas tenant ditolak.';
  end if;

  select * into v_candidate from candidates where id = v_doc.candidate_id for update;
  if not found then
    raise exception 'Kandidat tidak ditemukan.';
  end if;

  update candidate_documents
  set status = p_decision, reviewed_at = v_now
  where id = p_document_id;

  insert into document_reviews (document_id, reviewer_user_id, reviewer_name, decision, reason)
  values (p_document_id, v_uid, app.actor_name(), p_decision, v_reason);

  if p_decision = 'revision_required' then
    update candidates
    set branch_status = 'revision_required',
        branch_reason = 'Dokumen perlu revisi: ' || coalesce(v_reason, ''),
        last_activity_at = v_now
    where id = v_candidate.id;
  elsif p_decision = 'approved' and v_candidate.branch_status = 'revision_required' then
    select count(*) into v_still
    from candidate_documents
    where candidate_id = v_candidate.id and status = 'revision_required';

    if v_still = 0 then
      update candidates
      set branch_status = null, branch_reason = null, last_activity_at = v_now
      where id = v_candidate.id;
    end if;
  end if;

  v_cpmi_user := v_candidate.account_id;
  select a.user_id into v_agent_user from agents a where a.id = v_candidate.agent_id;

  perform app.notify_user(
    v_cpmi_user, v_org,
    case p_decision when 'approved' then 'Dokumen disetujui'
         when 'rejected' then 'Dokumen ditolak'
         else 'Dokumen perlu diperbaiki' end,
    case p_decision when 'approved' then 'Dokumen Anda telah disetujui P3MI.'
         else 'Catatan pemeriksa: ' || coalesce(v_reason, '') end,
    '/cpmi/dokumen',
    case p_decision when 'approved' then 'success' else 'action' end
  );
  perform app.notify_user(
    v_agent_user, v_org,
    case p_decision when 'approved' then 'Dokumen disetujui'
         when 'rejected' then 'Dokumen ditolak'
         else 'Dokumen perlu diperbaiki' end,
    v_candidate.full_name || ': ' || coalesce(v_reason, 'keputusan P3MI tercatat.'),
    '/agen/kandidat/' || v_candidate.id,
    case p_decision when 'approved' then 'success' else 'action' end
  );

  perform app.audit(
    v_org, 'document.reviewed', 'document', p_document_id::text,
    v_doc.document_type || ' — ' || v_candidate.full_name || ' v' || v_doc.version,
    jsonb_build_object('decision', p_decision, 'reason', coalesce(v_reason, ''))
  );

  return jsonb_build_object('document_id', p_document_id, 'status', p_decision);
end;
$$;

create or replace function public.log_document_access(
  p_document_id uuid,
  p_action text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_doc candidate_documents%rowtype;
  v_org uuid;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_name text;
begin
  if p_action not in ('view', 'download') then
    raise exception 'Aksi akses dokumen tidak dikenal.';
  end if;
  if v_reason is null then
    raise exception 'Alasan akses wajib dicatat.';
  end if;

  select * into v_doc from candidate_documents where id = p_document_id;
  if not found then
    raise exception 'Dokumen tidak ditemukan.';
  end if;
  if not app.can_access_document(p_document_id) then
    raise exception 'Anda tidak memiliki akses ke dokumen ini.';
  end if;

  select m.organization_id into v_org
  from organization_memberships m
  where m.user_id = auth.uid() and m.status = 'active'
  limit 1;

  insert into data_access_events (
    organization_id, actor_user_id, actor_name, candidate_id,
    document_id, action, reason
  ) values (
    v_doc.organization_id, auth.uid(), app.actor_name(), v_doc.candidate_id,
    p_document_id, p_action, v_reason
  );

  perform app.audit(
    v_doc.organization_id, 'document.' || p_action, 'document',
    p_document_id::text, v_doc.document_type,
    jsonb_build_object('reason', v_reason)
  );

  return jsonb_build_object('document_id', p_document_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Commission
-- ---------------------------------------------------------------------------

create or replace function public.approve_commission_entry(p_entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_role text;
  v_entry commission_ledger%rowtype;
  v_agent_user uuid;
begin
  select m.organization_id, m.role into v_org, v_role
  from organization_memberships m
  where m.user_id = auth.uid() and m.status = 'active'
  limit 1;

  if v_org is null or v_role <> 'p3mi_admin' then
    raise exception 'Hanya admin P3MI yang dapat menyetujui hak tagih.';
  end if;

  select * into v_entry from commission_ledger where id = p_entry_id for update;
  if not found then
    raise exception 'Catatan fee tidak ditemukan.';
  end if;
  if v_entry.organization_id <> v_org then
    raise exception 'Akses lintas tenant ditolak.';
  end if;
  if v_entry.status not in ('earned', 'submitted', 'under_review') then
    raise exception 'Catatan fee ini tidak dalam status yang dapat disetujui.';
  end if;

  update commission_ledger set status = 'approved' where id = p_entry_id;

  select a.user_id into v_agent_user from agents a where a.id = v_entry.agent_id;
  perform app.notify_user(
    v_agent_user, v_org, 'Fee disetujui P3MI',
    v_entry.code || ' — ' || v_entry.label || ' telah disetujui dan menunggu pembayaran.',
    '/agen/komisi', 'success'
  );
  perform app.audit(
    v_org, 'commission.approved', 'ledger', p_entry_id::text, v_entry.code,
    jsonb_build_object('amount', v_entry.amount)
  );

  return jsonb_build_object('entry_id', p_entry_id, 'status', 'approved');
end;
$$;

create or replace function public.record_commission_payment(
  p_agent_id uuid,
  p_amount numeric,
  p_reference text,
  p_paid_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_role text;
  v_payment uuid := gen_random_uuid();
  v_reference text := nullif(trim(coalesce(p_reference, '')), '');
  v_outstanding numeric;
  v_remaining numeric;
  v_room numeric;
  v_take numeric;
  v_row commission_ledger%rowtype;
  v_agent_user uuid;
begin
  select m.organization_id, m.role into v_org, v_role
  from organization_memberships m
  where m.user_id = auth.uid() and m.status = 'active'
  limit 1;

  if v_org is null or v_role <> 'p3mi_admin' then
    raise exception 'Hanya admin P3MI yang dapat mencatat pembayaran.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Nominal pembayaran harus lebih dari nol.';
  end if;
  if not exists (select 1 from agents a where a.id = p_agent_id and a.organization_id = v_org) then
    raise exception 'Agen tidak ditemukan pada tenant Anda.';
  end if;

  select coalesce(sum(amount - paid_amount), 0) into v_outstanding
  from commission_ledger
  where organization_id = v_org
    and agent_id = p_agent_id
    and status in ('earned', 'approved', 'due', 'partially_paid');

  if v_outstanding <= 0 then
    raise exception 'Tidak ada fee yang dapat dibayar untuk agen ini.';
  end if;
  if p_amount > v_outstanding then
    raise exception 'Nominal melebihi outstanding (%).', to_char(v_outstanding, 'FM999G999G999G990D00');
  end if;

  if v_reference is null then
    v_reference := app.next_code(
      'BAYAR-' || to_char(now(), 'YYYY') || '-', 'payment_code_seq', 4
    );
  end if;

  insert into commission_payments (
    id, organization_id, agent_id, reference, paid_at, amount, currency,
    recorded_by, proof_path
  ) values (
    v_payment, v_org, p_agent_id, v_reference, p_paid_at, p_amount, 'IDR',
    auth.uid(), 'org/' || v_org::text || '/payments/' || v_reference || '.pdf'
  );

  v_remaining := p_amount;

  for v_row in
    select * from commission_ledger
    where organization_id = v_org
      and agent_id = p_agent_id
      and status in ('earned', 'approved', 'due', 'partially_paid')
    order by coalesce(due_at, earned_at), created_at
    for update
  loop
    exit when v_remaining <= 0;

    v_room := v_row.amount - v_row.paid_amount;
    v_take := least(v_room, v_remaining);

    if v_take > 0 then
      update commission_ledger
      set paid_amount = paid_amount + v_take,
          status = case
            when paid_amount + v_take >= amount then 'paid'
            else 'partially_paid'
          end
      where id = v_row.id;

      insert into commission_payment_allocations (payment_id, ledger_id, allocated_amount)
      values (v_payment, v_row.id, v_take);

      v_remaining := v_remaining - v_take;
    end if;
  end loop;

  select a.user_id into v_agent_user from agents a where a.id = p_agent_id;
  perform app.notify_user(
    v_agent_user, v_org, 'Pembayaran fee dicatat',
    v_reference || ' sebesar Rp' || to_char(p_amount, 'FM999G999G999G990D00') || ' telah dicatat P3MI.',
    '/agen/komisi', 'success'
  );
  perform app.audit(
    v_org, 'commission.payment_recorded', 'payment', v_payment::text, v_reference,
    jsonb_build_object('amount', p_amount, 'agent_id', p_agent_id)
  );

  return jsonb_build_object('payment_id', v_payment, 'reference', v_reference, 'allocated', p_amount);
end;
$$;

-- ---------------------------------------------------------------------------
-- Visits, handovers, complaints
-- ---------------------------------------------------------------------------

create or replace function public.set_visit_status(
  p_visit_id uuid,
  p_status text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_role text;
  v_visit visits%rowtype;
  v_candidate candidates%rowtype;
begin
  select m.organization_id, m.role into v_org, v_role
  from organization_memberships m
  where m.user_id = auth.uid() and m.status = 'active'
  limit 1;

  if v_org is null or v_role not in ('p3mi_admin', 'p3mi_reviewer') then
    raise exception 'Hanya P3MI yang dapat memperbarui jadwal kunjungan.';
  end if;
  if p_status not in ('proposed', 'confirmed', 'attended', 'no_show', 'cancelled') then
    raise exception 'Status kunjungan tidak dikenal.';
  end if;

  select * into v_visit from visits where id = p_visit_id for update;
  if not found then
    raise exception 'Jadwal tidak ditemukan.';
  end if;
  if v_visit.organization_id <> v_org then
    raise exception 'Akses lintas tenant ditolak.';
  end if;

  select * into v_candidate from candidates where id = v_visit.candidate_id;

  update visits
  set status = p_status,
      notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes),
      confirmed_by = case when p_status = 'confirmed' then auth.uid() else confirmed_by end
  where id = p_visit_id;

  perform app.notify_user(
    v_candidate.account_id, v_org, 'Jadwal kunjungan diperbarui',
    'Status kunjungan Anda: ' || p_status || '.',
    '/cpmi/perkembangan', 'info'
  );
  perform app.audit(
    v_org, 'visit.' || p_status, 'visit', p_visit_id::text,
    v_candidate.full_name, jsonb_build_object('status', p_status)
  );

  return jsonb_build_object('visit_id', p_visit_id, 'status', p_status);
end;
$$;

create or replace function public.respond_handover(
  p_handover_id uuid,
  p_accept boolean,
  p_proof_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_role text;
  v_handover handovers%rowtype;
  v_candidate candidates%rowtype;
  v_agent_user uuid;
  v_status text := case when p_accept then 'accepted' else 'declined' end;
begin
  select m.organization_id, m.role into v_org, v_role
  from organization_memberships m
  where m.user_id = auth.uid() and m.status = 'active'
  limit 1;

  if v_org is null or v_role not in ('p3mi_admin', 'p3mi_reviewer') then
    raise exception 'Hanya P3MI yang dapat merespons serah terima.';
  end if;

  select * into v_handover from handovers where id = p_handover_id for update;
  if not found then
    raise exception 'Permintaan handover tidak ditemukan.';
  end if;
  if v_handover.organization_id <> v_org then
    raise exception 'Akses lintas tenant ditolak.';
  end if;
  if v_handover.status <> 'requested' then
    raise exception 'Permintaan handover ini sudah diputuskan.';
  end if;

  update handovers
  set status = v_status,
      accepted_at = case when p_accept then now() else null end,
      received_by = case when p_accept then auth.uid() else received_by end,
      proof_reference = coalesce(nullif(trim(coalesce(p_proof_reference, '')), ''), proof_reference)
  where id = p_handover_id;

  select * into v_candidate from candidates where id = v_handover.candidate_id;
  select a.user_id into v_agent_user from agents a where a.id = v_handover.from_agent_id;

  perform app.notify_user(
    v_agent_user, v_org,
    case when p_accept then 'Serah terima diterima P3MI' else 'Serah terima ditolak P3MI' end,
    v_candidate.full_name || ': permintaan serah terima ' ||
      case when p_accept then 'diterima.' else 'ditolak.' end,
    '/agen/kandidat/' || v_candidate.id,
    case when p_accept then 'success' else 'warning' end
  );
  perform app.audit(
    v_org, 'handover.' || v_status, 'handover', p_handover_id::text, v_candidate.full_name
  );

  return jsonb_build_object('handover_id', p_handover_id, 'status', v_status);
end;
$$;

create or replace function public.create_complaint(
  p_candidate_id uuid,
  p_category text,
  p_urgency text,
  p_description text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_role text;
  v_candidate candidates%rowtype;
  v_code text;
  v_complaint uuid := gen_random_uuid();
  v_name text;
begin
  select m.organization_id, m.role into v_org, v_role
  from organization_memberships m
  where m.user_id = v_uid and m.status = 'active'
  limit 1;

  if v_org is null or v_role not in ('agent', 'agent_coordinator', 'cpmi') then
    raise exception 'Peran ini tidak dapat membuat pengaduan.';
  end if;
  if p_category not in ('biaya', 'dokumen', 'jadwal', 'komunikasi', 'lainnya') then
    raise exception 'Kategori pengaduan tidak dikenal.';
  end if;
  if p_urgency not in ('low', 'medium', 'high') then
    raise exception 'Urgensi pengaduan tidak dikenal.';
  end if;
  if length(trim(coalesce(p_description, ''))) < 10 then
    raise exception 'Uraian pengaduan minimal 10 karakter.';
  end if;

  select * into v_candidate from candidates where id = p_candidate_id;
  if not found or not app.can_access_candidate(p_candidate_id) then
    raise exception 'Kandidat di luar cakupan akses Anda.';
  end if;

  v_code := app.next_code('ADU-' || to_char(now(), 'YYYY') || '-', 'complaint_code_seq', 6);
  select display_name into v_name from profiles where user_id = v_uid;

  insert into complaints (
    id, organization_id, candidate_id, code, category, description,
    urgency, status, assigned_to, created_by, created_by_name
  ) values (
    v_complaint, v_org, p_candidate_id, v_code, p_category, trim(p_description),
    p_urgency, 'open',
    (select m.user_id from organization_memberships m
     where m.organization_id = v_org and m.role = 'p3mi_admin' and m.status = 'active'
     limit 1),
    v_uid, coalesce(v_name, 'Pengguna')
  );

  insert into notifications (user_id, organization_id, title, body, link_path, kind)
  select m.user_id, v_org, 'Pengaduan baru',
         v_code || ' — ' || v_candidate.full_name || ': ' || left(trim(p_description), 80),
         '/p3mi/pengaduan',
         case when p_urgency = 'high' then 'warning' else 'action' end
  from organization_memberships m
  where m.organization_id = v_org
    and m.status = 'active'
    and m.role in ('p3mi_admin', 'p3mi_reviewer');

  perform app.audit(
    v_org, 'complaint.created', 'complaint', v_complaint::text, v_candidate.full_name,
    jsonb_build_object('category', p_category, 'urgency', p_urgency)
  );

  return jsonb_build_object('complaint_id', v_complaint, 'code', v_code);
end;
$$;

create or replace function public.update_complaint(
  p_complaint_id uuid,
  p_status text,
  p_resolution text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_role text;
  v_complaint complaints%rowtype;
  v_candidate candidates%rowtype;
  v_resolution text := nullif(trim(coalesce(p_resolution, '')), '');
begin
  select m.organization_id, m.role into v_org, v_role
  from organization_memberships m
  where m.user_id = auth.uid() and m.status = 'active'
  limit 1;

  if v_org is null or v_role not in ('p3mi_admin', 'p3mi_reviewer') then
    raise exception 'Hanya P3MI yang dapat menindaklanjuti pengaduan.';
  end if;
  if p_status not in ('open', 'in_progress', 'resolved', 'closed') then
    raise exception 'Status pengaduan tidak dikenal.';
  end if;
  if p_status = 'resolved' and v_resolution is null then
    raise exception 'Ringkasan penyelesaian wajib diisi.';
  end if;

  select * into v_complaint from complaints where id = p_complaint_id for update;
  if not found then
    raise exception 'Pengaduan tidak ditemukan.';
  end if;
  if v_complaint.organization_id <> v_org then
    raise exception 'Akses lintas tenant ditolak.';
  end if;

  update complaints
  set status = p_status,
      resolution = coalesce(v_resolution, resolution),
      resolved_at = case when p_status in ('resolved', 'closed') then now() else resolved_at end
  where id = p_complaint_id;

  select * into v_candidate from candidates where id = v_complaint.candidate_id;

  perform app.notify_user(
    v_candidate.account_id, v_org, 'Pengaduan diperbarui',
    v_complaint.code || ': ' || case when p_status = 'resolved' then 'selesai' else 'sedang ditindaklanjuti' end || '.',
    '/cpmi/bantuan', case when p_status = 'resolved' then 'success' else 'info' end
  );
  perform app.audit(
    v_org, 'complaint.' || p_status, 'complaint', p_complaint_id::text, v_complaint.code
  );

  return jsonb_build_object('complaint_id', p_complaint_id, 'status', p_status);
end;
$$;

-- ---------------------------------------------------------------------------
-- Execute privileges
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on all functions in schema app to anon, authenticated;
