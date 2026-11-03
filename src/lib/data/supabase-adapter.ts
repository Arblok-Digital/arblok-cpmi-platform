import type {
  BranchStatus,
  Candidate,
  CandidateStatus,
  DocumentStatus,
  NewReferralInput,
  Role,
} from '@/lib/types'
import { requireSupabase, supabase } from '@/lib/supabase'

export type RemoteResult<T> = { ok: true; data: T } | { ok: false; error: string }

function fail(error: { message?: string } | null): { ok: false; error: string } {
  return { ok: false, error: error?.message ?? 'Terjadi kesalahan pada server.' }
}

function ok<T>(data: T): RemoteResult<T> {
  return { ok: true, data }
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export async function signInRemote(
  email: string,
  password: string,
): Promise<RemoteResult<{ userId: string }>> {
  if (!supabase) return { ok: false, error: 'Supabase belum dikonfigurasi.' }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
  if (error) return fail(error)
  if (!data.user) return { ok: false, error: 'Sesi tidak terbentuk.' }
  return ok({ userId: data.user.id })
}

export async function signOutRemote(): Promise<void> {
  await supabase?.auth.signOut()
}

export async function currentUserIdRemote(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export async function currentMembershipRemote(): Promise<
  RemoteResult<{ orgId: string; role: Role }>
> {
  const client = requireSupabase()
  const { data: userData } = await client.auth.getUser()
  if (!userData.user) return { ok: false, error: 'Sesi berakhir.' }

  const { data, error } = await client
    .from('organization_memberships')
    .select('organization_id, role')
    .eq('user_id', userData.user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (error) return fail(error)
  if (!data) return { ok: false, error: 'Akun tidak terhubung ke organisasi aktif.' }
  const row = data as { organization_id: string; role: Role }
  return ok({ orgId: row.organization_id, role: row.role })
}

/* ------------------------------------------------------------------ */
/* Referrals                                                           */
/* ------------------------------------------------------------------ */

export async function createReferralRemote(
  input: NewReferralInput,
): Promise<RemoteResult<{ referralId: string; code: string; duplicate: boolean }>> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('create_referral', {
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_region: input.region,
    p_purpose: input.consent.purpose,
    p_recipient: input.consent.recipient,
    p_notice_version: input.consent.noticeVersion,
    p_vacancy_id: input.vacancyId ?? null,
    p_birth_date: input.birthDate ?? null,
    p_gender: input.gender ?? null,
    p_education: input.education ?? null,
    p_address: input.address ?? null,
    p_notes: input.notes ?? null,
  })
  if (error) return fail(error)

  const row = data as { referral_id: string; code: string; duplicate: boolean }
  return ok({ referralId: row.referral_id, code: row.code, duplicate: row.duplicate })
}

export async function respondReferralRemote(
  referralId: string,
  decision: 'accepted' | 'rejected' | 'disputed',
  reason?: string,
): Promise<RemoteResult<null>> {
  const { error } = await requireSupabase().rpc('respond_referral', {
    p_referral_id: referralId,
    p_decision: decision,
    p_reason: reason?.trim() || null,
  })
  return error ? fail(error) : ok(null)
}

/* ------------------------------------------------------------------ */
/* Candidates & pipeline                                               */
/* ------------------------------------------------------------------ */

type CandidateRow = {
  id: string
  organization_id: string
  account_id: string | null
  full_name: string
  nickname: string | null
  phone: string
  birth_date: string | null
  gender: 'P' | 'L' | null
  education: string | null
  region: string
  address: string | null
  status: string
  branch_status: string | null
  branch_reason: string | null
  agent_id: string | null
  created_at: string
  created_by: string | null
  source: string
  internal_note: string | null
  last_activity_at: string
  candidate_code: string
}

function mapCandidate(row: CandidateRow): Candidate {
  return {
    id: row.id,
    orgId: row.organization_id,
    accountId: row.account_id ?? undefined,
    fullName: row.full_name,
    nickname: row.nickname ?? '',
    phone: row.phone,
    birthDate: row.birth_date ?? undefined,
    gender: row.gender ?? undefined,
    education: row.education ?? undefined,
    region: row.region,
    address: row.address ?? undefined,
    status: row.status as CandidateStatus,
    branchStatus: (row.branch_status ?? undefined) as BranchStatus | undefined,
    branchReason: row.branch_reason ?? undefined,
    agentId: row.agent_id ?? undefined,
    createdAt: row.created_at,
    createdBy: row.created_by ?? '',
    source: row.source as Candidate['source'],
    internalNote: row.internal_note ?? undefined,
    lastActivityAt: row.last_activity_at,
    candidateCode: row.candidate_code,
  }
}

export async function listCandidatesRemote(): Promise<RemoteResult<Candidate[]>> {
  const { data, error } = await requireSupabase()
    .from('candidates')
    .select('*')
    .order('last_activity_at', { ascending: false })
  if (error) return fail(error)
  return ok((data as CandidateRow[]).map(mapCandidate))
}

export async function transitionStatusRemote(
  candidateId: string,
  toStatus: CandidateStatus,
  reason?: string,
): Promise<RemoteResult<null>> {
  const { error } = await requireSupabase().rpc('transition_candidate_status', {
    p_candidate_id: candidateId,
    p_to_status: toStatus,
    p_reason: reason?.trim() || null,
  })
  return error ? fail(error) : ok(null)
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export async function reviewDocumentRemote(
  documentId: string,
  decision: Exclude<DocumentStatus, 'uploaded' | 'pending_review'>,
  reason?: string,
): Promise<RemoteResult<null>> {
  const { error } = await requireSupabase().rpc('review_candidate_document', {
    p_document_id: documentId,
    p_decision: decision,
    p_reason: reason?.trim() || null,
  })
  return error ? fail(error) : ok(null)
}

export async function logDocumentAccessRemote(
  documentId: string,
  action: 'view' | 'download',
  reason: string,
): Promise<RemoteResult<null>> {
  const { error } = await requireSupabase().rpc('log_document_access', {
    p_document_id: documentId,
    p_action: action,
    p_reason: reason.trim(),
  })
  return error ? fail(error) : ok(null)
}

/* ------------------------------------------------------------------ */
/* Commission                                                          */
/* ------------------------------------------------------------------ */

export async function approveLedgerRemote(entryId: string): Promise<RemoteResult<null>> {
  const { error } = await requireSupabase().rpc('approve_commission_entry', {
    p_entry_id: entryId,
  })
  return error ? fail(error) : ok(null)
}

export async function recordPaymentRemote(
  agentId: string,
  amount: number,
  reference: string,
  paidAt: string,
): Promise<RemoteResult<{ paymentId: string; reference: string }>> {
  const { data, error } = await requireSupabase().rpc('record_commission_payment', {
    p_agent_id: agentId,
    p_amount: amount,
    p_reference: reference,
    p_paid_at: paidAt,
  })
  if (error) return fail(error)
  const row = data as { payment_id: string; reference: string }
  return ok({ paymentId: row.payment_id, reference: row.reference })
}

/* ------------------------------------------------------------------ */
/* Visits, handovers, complaints, notifications                        */
/* ------------------------------------------------------------------ */

export async function setVisitStatusRemote(
  visitId: string,
  status: 'proposed' | 'confirmed' | 'attended' | 'no_show' | 'cancelled',
  notes?: string,
): Promise<RemoteResult<null>> {
  const { error } = await requireSupabase().rpc('set_visit_status', {
    p_visit_id: visitId,
    p_status: status,
    p_notes: notes?.trim() || null,
  })
  return error ? fail(error) : ok(null)
}

export async function respondHandoverRemote(
  handoverId: string,
  accept: boolean,
  proofReference?: string,
): Promise<RemoteResult<null>> {
  const { error } = await requireSupabase().rpc('respond_handover', {
    p_handover_id: handoverId,
    p_accept: accept,
    p_proof_reference: proofReference?.trim() || null,
  })
  return error ? fail(error) : ok(null)
}

export async function createComplaintRemote(
  candidateId: string,
  category: 'biaya' | 'dokumen' | 'jadwal' | 'komunikasi' | 'lainnya',
  urgency: 'low' | 'medium' | 'high',
  description: string,
): Promise<RemoteResult<{ code: string }>> {
  const { data, error } = await requireSupabase().rpc('create_complaint', {
    p_candidate_id: candidateId,
    p_category: category,
    p_urgency: urgency,
    p_description: description.trim(),
  })
  if (error) return fail(error)
  const row = data as { code: string }
  return ok({ code: row.code })
}

export async function updateComplaintRemote(
  complaintId: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed',
  resolution?: string,
): Promise<RemoteResult<null>> {
  const { error } = await requireSupabase().rpc('update_complaint', {
    p_complaint_id: complaintId,
    p_status: status,
    p_resolution: resolution?.trim() || null,
  })
  return error ? fail(error) : ok(null)
}

export async function markNotificationReadRemote(
  notificationId: string,
): Promise<RemoteResult<{ updated: number }>> {
  const { data, error } = await requireSupabase()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select('id')
  if (error) return fail(error)
  return ok({ updated: (data as { id: string }[] | null)?.length ?? 0 })
}
