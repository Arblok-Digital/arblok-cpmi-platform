// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const MIGRATIONS_DIR = resolve(process.cwd(), 'supabase/migrations')

const ORG_A = '00000000-0000-4000-8000-00000000000a'
const ORG_B = '00000000-0000-4000-8000-00000000000b'
const P3MI_A = '00000000-0000-4000-8000-000000000001'
const REVIEWER_A = '00000000-0000-4000-8000-000000000002'
const AGENT_USER = '00000000-0000-4000-8000-000000000003'
const COORD_USER = '00000000-0000-4000-8000-000000000004'
const CPMI_USER = '00000000-0000-4000-8000-000000000005'
const P3MI_B = '00000000-0000-4000-8000-000000000006'
const PLATFORM_ADMIN = '00000000-0000-4000-8000-000000000007'
const AGENT_A = '00000000-0000-4000-8000-0000000000a1'
const COORD_AGENT = '00000000-0000-4000-8000-0000000000a2'
const AGENT_B = '00000000-0000-4000-8000-0000000000a3'
const CAND_A = '00000000-0000-4000-8000-0000000000c1'
const CAND_B = '00000000-0000-4000-8000-0000000000c2'
const REF_A = '00000000-0000-4000-8000-0000000000f1'
const DOC_A = '00000000-0000-4000-8000-0000000000d1'
const DOC_B = '00000000-0000-4000-8000-0000000000d2'
const NOTIF_CPMI = '00000000-0000-4000-8000-0000000000e1'
const NOTIF_AGENT = '00000000-0000-4000-8000-0000000000e2'
const AGREEMENT_A = '00000000-0000-4000-8000-0000000000a9'
const LEDGER_A = '00000000-0000-4000-8000-000000000091'

const BOOTSTRAP = `
create schema if not exists auth;
create table auth.users (
  id uuid primary key,
  email text
);
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create role authenticated;
create role anon;
`

const SEED = `
insert into auth.users (id, email) values
  ('${P3MI_A}', 'p3mi@a.test'),
  ('${REVIEWER_A}', 'reviewer@a.test'),
  ('${AGENT_USER}', 'agent@a.test'),
  ('${COORD_USER}', 'coord@a.test'),
  ('${CPMI_USER}', 'cpmi@a.test'),
  ('${P3MI_B}', 'p3mi@b.test'),
  ('${PLATFORM_ADMIN}', 'admin@arblok.test');

insert into organizations (id, legal_name, short_name, slug, status, city, province, contact_email)
values
  ('${ORG_A}', 'PT Mitra Bhayangkara Nusantara', 'Bhayangkara', 'bhayangkara', 'active',
   'Tasikmalaya', 'Jawa Barat', 'ops@a.test'),
  ('${ORG_B}', 'PT Karya Nusantara', 'Karya', 'karya', 'onboarding',
   'Bandung', 'Jawa Barat', 'ops@b.test');

insert into profiles (user_id, display_name, phone, email) values
  ('${P3MI_A}', 'Hendra Admin', '081200000001', 'p3mi@a.test'),
  ('${REVIEWER_A}', 'Nadia Reviewer', '081200000002', 'reviewer@a.test'),
  ('${AGENT_USER}', 'Asep Agen', '081200000003', 'agent@a.test'),
  ('${COORD_USER}', 'Neng Koordinator', '081200000004', 'coord@a.test'),
  ('${CPMI_USER}', 'Siti CPMI', '081200000005', 'cpmi@a.test'),
  ('${P3MI_B}', 'Bayu Admin', '081200000006', 'p3mi@b.test'),
  ('${PLATFORM_ADMIN}', 'Admin Arblok', '081200000007', 'admin@arblok.test');

insert into organization_memberships (organization_id, user_id, role) values
  ('${ORG_A}', '${P3MI_A}', 'p3mi_admin'),
  ('${ORG_A}', '${REVIEWER_A}', 'p3mi_reviewer'),
  ('${ORG_A}', '${AGENT_USER}', 'agent'),
  ('${ORG_A}', '${COORD_USER}', 'agent_coordinator'),
  ('${ORG_A}', '${CPMI_USER}', 'cpmi'),
  ('${ORG_B}', '${P3MI_B}', 'p3mi_admin'),
  ('${ORG_A}', '${PLATFORM_ADMIN}', 'arblok_admin');

insert into agents (id, organization_id, user_id, name, code, region, status, coordinator_id) values
  ('${AGENT_A}', '${ORG_A}', '${AGENT_USER}', 'Asep Agen', 'AG-001', 'Tasikmalaya Kota', 'active', '${COORD_AGENT}'),
  ('${COORD_AGENT}', '${ORG_A}', '${COORD_USER}', 'Neng Koordinator', 'AG-000', 'Tasikmalaya Kabupaten', 'active', null),
  ('${AGENT_B}', '${ORG_B}', null, 'Agen Karya', 'AG-101', 'Bandung', 'active', null);

insert into candidates (
  id, organization_id, account_id, full_name, nickname, phone, phone_normalized,
  region, status, branch_status, branch_reason, agent_id, created_by,
  source, last_activity_at, candidate_code
) values
  ('${CAND_A}', '${ORG_A}', '${CPMI_USER}', 'Siti Aminah', 'Siti', '081234567801',
   '6281234567801', 'Tasikmalaya Kota', 'lead_registered', 'revision_required',
   'Dokumen perlu revisi: foto buram', '${AGENT_A}', '${P3MI_A}', 'agent',
   now(), 'CP-2026-00001'),
  ('${CAND_B}', '${ORG_B}', null, 'Wulan Karya', 'Wulan', '081234567802',
   '6281234567802', 'Bandung', 'lead_registered', null, null, '${AGENT_B}',
   '${P3MI_B}', 'agent', now(), 'CP-2026-00002');

insert into referrals (
  id, organization_id, candidate_id, agent_id, code, submitted_at, accepted_at,
  status, attribution_locked
) values
  ('${REF_A}', '${ORG_A}', '${CAND_A}', '${AGENT_A}', 'RF-2026-000001', now(), now(),
   'accepted', true),
  ('00000000-0000-4000-8000-0000000000f2', '${ORG_B}', '${CAND_B}', '${AGENT_B}',
   'RF-2026-000002', now(), null, 'submitted', false);

insert into commission_agreements (
  id, organization_id, agent_id, agreement_number, agreement_type,
  trigger_definition, milestones, valid_from, status
) values (
  '${AGREEMENT_A}', '${ORG_A}', '${AGENT_A}', 'AGR-2026-001', 'fixed',
  'Fee dibayar per milestone penempatan yang disetujui P3MI.',
  '[{"code":"handover","label":"Serah terima","amount":1500000,"currency":"IDR"},
    {"code":"departed","label":"Keberangkatan","amount":1000000,"currency":"IDR"}]'::jsonb,
  current_date - 30, 'active'
);

insert into commission_ledger (
  id, organization_id, agreement_id, referral_id, agent_id, code,
  milestone_code, label, amount, currency, earned_at, due_at, status, paid_amount
) values (
  '${LEDGER_A}', '${ORG_A}', '${AGREEMENT_A}', '${REF_A}', '${AGENT_A}',
  'KMS-2026-00001', 'departed', 'Keberangkatan — Siti Aminah', 2500000, 'IDR',
  now() - interval '20 days', now() - interval '6 days', 'earned', 0
);

insert into candidate_documents (
  id, candidate_id, organization_id, document_type, file_name, storage_path,
  mime_type, size_bytes, version, status, uploaded_by
) values
  ('${DOC_A}', '${CAND_A}', '${ORG_A}', 'ktp', 'ktp-siti.pdf',
   'org/${ORG_A}/candidate/${CAND_A}/${DOC_A}/1', 'application/pdf', 120000, 1,
   'revision_required', '${CPMI_USER}'),
  ('${DOC_B}', '${CAND_B}', '${ORG_B}', 'ktp', 'ktp-wulan.pdf',
   'org/${ORG_B}/candidate/${CAND_B}/${DOC_B}/1', 'application/pdf', 120000, 1,
   'pending_review', '${P3MI_B}');

insert into notifications (id, user_id, organization_id, title, body, link_path, kind) values
  ('${NOTIF_CPMI}', '${CPMI_USER}', '${ORG_A}', 'Dokumen perlu diperbaiki',
   'Foto KTP buram.', '/cpmi/dokumen', 'action'),
  ('${NOTIF_AGENT}', '${AGENT_USER}', '${ORG_A}', 'Kandidat diperbarui',
   'Status Siti diperbarui.', '/agen/kandidat/${CAND_A}', 'info');

select setval('candidate_code_seq', 100);
select setval('referral_code_seq', 100);
select setval('ledger_code_seq', 100);
select setval('complaint_code_seq', 100);
select setval('payment_code_seq', 100);
`

type Db = PGlite

async function createDatabase(): Promise<Db> {
  const db = new PGlite()
  await db.exec(BOOTSTRAP)
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
  for (const file of files) {
    await db.exec(readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8'))
  }
  await db.exec(SEED)
  return db
}

async function asUser(db: Db, userId: string): Promise<void> {
  await db.exec('reset role; set role authenticated;')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId])
}

async function rows<T>(db: Db, sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await db.query(sql, params)
  return result.rows as T[]
}

function payload<T>(result: { rows: unknown[] }): T {
  return (result.rows[0] as { payload: T }).payload
}

let db: Db

beforeEach(async () => {
  db = await createDatabase()
}, 30000)

afterEach(async () => {
  if (db) await db.close()
})

describe('row level security', () => {
  it('scopes candidates to the tenant, agent book, and CPMI record', async () => {
    await asUser(db, P3MI_A)
    expect((await rows<{ id: string }>(db, 'select id from candidates')).map((r) => r.id)).toEqual([
      CAND_A,
    ])

    await asUser(db, AGENT_USER)
    expect((await rows<{ id: string }>(db, 'select id from candidates')).map((r) => r.id)).toEqual([
      CAND_A,
    ])

    await asUser(db, COORD_USER)
    expect((await rows<{ id: string }>(db, 'select id from candidates')).map((r) => r.id)).toEqual([
      CAND_A,
    ])

    await asUser(db, CPMI_USER)
    expect((await rows<{ id: string }>(db, 'select id from candidates')).map((r) => r.id)).toEqual([
      CAND_A,
    ])

    await asUser(db, P3MI_B)
    expect((await rows<{ id: string }>(db, 'select id from candidates')).map((r) => r.id)).toEqual([
      CAND_B,
    ])
  })

  it('keeps documents and audit scope inside the organization', async () => {
    await asUser(db, P3MI_B)
    expect(
      (await rows<{ id: string }>(db, 'select id from candidate_documents')).map((r) => r.id),
    ).toEqual([DOC_B])

    await asUser(db, PLATFORM_ADMIN)
    expect(await rows(db, 'select id from candidates')).toHaveLength(0)
    expect(await rows(db, 'select id from candidate_documents')).toHaveLength(0)
  })

  it('does not let one user read or mark another user notification', async () => {
    await asUser(db, CPMI_USER)
    expect(
      (await rows<{ id: string }>(db, 'select id from notifications')).map((r) => r.id),
    ).toEqual([NOTIF_CPMI])

    const updated = await db.query(
      "update notifications set read_at = now() where id = $1 returning id",
      [NOTIF_AGENT],
    )
    expect(updated.rows).toHaveLength(0)

    const own = await db.query(
      "update notifications set read_at = now() where id = $1 returning id",
      [NOTIF_CPMI],
    )
    expect(own.rows).toHaveLength(1)
  })
})

describe('transactional RPCs', () => {
  it('creates a referral with two consents and flags a duplicate phone', async () => {
    await asUser(db, AGENT_USER)

    const first = await db.query(
      `select public.create_referral(
        $1::text, $2::text, $3::text, $4::text, $5::text, $6::text,
        null::uuid, null::date, null::text, null::text, null::text, null::text
      ) as payload`,
      ['Rina Uji', '081298765432', 'Tasikmalaya Kota', 'Uji alur', 'PT Mitra', 'v1.0'],
    )
    const created = payload<{ referral_id: string; candidate_id: string; duplicate: boolean }>(first)
    expect(created.duplicate).toBe(false)

    const consents = await rows<{ count: number }>(
      db,
      'select count(*)::int as count from candidate_consents where candidate_id = $1',
      [created.candidate_id],
    )
    expect(consents[0].count).toBe(2)

    const second = await db.query(
      `select public.create_referral(
        $1::text, $2::text, $3::text, $4::text, $5::text, $6::text,
        null::uuid, null::date, null::text, null::text, null::text, null::text
      ) as payload`,
      ['Rina Duplikat', '081298765432', 'Tasikmalaya Kota', 'Uji alur', 'PT Mitra', 'v1.0'],
    )
    expect(payload<{ duplicate: boolean }>(second).duplicate).toBe(true)
  })

  it('rejects referral responses from another tenant and locks an accepted source', async () => {
    await asUser(db, P3MI_B)
    await expect(
      db.query("select public.respond_referral($1::uuid, 'accepted', null)", [REF_A]),
    ).rejects.toThrow(/lintas tenant/i)

    await asUser(db, AGENT_USER)
    const created = payload<{ referral_id: string }>(
      await db.query(
        `select public.create_referral(
          $1::text, $2::text, $3::text, $4::text, $5::text, $6::text,
          null::uuid, null::date, null::text, null::text, null::text, null::text
        ) as payload`,
        ['Diah Baru', '081298765433', 'Tasikmalaya Kota', 'Uji alur', 'PT Mitra', 'v1.0'],
      ),
    )

    await asUser(db, P3MI_A)
    await db.query("select public.respond_referral($1::uuid, 'accepted', null)", [
      created.referral_id,
    ])

    const referral = await rows<{ status: string; attribution_locked: boolean }>(
      db,
      'select status, attribution_locked from referrals where id = $1',
      [created.referral_id],
    )
    expect(referral[0]).toEqual({ status: 'accepted', attribution_locked: true })
  })

  it('requires a reason for rollback and never duplicates a milestone fee', async () => {
    await asUser(db, P3MI_A)

    await db.query("select public.transition_candidate_status($1::uuid, 'employer_handover', null)", [
      CAND_A,
    ])
    const fees = () =>
      rows<{ count: number; amount: string }>(
        db,
        `select count(*)::int as count, coalesce(sum(amount), 0)::text as amount
         from commission_ledger where referral_id = $1 and milestone_code = 'handover'`,
        [REF_A],
      )

    expect((await fees())[0]).toEqual({ count: 1, amount: '1500000.00' })

    await expect(
      db.query("select public.transition_candidate_status($1::uuid, 'initial_verification', null)", [
        CAND_A,
      ]),
    ).rejects.toThrow(/Alasan wajib diisi/i)

    await db.query(
      "select public.transition_candidate_status($1::uuid, 'initial_verification', 'Koreksi data')",
      [CAND_A],
    )
    await db.query("select public.transition_candidate_status($1::uuid, 'employer_handover', null)", [
      CAND_A,
    ])

    expect((await fees())[0]).toEqual({ count: 1, amount: '1500000.00' })
  })

  it('allocates a partial payment FIFO and rejects overpayment', async () => {
    await asUser(db, P3MI_A)

    await db.query(
      "select public.record_commission_payment($1::uuid, $2::numeric, $3::text, now())",
      [AGENT_A, 100000, 'UJI-BAYAR-1'],
    )

    const ledger = await rows<{ paid_amount: string; status: string }>(
      db,
      'select paid_amount::text, status from commission_ledger where id = $1',
      [LEDGER_A],
    )
    expect(ledger[0]).toEqual({ paid_amount: '100000.00', status: 'partially_paid' })

    const allocations = await rows<{ allocated_amount: string }>(
      db,
      'select allocated_amount::text from commission_payment_allocations',
    )
    expect(allocations).toEqual([{ allocated_amount: '100000.00' }])

    await expect(
      db.query(
        "select public.record_commission_payment($1::uuid, $2::numeric, $3::text, now())",
        [AGENT_A, 2500000, 'UJI-BAYAR-2'],
      ),
    ).rejects.toThrow(/melebihi outstanding/i)
  })

  it('reviews documents across tenants only for the owning organization', async () => {
    await asUser(db, P3MI_B)
    await expect(
      db.query("select public.review_candidate_document($1::uuid, 'approved', null)", [DOC_A]),
    ).rejects.toThrow(/lintas tenant/i)

    await asUser(db, P3MI_A)
    await db.query("select public.review_candidate_document($1::uuid, 'approved', null)", [DOC_A])

    const doc = await rows<{ status: string }>(
      db,
      'select status from candidate_documents where id = $1',
      [DOC_A],
    )
    expect(doc[0].status).toBe('approved')

    const candidate = await rows<{ branch_status: string | null }>(
      db,
      'select branch_status from candidates where id = $1',
      [CAND_A],
    )
    expect(candidate[0].branch_status).toBeNull()
  })

  it('logs document access only for documents the actor may see', async () => {
    await asUser(db, CPMI_USER)
    await db.query("select public.log_document_access($1::uuid, 'view', 'Pemeriksaan pribadi')", [
      DOC_A,
    ])

    // The access trail itself is only readable by the P3MI tenant.
    await asUser(db, P3MI_A)
    expect(await rows(db, 'select id from data_access_events')).toHaveLength(1)

    await asUser(db, CPMI_USER)
    await expect(
      db.query("select public.log_document_access($1::uuid, 'view', 'Coba lintas tenant')", [
        DOC_B,
      ]),
    ).rejects.toThrow(/tidak memiliki akses/i)

    await asUser(db, P3MI_B)
    await expect(
      db.query("select public.log_document_access($1::uuid, 'view', 'Coba lintas tenant')", [
        DOC_A,
      ]),
    ).rejects.toThrow(/tidak memiliki akses/i)
  })
})
