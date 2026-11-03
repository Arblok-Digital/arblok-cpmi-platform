import { useSyncExternalStore } from 'react'
import type {
  Account,
  AgentAgreement,
  AppNotification,
  AppState,
  BranchStatus,
  Candidate,
  CandidateStatus,
  CandidateDocument,
  Complaint,
  ComplaintStatus,
  DocumentStatus,
  DocumentTypeId,
  LedgerEntry,
  NewReferralInput,
  Role,
  Vacancy,
} from './types'
import { createSeedState } from './seed'
import { DEMO_PASSWORD, STATUS_META, STATUS_ORDER } from './constants'
import { normalizePhone } from './format'
import { can, canAccessDocument, isP3miRole, visibleCandidates } from './permissions'

const STORAGE_KEY = 'arblok-cpmi-demo-v1'
const MAX_FILE_BYTES = 3 * 1024 * 1024
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png']

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string }

function loadState(): AppState {
  if (typeof window === 'undefined') return createSeedState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSeedState()
    const parsed = JSON.parse(raw) as AppState
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.accounts)) {
      return createSeedState()
    }
    return parsed
  } catch {
    return createSeedState()
  }
}

let state: AppState = loadState()
const listeners = new Set<() => void>()

function persist() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Demo persistence is best-effort. Never store real personal documents.
  }
}

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

function commit(next: AppState) {
  state = next
  persist()
  emit()
}

function mutate(fn: (draft: AppState) => void) {
  const draft = structuredClone(state)
  fn(draft)
  commit(draft)
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function getState(): AppState {
  return state
}

export function currentAccount(s: AppState = state): Account | null {
  if (!s.currentUserId) return null
  return s.accounts.find((a) => a.id === s.currentUserId) ?? null
}

function actorOf(draft: AppState): Account {
  const account = currentAccount(draft)
  if (!account) throw new Error('Sesi tidak ditemukan. Silakan masuk kembali.')
  return account
}

function nextCode(prefix: string, existing: string[], pad: number): string {
  const max = existing.reduce((m, code) => {
    const n = Number(code.slice(-pad))
    return Number.isFinite(n) ? Math.max(m, n) : m
  }, 0)
  return `${prefix}${String(max + 1).padStart(pad, '0')}`
}

function agentAccountId(draft: AppState, agentId: string): string | undefined {
  return draft.agents.find((a) => a.id === agentId)?.accountId
}

function p3miUserIds(draft: AppState, orgId: string): string[] {
  return draft.accounts
    .filter(
      (a) =>
        a.orgId === orgId &&
        (a.role === 'p3mi_admin' || a.role === 'p3mi_reviewer') &&
        a.status === 'active',
    )
    .map((a) => a.id)
}

function notify(
  draft: AppState,
  userIds: (string | undefined)[],
  payload: Omit<AppNotification, 'id' | 'userId' | 'orgId' | 'createdAt' | 'readAt'>,
) {
  const unique = [...new Set(userIds.filter((id): id is string => Boolean(id)))]
  unique.forEach((userId) => {
    const account = draft.accounts.find((a) => a.id === userId)
    if (!account) return
    draft.notifications.unshift({
      id: `ntf-${crypto.randomUUID()}`,
      userId,
      orgId: account.orgId,
      createdAt: new Date().toISOString(),
      ...payload,
    })
  })
}

function audit(
  draft: AppState,
  actor: Account,
  action: string,
  entityType: string,
  entityId: string,
  entityLabel: string,
  metadata?: Record<string, string | number | boolean>,
) {
  draft.auditEvents.unshift({
    id: `aud-${crypto.randomUUID()}`,
    orgId: actor.orgId,
    actorUserId: actor.id,
    actorName: actor.name,
    action,
    entityType,
    entityId,
    entityLabel,
    metadata,
    createdAt: new Date().toISOString(),
  })
}

function pushStatusEvent(
  draft: AppState,
  candidate: Candidate,
  toStatus: string,
  actor: Account,
  reason?: string,
  visibility: 'internal' | 'candidate' = 'candidate',
) {
  const event = {
    id: `se-${crypto.randomUUID()}`,
    candidateId: candidate.id,
    orgId: candidate.orgId,
    fromStatus: candidate.status,
    toStatus,
    actorUserId: actor.id,
    actorName: actor.name,
    reason,
    visibility,
    createdAt: new Date().toISOString(),
  }
  draft.statusEvents.unshift(event)
  candidate.lastActivityAt = event.createdAt
  return event
}

const MILESTONE_BY_STATUS: Partial<Record<CandidateStatus, string>> = {
  employer_handover: 'handover',
  departed: 'departed',
  working: 'working',
}

function ensureLedger(
  draft: AppState,
  candidate: Candidate,
  toStatus: CandidateStatus,
  actor: Account,
  sourceEventId: string,
) {
  const milestoneCode = MILESTONE_BY_STATUS[toStatus]
  if (!milestoneCode) return
  const referral = draft.referrals.find(
    (r) => r.candidateId === candidate.id && r.status === 'accepted',
  )
  if (!referral) return
  const agreement = draft.commissionAgreements.find(
    (a) => a.agentId === referral.agentId && a.status === 'active',
  )
  if (!agreement) return
  const milestone = agreement.milestones.find((m) => m.code === milestoneCode)
  if (!milestone) return
  const exists = draft.ledger.some(
    (l) =>
      l.agreementId === agreement.id &&
      l.referralId === referral.id &&
      l.milestoneCode === milestoneCode,
  )
  if (exists) return

  const now = new Date()
  const due = new Date(now.getTime() + 14 * 86400000)
  const entry: LedgerEntry = {
    id: `kms-${crypto.randomUUID()}`,
    orgId: candidate.orgId,
    agreementId: agreement.id,
    referralId: referral.id,
    agentId: referral.agentId,
    code: nextCode(
      `KMS-${now.getFullYear()}-`,
      draft.ledger.map((l) => l.code),
      5,
    ),
    milestoneCode,
    label: `${milestone.label} — ${candidate.fullName}`,
    amount: milestone.amount,
    currency: milestone.currency,
    earnedAt: now.toISOString(),
    dueAt: due.toISOString(),
    status: 'earned',
    paidAmount: 0,
    sourceEventId,
    note: 'Dibuat otomatis dari milestone pipeline. Wajib diverifikasi admin P3MI.',
  }
  draft.ledger.unshift(entry)
  notify(draft, [agentAccountId(draft, referral.agentId)], {
    title: 'Fee menjadi hak tagih',
    body: `${entry.code} — ${entry.label} (${milestone.currency} ${milestone.amount.toLocaleString('id-ID')}).`,
    linkPath: '/agen/komisi',
    kind: 'success',
  })
  audit(
    draft,
    actor,
    'commission.earned',
    'ledger',
    entry.id,
    entry.code,
    { amount: entry.amount, milestone: milestoneCode },
  )
}

function requireP3mi(account: Account): string | null {
  if (!isP3miRole(account.role)) return 'Hanya admin/reviewer P3MI yang dapat melakukan aksi ini.'
  return null
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export function login(email: string, password: string): ActionResult<Account> {
  const normalized = email.trim().toLowerCase()
  const account = state.accounts.find((a) => a.email.toLowerCase() === normalized)
  if (!account) return { ok: false, error: 'Email tidak terdaftar pada workspace pilot.' }
  if (account.status !== 'active') {
    return { ok: false, error: 'Akun belum aktif. Hubungi admin P3MI untuk aktivasi.' }
  }
  if (password !== DEMO_PASSWORD) {
    return { ok: false, error: 'Kata sandi demo tidak sesuai. Gunakan demo1234.' }
  }
  mutate((draft) => {
    draft.currentUserId = account.id
    const row = draft.accounts.find((a) => a.id === account.id)
    if (row) row.lastLoginAt = new Date().toISOString()
    audit(draft, account, 'auth.login', 'account', account.id, account.email, {
      role: account.role,
    })
  })
  return { ok: true, data: account }
}

export function logout() {
  mutate((draft) => {
    draft.currentUserId = null
  })
}

export function resetDemo() {
  const seed = createSeedState()
  commit(seed)
}

/* ------------------------------------------------------------------ */
/* Referral                                                            */
/* ------------------------------------------------------------------ */

export function createReferral(input: NewReferralInput): ActionResult<{
  referralId: string
  code: string
  duplicate: boolean
}> {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir. Silakan masuk kembali.' }
  if (account.role !== 'agent' && account.role !== 'agent_coordinator') {
    return { ok: false, error: 'Hanya agen berwenang yang dapat membuat referral.' }
  }
  if (!account.agentId) return { ok: false, error: 'Profil agen tidak terhubung dengan akun ini.' }
  if (!input.consent.dataProcessing || !input.consent.dataSharing) {
    return { ok: false, error: 'Persetujuan pemrosesan dan pembagian data wajib dicatat.' }
  }
  if (input.fullName.trim().length < 3) {
    return { ok: false, error: 'Nama kandidat minimal 3 karakter.' }
  }
  const phone = normalizePhone(input.phone)
  if (phone.length < 10 || phone.length > 15) {
    return { ok: false, error: 'Nomor telepon tidak valid. Gunakan format 08xx atau 62xx.' }
  }
  if (!input.region.trim()) return { ok: false, error: 'Wilayah kandidat wajib diisi.' }

  const duplicate = state.candidates.find(
    (c) => c.orgId === account.orgId && normalizePhone(c.phone) === phone,
  )

  const now = new Date().toISOString()
  const candidateId = `cand-${crypto.randomUUID()}`
  const referralId = `ref-${crypto.randomUUID()}`
  const candidateCode = nextCode(
    `CP-${new Date().getFullYear()}-`,
    state.candidates.map((c) => c.candidateCode),
    5,
  )
  const referralCode = nextCode(
    `RF-${new Date().getFullYear()}-`,
    state.referrals.map((r) => r.code),
    6,
  )

  mutate((draft) => {
    const actor = actorOf(draft)
    const candidate: Candidate = {
      id: candidateId,
      orgId: actor.orgId,
      fullName: input.fullName.trim(),
      nickname: input.fullName.trim().split(' ')[0],
      phone: input.phone.trim(),
      birthDate: input.birthDate,
      gender: input.gender,
      education: input.education,
      region: input.region,
      address: input.address,
      status: 'lead_registered',
      agentId: actor.agentId,
      createdAt: now,
      createdBy: actor.id,
      source: 'agent',
      internalNote: input.notes,
      lastActivityAt: now,
      candidateCode,
    }
    draft.candidates.unshift(candidate)

    draft.consents.unshift({
      id: `consent-${crypto.randomUUID()}`,
      candidateId,
      orgId: actor.orgId,
      consentType: 'data_processing',
      purpose: input.consent.purpose,
      recipient: 'PT Mitra Bhayangkara Nusantara (P3MI pilot)',
      noticeVersion: input.consent.noticeVersion,
      consentedAt: now,
      evidence: `Onboarding terbantu oleh agen ${actor.name}; bukti persetujuan dicatat pada mode demo.`,
      recordedBy: actor.id,
    })
    draft.consents.unshift({
      id: `consent-${crypto.randomUUID()}`,
      candidateId,
      orgId: actor.orgId,
      consentType: 'data_sharing',
      purpose: input.consent.purpose,
      recipient: input.consent.recipient,
      noticeVersion: input.consent.noticeVersion,
      consentedAt: now,
      evidence: `Persetujuan pembagian data kepada P3MI dicatat terpisah dari kepentingan komisi agen.`,
      recordedBy: actor.id,
    })

    draft.referrals.unshift({
      id: referralId,
      orgId: actor.orgId,
      candidateId,
      agentId: actor.agentId!,
      vacancyId: input.vacancyId,
      code: referralCode,
      submittedAt: now,
      status: 'submitted',
      duplicateOfId: duplicate?.id,
      duplicateWarning: Boolean(duplicate),
      attributionLocked: false,
    })
    draft.referralEvents.unshift({
      id: `re-${crypto.randomUUID()}`,
      referralId,
      type: 'submitted',
      actorUserId: actor.id,
      actorName: actor.name,
      createdAt: now,
    })
    if (duplicate) {
      draft.referralEvents.unshift({
        id: `re-${crypto.randomUUID()}`,
        referralId,
        type: 'duplicate_warning',
        actorUserId: 'system',
        actorName: 'Sistem',
        reason: `Nomor telepon cocok dengan kandidat ${duplicate.candidateCode} (${duplicate.fullName}) pada tenant yang sama.`,
        createdAt: now,
      })
    }
    draft.statusEvents.unshift({
      id: `se-${crypto.randomUUID()}`,
      candidateId,
      orgId: actor.orgId,
      toStatus: 'lead_registered',
      actorUserId: actor.id,
      actorName: actor.name,
      reason: 'Referral baru dimasukkan.',
      visibility: 'candidate',
      createdAt: now,
    })

    audit(
      draft,
      actor,
      'referral.submitted',
      'referral',
      referralId,
      `${referralCode} — ${candidate.fullName}`,
      { duplicate_warning: Boolean(duplicate), vacancy_id: input.vacancyId ?? 'none' },
    )
    if (duplicate) {
      audit(draft, actor, 'referral.duplicate_flagged', 'referral', referralId, referralCode, {
        matched_candidate: duplicate.candidateCode,
      })
    }

    notify(draft, p3miUserIds(draft, actor.orgId), {
      title: duplicate ? 'Referral baru — peringatan duplikat' : 'Referral baru menunggu respons',
      body: `${candidate.fullName} diajukan oleh ${actor.name}. Kode ${referralCode}.`,
      linkPath: '/p3mi/referral',
      kind: duplicate ? 'warning' : 'action',
    })
  })

  return { ok: true, data: { referralId, code: referralCode, duplicate: Boolean(duplicate) } }
}

export function respondReferral(
  referralId: string,
  decision: 'accepted' | 'rejected' | 'disputed',
  reason?: string,
): ActionResult {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (!can(account.role, 'respond.referral')) {
    return { ok: false, error: 'Anda tidak memiliki wewenang merespons referral.' }
  }
  const referral = state.referrals.find((r) => r.id === referralId)
  if (!referral) return { ok: false, error: 'Referral tidak ditemukan.' }
  if (referral.orgId !== account.orgId) return { ok: false, error: 'Akses lintas tenant ditolak.' }
  if (referral.status === 'accepted' || referral.status === 'rejected') {
    return { ok: false, error: 'Referral ini sudah memiliki keputusan final.' }
  }
  if (decision !== 'accepted' && !reason?.trim()) {
    return { ok: false, error: 'Alasan wajib diisi untuk penolakan atau dispute.' }
  }
  const candidate = state.candidates.find((c) => c.id === referral.candidateId)
  if (!candidate) return { ok: false, error: 'Kandidat tidak ditemukan.' }

  mutate((draft) => {
    const actor = actorOf(draft)
    const row = draft.referrals.find((r) => r.id === referralId)!
    const cand = draft.candidates.find((c) => c.id === row.candidateId)!
    const now = new Date().toISOString()
    row.decidedAt = now

    if (decision === 'accepted') {
      row.status = 'accepted'
      row.acceptedAt = now
      row.attributionLocked = true
      if (STATUS_ORDER.indexOf(cand.status) < STATUS_ORDER.indexOf('referral_acknowledged')) {
        cand.status = 'referral_acknowledged'
      }
      cand.branchStatus = undefined
      cand.branchReason = undefined
      pushStatusEvent(
        draft,
        cand,
        'referral_acknowledged',
        actor,
        'Referral diterima P3MI dan sumber dikunci secara operasional.',
      )
      draft.referralEvents.unshift({
        id: `re-${crypto.randomUUID()}`,
        referralId,
        type: 'accepted',
        actorUserId: actor.id,
        actorName: actor.name,
        createdAt: now,
      })
      draft.referralEvents.unshift({
        id: `re-${crypto.randomUUID()}`,
        referralId,
        type: 'source_locked',
        actorUserId: 'system',
        actorName: 'Sistem',
        reason: 'Sumber referral dikunci setelah diterima.',
        createdAt: now,
      })
      notify(draft, [agentAccountId(draft, row.agentId)], {
        title: 'Referral diterima P3MI',
        body: `${cand.fullName} (${row.code}) telah diterima. Sumber referral kini terkunci.`,
        linkPath: `/agen/kandidat/${cand.id}`,
        kind: 'success',
      })
      audit(draft, actor, 'referral.accepted', 'referral', referralId, row.code)
    } else {
      row.status = decision
      row.rejectionReason = reason?.trim()
      draft.referralEvents.unshift({
        id: `re-${crypto.randomUUID()}`,
        referralId,
        type: decision,
        actorUserId: actor.id,
        actorName: actor.name,
        reason: reason?.trim(),
        createdAt: now,
      })
      if (decision === 'rejected') {
        cand.branchStatus = 'rejected'
        cand.branchReason = reason?.trim()
        pushStatusEvent(draft, cand, 'rejected', actor, reason?.trim(), 'candidate')
      }
      notify(draft, [agentAccountId(draft, row.agentId)], {
        title: decision === 'rejected' ? 'Referral ditolak P3MI' : 'Referral memasuki dispute',
        body: `${cand.fullName} (${row.code}). ${reason?.trim() ?? ''}`,
        linkPath: `/agen/kandidat/${cand.id}`,
        kind: decision === 'rejected' ? 'warning' : 'action',
      })
      audit(
        draft,
        actor,
        `referral.${decision}`,
        'referral',
        referralId,
        row.code,
        { reason: reason?.trim() ?? '' },
      )
    }
    cand.lastActivityAt = now
  })
  return { ok: true, data: null }
}

/* ------------------------------------------------------------------ */
/* Visit & handover                                                    */
/* ------------------------------------------------------------------ */

export function scheduleVisit(
  candidateId: string,
  scheduledAt: string,
  locationLabel: string,
  notes?: string,
): ActionResult {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (!['agent', 'agent_coordinator', 'p3mi_admin', 'p3mi_reviewer'].includes(account.role)) {
    return { ok: false, error: 'Peran ini tidak dapat menjadwalkan kunjungan.' }
  }
  if (!visibleCandidates(state, account).some((c) => c.id === candidateId)) {
    return { ok: false, error: 'Kandidat di luar cakupan akses Anda.' }
  }
  const when = new Date(scheduledAt)
  if (Number.isNaN(when.getTime())) return { ok: false, error: 'Tanggal kunjungan tidak valid.' }
  if (!locationLabel.trim()) return { ok: false, error: 'Lokasi kunjungan wajib diisi.' }
  const active = state.visits.find(
    (v) =>
      v.candidateId === candidateId && (v.status === 'proposed' || v.status === 'confirmed'),
  )
  if (active) return { ok: false, error: 'Sudah ada jadwal aktif untuk kandidat ini.' }
  const referral = state.referrals.find(
    (r) => r.candidateId === candidateId && r.status === 'accepted',
  )
  if (!referral) return { ok: false, error: 'Referral belum diterima P3MI.' }

  mutate((draft) => {
    const actor = actorOf(draft)
    const cand = draft.candidates.find((c) => c.id === candidateId)!
    const isP3mi = isP3miRole(actor.role)
    const now = new Date().toISOString()
    draft.visits.unshift({
      id: `visit-${crypto.randomUUID()}`,
      candidateId,
      referralId: referral.id,
      scheduledAt: when.toISOString(),
      locationLabel: locationLabel.trim(),
      status: isP3mi ? 'confirmed' : 'proposed',
      confirmedBy: isP3mi ? actor.id : undefined,
      notes,
      createdAt: now,
    })
    if (isP3mi) {
      if (STATUS_ORDER.indexOf(cand.status) < STATUS_ORDER.indexOf('office_visit_confirmed')) {
        cand.status = 'office_visit_confirmed'
        pushStatusEvent(
          draft,
          cand,
          'office_visit_confirmed',
          actor,
          'Jadwal kunjungan dikonfirmasi P3MI.',
        )
      }
      notify(draft, [agentAccountId(draft, referral.agentId), cand.accountId], {
        title: 'Jadwal kunjungan dikonfirmasi',
        body: `${cand.fullName} — ${new Date(when).toLocaleString('id-ID')} di ${locationLabel}.`,
        linkPath: cand.accountId ? '/cpmi/perkembangan' : `/agen/kandidat/${cand.id}`,
        kind: 'info',
      })
    } else {
      notify(draft, p3miUserIds(draft, actor.orgId), {
        title: 'Jadwal kunjungan perlu dikonfirmasi',
        body: `${actor.name} mengusulkan jadwal untuk ${cand.fullName}.`,
        linkPath: '/p3mi/kunjungan',
        kind: 'action',
      })
    }
    audit(draft, actor, isP3mi ? 'visit.confirmed' : 'visit.proposed', 'visit', cand.id, cand.fullName, {
      scheduled_at: when.toISOString(),
    })
  })
  return { ok: true, data: null }
}

export function setVisitStatus(
  visitId: string,
  status: 'confirmed' | 'attended' | 'no_show' | 'cancelled',
  notes?: string,
): ActionResult {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (!isP3miRole(account.role)) {
    return { ok: false, error: 'Hanya P3MI yang dapat memperbarui status kunjungan.' }
  }
  const visit = state.visits.find((v) => v.id === visitId)
  if (!visit) return { ok: false, error: 'Jadwal tidak ditemukan.' }
  const candidate = state.candidates.find((c) => c.id === visit.candidateId)
  if (!candidate) return { ok: false, error: 'Kandidat tidak ditemukan.' }
  if (candidate.orgId !== account.orgId) {
    return { ok: false, error: 'Akses lintas tenant ditolak.' }
  }

  mutate((draft) => {
    const actor = actorOf(draft)
    const row = draft.visits.find((v) => v.id === visitId)!
    const cand = draft.candidates.find((c) => c.id === visit.candidateId)!
    row.status = status
    if (notes) row.notes = notes
    if (status === 'confirmed') row.confirmedBy = actor.id
    if (status === 'attended') {
      if (STATUS_ORDER.indexOf(cand.status) < STATUS_ORDER.indexOf('initial_verification')) {
        cand.status = 'initial_verification'
        pushStatusEvent(
          draft,
          cand,
          'initial_verification',
          actor,
          'Kandidat hadir ke kantor P3MI; pemeriksaan awal dimulai.',
        )
      }
    }
    notify(draft, [agentAccountId(draft, visit.candidateId), cand.accountId], {
      title: 'Status kunjungan diperbarui',
      body: `${cand.fullName}: ${status === 'attended' ? 'hadir' : status === 'no_show' ? 'tidak hadir' : status}.`,
      linkPath: cand.accountId ? '/cpmi/perkembangan' : `/agen/kandidat/${cand.id}`,
      kind: status === 'no_show' ? 'warning' : 'info',
    })
    audit(draft, actor, `visit.${status}`, 'visit', visitId, cand.fullName)
  })
  return { ok: true, data: null }
}

export function requestHandover(candidateId: string, notes?: string): ActionResult {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (account.role !== 'agent' && account.role !== 'agent_coordinator') {
    return { ok: false, error: 'Hanya agen sumber yang dapat meminta serah terima.' }
  }
  const candidate = visibleCandidates(state, account).find((c) => c.id === candidateId)
  if (!candidate) return { ok: false, error: 'Kandidat di luar cakupan akses Anda.' }
  const referral = state.referrals.find(
    (r) => r.candidateId === candidateId && r.status === 'accepted',
  )
  if (!referral) return { ok: false, error: 'Referral belum diterima P3MI.' }
  const attended = state.visits.some(
    (v) => v.candidateId === candidateId && v.status === 'attended',
  )
  if (!attended && STATUS_ORDER.indexOf(candidate.status) < STATUS_ORDER.indexOf('initial_verification')) {
    return { ok: false, error: 'Kandidat harus hadir ke kantor P3MI sebelum serah terima.' }
  }
  const existing = state.handovers.find(
    (h) => h.candidateId === candidateId && h.status !== 'declined',
  )
  if (existing) return { ok: false, error: 'Sudah ada permintaan serah terima untuk kandidat ini.' }

  mutate((draft) => {
    const actor = actorOf(draft)
    const cand = draft.candidates.find((c) => c.id === candidateId)!
    draft.handovers.unshift({
      id: `ho-${crypto.randomUUID()}`,
      candidateId,
      referralId: referral.id,
      fromAgentId: actor.agentId!,
      requestedAt: new Date().toISOString(),
      notes,
      status: 'requested',
    })
    notify(draft, p3miUserIds(draft, actor.orgId), {
      title: 'Handover menunggu konfirmasi',
      body: `${actor.name} meminta serah terima kandidat ${cand.fullName}.`,
      linkPath: '/p3mi/kunjungan',
      kind: 'action',
    })
    audit(draft, actor, 'handover.requested', 'handover', candidateId, cand.fullName)
    cand.lastActivityAt = new Date().toISOString()
  })
  return { ok: true, data: null }
}

export function respondHandover(
  handoverId: string,
  accept: boolean,
  notes?: string,
): ActionResult {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  const denied = requireP3mi(account)
  if (denied) return { ok: false, error: denied }
  const handover = state.handovers.find((h) => h.id === handoverId)
  if (!handover) return { ok: false, error: 'Permintaan handover tidak ditemukan.' }
  const candidate = state.candidates.find((c) => c.id === handover.candidateId)
  if (!candidate) return { ok: false, error: 'Kandidat tidak ditemukan.' }
  if (candidate.orgId !== account.orgId) {
    return { ok: false, error: 'Akses lintas tenant ditolak.' }
  }

  mutate((draft) => {
    const actor = actorOf(draft)
    const row = draft.handovers.find((h) => h.id === handoverId)!
    const cand = draft.candidates.find((c) => c.id === handover.candidateId)!
    const now = new Date().toISOString()
    if (accept) {
      row.status = 'accepted'
      row.acceptedAt = now
      row.receivedBy = actor.id
      row.proofReference = nextCode('HO-2026-', draft.handovers.map((h) => h.proofReference ?? ''), 4)
      row.notes = notes ?? row.notes
      if (STATUS_ORDER.indexOf(cand.status) < STATUS_ORDER.indexOf('initial_verification')) {
        cand.status = 'initial_verification'
        pushStatusEvent(
          draft,
          cand,
          'initial_verification',
          actor,
          'Serah terima diterima; P3MI mengambil alih pemeriksaan awal.',
        )
      }
    } else {
      row.status = 'declined'
      row.notes = notes
    }
    cand.lastActivityAt = now
    notify(draft, [agentAccountId(draft, row.fromAgentId)], {
      title: accept ? 'Serah terima diterima P3MI' : 'Serah terima ditolak',
      body: `${cand.fullName}${row.proofReference ? ` — ${row.proofReference}` : ''}. ${notes ?? ''}`,
      linkPath: `/agen/kandidat/${cand.id}`,
      kind: accept ? 'success' : 'warning',
    })
    audit(
      draft,
      actor,
      accept ? 'handover.accepted' : 'handover.declined',
      'handover',
      handoverId,
      cand.fullName,
    )
  })
  return { ok: true, data: null }
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export function uploadDocument(
  candidateId: string,
  documentType: DocumentTypeId,
  file: { name: string; size: number; type: string },
): ActionResult<{ documentId: string }> {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (!can(account.role, 'access.documents')) {
    return { ok: false, error: 'Peran ini tidak dapat mengunggah dokumen kandidat.' }
  }
  const candidate = visibleCandidates(state, account).find((c) => c.id === candidateId)
  if (!candidate) return { ok: false, error: 'Kandidat di luar cakupan akses Anda.' }
  if (!ALLOWED_MIME.includes(file.type)) {
    return { ok: false, error: 'Tipe file harus PDF, JPG, atau PNG.' }
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: 'Ukuran file maksimal 3 MB pada pilot ini.' }
  }
  const version =
    Math.max(
      0,
      ...state.documents
        .filter((d) => d.candidateId === candidateId && d.documentType === documentType)
        .map((d) => d.version),
    ) + 1
  const documentId = `doc-${crypto.randomUUID()}`

  mutate((draft) => {
    const actor = actorOf(draft)
    const cand = draft.candidates.find((c) => c.id === candidateId)!
    const now = new Date().toISOString()
    draft.documents.unshift({
      id: documentId,
      candidateId,
      orgId: actor.orgId,
      documentType,
      fileName: file.name.replace(/[^\w.\- ]/g, '_'),
      storagePath: `org/${actor.orgId}/candidate/${candidateId}/${documentId}/${version}`,
      mimeType: file.type,
      sizeBytes: file.size,
      version,
      status: 'pending_review',
      uploadedBy: actor.id,
      uploadedAt: now,
      isDummy: true,
    })
    notify(draft, p3miUserIds(draft, actor.orgId), {
      title: 'Dokumen menunggu pemeriksaan',
      body: `${cand.fullName} mengunggah dokumen versi ${version}.`,
      linkPath: '/p3mi/dokumen',
      kind: 'action',
    })
    audit(draft, actor, 'document.uploaded', 'document', documentId, `${documentType} — ${cand.fullName} v${version}`, {
      size_bytes: file.size,
      mime: file.type,
    })
    cand.lastActivityAt = now
  })
  return { ok: true, data: { documentId } }
}

export function reviewDocument(
  documentId: string,
  decision: Exclude<DocumentStatus, 'uploaded' | 'pending_review'>,
  reason?: string,
): ActionResult {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (!can(account.role, 'review.documents')) {
    return { ok: false, error: 'Hanya reviewer P3MI yang dapat memutuskan dokumen.' }
  }
  if (decision !== 'approved' && !reason?.trim()) {
    return { ok: false, error: 'Alasan wajib diisi untuk permintaan revisi atau penolakan.' }
  }
  const doc = state.documents.find((d) => d.id === documentId)
  if (!doc) return { ok: false, error: 'Dokumen tidak ditemukan.' }
  if (doc.orgId !== account.orgId) {
    return { ok: false, error: 'Akses lintas tenant ditolak.' }
  }
  const candidate = state.candidates.find((c) => c.id === doc.candidateId)
  if (!candidate) return { ok: false, error: 'Kandidat tidak ditemukan.' }

  mutate((draft) => {
    const actor = actorOf(draft)
    const row = draft.documents.find((d) => d.id === documentId)!
    const cand = draft.candidates.find((c) => c.id === doc.candidateId)!
    const now = new Date().toISOString()
    row.status = decision
    row.reviewedAt = now
    draft.documentReviews.unshift({
      id: `dr-${crypto.randomUUID()}`,
      documentId,
      reviewerUserId: actor.id,
      reviewerName: actor.name,
      decision,
      reason: reason?.trim(),
      createdAt: now,
    })
    if (decision === 'revision_required') {
      cand.branchStatus = 'revision_required'
      cand.branchReason = `Dokumen perlu revisi: ${reason?.trim()}`
    } else if (decision === 'approved' && cand.branchStatus === 'revision_required') {
      const stillRevision = draft.documents.some(
        (d) => d.candidateId === cand.id && d.status === 'revision_required',
      )
      if (!stillRevision) {
        cand.branchStatus = undefined
        cand.branchReason = undefined
      }
    }
    notify(draft, [cand.accountId, agentAccountId(draft, cand.agentId ?? '')], {
      title:
        decision === 'approved'
          ? 'Dokumen disetujui'
          : decision === 'rejected'
            ? 'Dokumen ditolak'
            : 'Dokumen perlu diperbaiki',
      body:
        decision === 'approved'
          ? 'Dokumen Anda telah disetujui P3MI.'
          : `Catatan pemeriksa: ${reason?.trim()}`,
      linkPath: cand.accountId ? '/cpmi/dokumen' : `/agen/kandidat/${cand.id}`,
      kind: decision === 'approved' ? 'success' : 'action',
    })
    audit(draft, actor, 'document.reviewed', 'document', documentId, `${doc.documentType} — ${cand.fullName} v${doc.version}`, {
      decision,
      reason: reason?.trim() ?? '',
    })
    cand.lastActivityAt = now
  })
  return { ok: true, data: null }
}

export function logDocumentAccess(
  documentId: string,
  action: 'view' | 'download',
  reason: string,
): ActionResult {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  const doc = state.documents.find((d) => d.id === documentId)
  if (!doc) return { ok: false, error: 'Dokumen tidak ditemukan.' }
  if (!canAccessDocument(state, account, documentId)) {
    return { ok: false, error: 'Anda tidak memiliki akses ke dokumen ini.' }
  }
  if (!reason.trim()) return { ok: false, error: 'Alasan akses wajib dicatat.' }
  mutate((draft) => {
    const actor = actorOf(draft)
    const cand = draft.candidates.find((c) => c.id === doc.candidateId)
    draft.accessEvents.unshift({
      id: `acc-${crypto.randomUUID()}`,
      orgId: actor.orgId,
      actorUserId: actor.id,
      actorName: actor.name,
      candidateId: doc.candidateId,
      documentId,
      action,
      reason: reason.trim(),
      createdAt: new Date().toISOString(),
    })
    audit(
      draft,
      actor,
      `document.${action}`,
      'document',
      documentId,
      `${doc.documentType} — ${cand?.fullName ?? 'kandidat'}`,
      { reason: reason.trim() },
    )
  })
  return { ok: true, data: null }
}

/* ------------------------------------------------------------------ */
/* Pipeline                                                            */
/* ------------------------------------------------------------------ */

export function transitionStatus(
  candidateId: string,
  toStatus: CandidateStatus,
  reason?: string,
): ActionResult {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (!can(account.role, 'update.pipeline')) {
    return { ok: false, error: 'Hanya P3MI yang dapat memperbarui status penempatan.' }
  }
  const candidate = state.candidates.find(
    (c) => c.id === candidateId && c.orgId === account.orgId,
  )
  if (!candidate) return { ok: false, error: 'Kandidat tidak ditemukan pada tenant Anda.' }
  if (candidate.status === toStatus) return { ok: false, error: 'Status tidak berubah.' }
  const currentIndex = STATUS_ORDER.indexOf(candidate.status)
  const nextIndex = STATUS_ORDER.indexOf(toStatus)
  if (nextIndex < currentIndex && !reason?.trim()) {
    return { ok: false, error: 'Alasan wajib diisi saat mengembalikan status ke tahap sebelumnya.' }
  }

  mutate((draft) => {
    const actor = actorOf(draft)
    const cand = draft.candidates.find((c) => c.id === candidateId)!
    const now = new Date().toISOString()
    cand.status = toStatus
    cand.branchStatus = undefined
    cand.branchReason = undefined
    const event = pushStatusEvent(
      draft,
      cand,
      toStatus,
      actor,
      reason?.trim() ?? STATUS_META[toStatus].description,
    )
    ensureLedger(draft, cand, toStatus, actor, event.id)
    notify(draft, [cand.accountId, agentAccountId(draft, cand.agentId ?? '')], {
      title: 'Status proses diperbarui',
      body: `${cand.fullName}: ${STATUS_META[toStatus].cpmiLabel}.`,
      linkPath: cand.accountId ? '/cpmi/perkembangan' : `/agen/kandidat/${cand.id}`,
      kind: 'info',
    })
    audit(draft, actor, 'candidate.status_changed', 'candidate', candidateId, cand.fullName, {
      from_status: candidate.status,
      to_status: toStatus,
      reason: reason?.trim() ?? '',
    })
    cand.lastActivityAt = now
  })
  return { ok: true, data: null }
}

export function setBranchStatus(
  candidateId: string,
  branch: BranchStatus,
  reason: string,
): ActionResult {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (!can(account.role, 'update.pipeline')) {
    return { ok: false, error: 'Hanya P3MI yang dapat mengubah status cabang.' }
  }
  if (!reason.trim()) return { ok: false, error: 'Alasan status cabang wajib diisi.' }
  const candidate = state.candidates.find(
    (c) => c.id === candidateId && c.orgId === account.orgId,
  )
  if (!candidate) return { ok: false, error: 'Kandidat tidak ditemukan.' }

  mutate((draft) => {
    const actor = actorOf(draft)
    const cand = draft.candidates.find((c) => c.id === candidateId)!
    cand.branchStatus = branch
    cand.branchReason = reason.trim()
    pushStatusEvent(
      draft,
      cand,
      branch,
      actor,
      reason.trim(),
      branch === 'rejected' || branch === 'withdrawn' ? 'candidate' : 'internal',
    )
    notify(draft, [cand.accountId, agentAccountId(draft, cand.agentId ?? '')], {
      title: 'Status proses memiliki catatan',
      body: `${cand.fullName}: ${reason.trim()}`,
      linkPath: cand.accountId ? '/cpmi/perkembangan' : `/agen/kandidat/${cand.id}`,
      kind: 'warning',
    })
    audit(draft, actor, 'candidate.branch_changed', 'candidate', candidateId, cand.fullName, {
      branch,
      reason: reason.trim(),
    })
  })
  return { ok: true, data: null }
}

export function clearBranchStatus(candidateId: string, reason?: string): ActionResult {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (!can(account.role, 'update.pipeline')) {
    return { ok: false, error: 'Hanya P3MI yang dapat mengubah status cabang.' }
  }
  mutate((draft) => {
    const actor = actorOf(draft)
    const cand = draft.candidates.find((c) => c.id === candidateId)!
    const previous = cand.branchStatus
    cand.branchStatus = undefined
    cand.branchReason = undefined
    pushStatusEvent(
      draft,
      cand,
      cand.status,
      actor,
      reason?.trim() ?? `Status cabang ${previous ?? ''} diselesaikan.`,
      'internal',
    )
    audit(draft, actor, 'candidate.branch_cleared', 'candidate', candidateId, cand.fullName, {
      previous: previous ?? '',
    })
  })
  return { ok: true, data: null }
}

/* ------------------------------------------------------------------ */
/* Commission                                                          */
/* ------------------------------------------------------------------ */

export function approveLedger(entryId: string): ActionResult {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (account.role !== 'p3mi_admin') {
    return { ok: false, error: 'Hanya admin P3MI yang dapat menyetujui hak tagih.' }
  }
  const entry = state.ledger.find((l) => l.id === entryId)
  if (!entry) return { ok: false, error: 'Catatan fee tidak ditemukan.' }
  if (entry.orgId !== account.orgId) {
    return { ok: false, error: 'Akses lintas tenant ditolak.' }
  }
  if (!['earned', 'submitted', 'under_review'].includes(entry.status)) {
    return { ok: false, error: 'Catatan fee ini tidak dalam status yang dapat disetujui.' }
  }
  mutate((draft) => {
    const actor = actorOf(draft)
    const row = draft.ledger.find((l) => l.id === entryId)!
    row.status = 'approved'
    notify(draft, [agentAccountId(draft, row.agentId)], {
      title: 'Fee disetujui P3MI',
      body: `${row.code} — ${row.label} telah disetujui dan menunggu pembayaran.`,
      linkPath: '/agen/komisi',
      kind: 'success',
    })
    audit(draft, actor, 'commission.approved', 'ledger', entryId, row.code, {
      amount: row.amount,
    })
  })
  return { ok: true, data: null }
}

export function recordPayment(
  agentId: string,
  amount: number,
  reference: string,
  paidAt: string,
): ActionResult<{ paymentId: string; allocated: number }> {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (account.role !== 'p3mi_admin') {
    return { ok: false, error: 'Hanya admin P3MI yang dapat mencatat pembayaran.' }
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Nominal pembayaran harus lebih dari nol.' }
  }
  const payable = state.ledger
    .filter(
      (l) =>
        l.orgId === account.orgId &&
        l.agentId === agentId &&
        ['earned', 'approved', 'due', 'partially_paid'].includes(l.status),
    )
    .sort((a, b) => new Date(a.dueAt ?? a.earnedAt).getTime() - new Date(b.dueAt ?? b.earnedAt).getTime())
  const outstanding = payable.reduce((sum, l) => sum + (l.amount - l.paidAmount), 0)
  if (payable.length === 0) return { ok: false, error: 'Tidak ada fee yang dapat dibayar untuk agen ini.' }
  if (amount > outstanding) {
    return {
      ok: false,
      error: `Nominal melebihi outstanding (Rp${outstanding.toLocaleString('id-ID')}).`,
    }
  }

  let remaining = amount
  const allocations: { ledgerId: string; amount: number }[] = []
  payable.forEach((l) => {
    if (remaining <= 0) return
    const room = l.amount - l.paidAmount
    const take = Math.min(room, remaining)
    if (take > 0) {
      allocations.push({ ledgerId: l.id, amount: take })
      remaining -= take
    }
  })

  const paymentId = `pay-${crypto.randomUUID()}`
  mutate((draft) => {
    const actor = actorOf(draft)
    const paymentRef =
      reference.trim() ||
      nextCode(
        `BAYAR-${new Date().getFullYear()}-`,
        draft.payments.map((p) => p.reference),
        4,
      )
    allocations.forEach((alloc) => {
      const row = draft.ledger.find((l) => l.id === alloc.ledgerId)!
      row.paidAmount += alloc.amount
      row.status = row.paidAmount >= row.amount ? 'paid' : 'partially_paid'
    })
    draft.payments.unshift({
      id: paymentId,
      orgId: actor.orgId,
      agentId,
      reference: paymentRef,
      paidAt: new Date(paidAt).toISOString(),
      amount,
      currency: 'IDR',
      recordedBy: actor.id,
      proofPath: `org/${actor.orgId}/payments/${paymentRef}.pdf`,
      allocations,
    })
    notify(draft, [agentAccountId(draft, agentId)], {
      title: 'Pembayaran fee dicatat',
      body: `${paymentRef} sebesar Rp${amount.toLocaleString('id-ID')} telah dicatat P3MI.`,
      linkPath: '/agen/komisi',
      kind: 'success',
    })
    audit(draft, actor, 'commission.payment_recorded', 'payment', paymentId, paymentRef, {
      amount,
      allocation_count: allocations.length,
    })
  })
  return { ok: true, data: { paymentId, allocated: amount } }
}

/* ------------------------------------------------------------------ */
/* Complaints                                                          */
/* ------------------------------------------------------------------ */

export function createComplaint(
  candidateId: string,
  category: Complaint['category'],
  urgency: Complaint['urgency'],
  description: string,
): ActionResult<{ code: string }> {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (!can(account.role, 'create.complaint')) {
    return { ok: false, error: 'Peran ini tidak dapat membuat pengaduan.' }
  }
  if (description.trim().length < 10) {
    return { ok: false, error: 'Uraian pengaduan minimal 10 karakter.' }
  }
  const candidate = visibleCandidates(state, account).find((c) => c.id === candidateId)
  if (!candidate) return { ok: false, error: 'Kandidat di luar cakupan akses Anda.' }
  const code = nextCode(
    `ADU-${new Date().getFullYear()}-`,
    state.complaints.map((c) => c.code),
    6,
  )
  mutate((draft) => {
    const actor = actorOf(draft)
    draft.complaints.unshift({
      id: `comp-${crypto.randomUUID()}`,
      orgId: actor.orgId,
      candidateId,
      code,
      category,
      description: description.trim(),
      urgency,
      status: 'open',
      assignedTo: p3miUserIds(draft, actor.orgId)[0],
      createdAt: new Date().toISOString(),
      createdBy: actor.id,
      createdByName: actor.name,
    })
    notify(draft, p3miUserIds(draft, actor.orgId), {
      title: 'Pengaduan baru',
      body: `${code} — ${candidate.fullName}: ${description.trim().slice(0, 80)}`,
      linkPath: '/p3mi/pengaduan',
      kind: urgency === 'high' ? 'warning' : 'action',
    })
    audit(draft, actor, 'complaint.created', 'complaint', code, candidate.fullName, {
      category,
      urgency,
    })
  })
  return { ok: true, data: { code } }
}

export function updateComplaint(
  complaintId: string,
  status: ComplaintStatus,
  resolution?: string,
): ActionResult {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (!can(account.role, 'manage.complaints')) {
    return { ok: false, error: 'Hanya P3MI yang dapat menindaklanjuti pengaduan.' }
  }
  if (status === 'resolved' && !resolution?.trim()) {
    return { ok: false, error: 'Ringkasan penyelesaian wajib diisi.' }
  }
  const complaint = state.complaints.find((c) => c.id === complaintId)
  if (!complaint) return { ok: false, error: 'Pengaduan tidak ditemukan.' }
  if (complaint.orgId !== account.orgId) {
    return { ok: false, error: 'Akses lintas tenant ditolak.' }
  }
  mutate((draft) => {
    const actor = actorOf(draft)
    const row = draft.complaints.find((c) => c.id === complaintId)!
    row.status = status
    if (resolution) row.resolution = resolution.trim()
    if (status === 'resolved' || status === 'closed') row.resolvedAt = new Date().toISOString()
    const candidate = draft.candidates.find((c) => c.id === row.candidateId)
    notify(draft, [candidate?.accountId, agentAccountId(draft, candidate?.agentId ?? '')], {
      title: 'Pengaduan diperbarui',
      body: `${row.code}: ${status === 'resolved' ? 'selesai' : 'sedang ditindaklanjuti'}.`,
      linkPath: candidate?.accountId ? '/cpmi/bantuan' : '/agen/bantuan',
      kind: status === 'resolved' ? 'success' : 'info',
    })
    audit(draft, actor, `complaint.${status}`, 'complaint', complaintId, row.code)
  })
  return { ok: true, data: null }
}

/* ------------------------------------------------------------------ */
/* Consent & profile                                                   */
/* ------------------------------------------------------------------ */

export function revokeConsent(candidateId: string, reason: string): ActionResult {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  const candidate = visibleCandidates(state, account).find((c) => c.id === candidateId)
  if (!candidate) return { ok: false, error: 'Data kandidat tidak ditemukan.' }
  if (account.role !== 'cpmi' && account.role !== 'p3mi_admin') {
    return { ok: false, error: 'Hanya CPMI atau admin P3MI yang dapat menarik persetujuan.' }
  }
  if (!reason.trim()) return { ok: false, error: 'Alasan penarikan persetujuan wajib diisi.' }
  mutate((draft) => {
    const actor = actorOf(draft)
    const now = new Date().toISOString()
    draft.consents
      .filter((c) => c.candidateId === candidateId && !c.revokedAt)
      .forEach((c) => {
        c.revokedAt = now
      })
    const cand = draft.candidates.find((c) => c.id === candidateId)!
    cand.branchStatus = 'on_hold'
    cand.branchReason = 'Persetujuan pemrosesan data ditarik. Proses dijeda untuk telaah.'
    pushStatusEvent(draft, cand, 'on_hold', actor, reason.trim(), 'candidate')
    notify(draft, p3miUserIds(draft, actor.orgId), {
      title: 'Persetujuan data ditarik',
      body: `${cand.fullName} menarik persetujuan. Proses dijeda sampai telaah selesai.`,
      linkPath: `/p3mi/kandidat/${cand.id}`,
      kind: 'warning',
    })
    audit(draft, actor, 'consent.revoked', 'candidate', candidateId, cand.fullName, {
      reason: reason.trim(),
    })
  })
  return { ok: true, data: null }
}

export function updateCandidateProfile(
  candidateId: string,
  patch: Partial<Pick<Candidate, 'phone' | 'address' | 'education' | 'region' | 'internalNote'>>,
): ActionResult {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  const candidate = visibleCandidates(state, account).find((c) => c.id === candidateId)
  if (!candidate) return { ok: false, error: 'Data kandidat tidak ditemukan.' }
  if (account.role === 'cpmi' && candidate.accountId !== account.id) {
    return { ok: false, error: 'Anda hanya dapat mengubah data milik sendiri.' }
  }
  mutate((draft) => {
    const actor = actorOf(draft)
    const cand = draft.candidates.find((c) => c.id === candidateId)!
    Object.assign(cand, patch)
    cand.lastActivityAt = new Date().toISOString()
    audit(draft, actor, 'candidate.profile_updated', 'candidate', candidateId, cand.fullName)
  })
  return { ok: true, data: null }
}

export function verifyAgent(agentId: string, status: 'active' | 'pending' | 'inactive'): ActionResult {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (!can(account.role, 'manage.agents')) {
    return { ok: false, error: 'Hanya admin P3MI yang dapat mengelola agen.' }
  }
  const agent = state.agents.find((a) => a.id === agentId && a.orgId === account.orgId)
  if (!agent) return { ok: false, error: 'Agen tidak ditemukan.' }
  mutate((draft) => {
    const actor = actorOf(draft)
    const row = draft.agents.find((a) => a.id === agentId)!
    row.status = status
    notify(draft, [row.accountId], {
      title: 'Status kemitraan diperbarui',
      body: `Status agen Anda kini: ${status}.`,
      linkPath: '/agen/akun',
      kind: status === 'active' ? 'success' : 'info',
    })
    audit(draft, actor, 'agent.status_changed', 'agent', agentId, row.name, { status })
  })
  return { ok: true, data: null }
}

export type AgentAgreementInput = Omit<
  AgentAgreement,
  'id' | 'orgId' | 'createdAt'
> & { id?: string }

export function saveAgentAgreement(input: AgentAgreementInput): ActionResult<{ id: string }> {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (!can(account.role, 'manage.agents')) {
    return { ok: false, error: 'Hanya admin P3MI yang dapat mengelola perjanjian agen.' }
  }
  const agreementNumber = input.agreementNumber.trim()
  if (!input.agentId || !agreementNumber || !input.validFrom) {
    return { ok: false, error: 'Agen, nomor perjanjian, dan tanggal mulai wajib diisi.' }
  }
  const agent = state.agents.find((a) => a.id === input.agentId && a.orgId === account.orgId)
  if (!agent) return { ok: false, error: 'Agen tidak ditemukan pada tenant ini.' }
  if (input.id) {
    const existing = state.agentAgreements.find(
      (a) => a.id === input.id && a.orgId === account.orgId,
    )
    if (!existing) return { ok: false, error: 'Perjanjian tidak ditemukan.' }
  }

  const agreementId = input.id ?? `agr-${crypto.randomUUID()}`
  mutate((draft) => {
    const actor = actorOf(draft)
    const payload = {
      agentId: input.agentId,
      agreementNumber,
      validFrom: input.validFrom,
      validUntil: input.validUntil || null,
      status: input.status,
    }
    const row = draft.agentAgreements.find((a) => a.id === agreementId)
    if (row) {
      Object.assign(row, payload)
      audit(draft, actor, 'agent_agreement.updated', 'agent_agreement', row.id, row.agreementNumber, {
        status: row.status,
      })
    } else {
      draft.agentAgreements.unshift({
        id: agreementId,
        orgId: account.orgId,
        createdAt: new Date().toISOString(),
        ...payload,
      })
      audit(draft, actor, 'agent_agreement.created', 'agent_agreement', agreementId, agreementNumber, {
        agent: agent.name,
        status: input.status,
      })
    }
  })
  return { ok: true, data: { id: agreementId } }
}

export function deleteAgentAgreement(agreementId: string): ActionResult {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (!can(account.role, 'manage.agents')) {
    return { ok: false, error: 'Hanya admin P3MI yang dapat menghapus perjanjian agen.' }
  }
  const agreement = state.agentAgreements.find(
    (a) => a.id === agreementId && a.orgId === account.orgId,
  )
  if (!agreement) return { ok: false, error: 'Perjanjian tidak ditemukan.' }
  mutate((draft) => {
    const actor = actorOf(draft)
    const idx = draft.agentAgreements.findIndex((a) => a.id === agreementId)
    if (idx === -1) return
    const [removed] = draft.agentAgreements.splice(idx, 1)
    audit(draft, actor, 'agent_agreement.deleted', 'agent_agreement', removed.id, removed.agreementNumber)
  })
  return { ok: true, data: null }
}

export function setOrgStatus(orgId: string, status: 'active' | 'onboarding' | 'suspended'): ActionResult {  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (account.role !== 'arblok_admin') {
    return { ok: false, error: 'Hanya admin Arblok yang dapat mengubah status organisasi.' }
  }
  const org = state.organizations.find((o) => o.id === orgId)
  if (!org) return { ok: false, error: 'Organisasi tidak ditemukan.' }
  mutate((draft) => {
    const actor = actorOf(draft)
    const row = draft.organizations.find((o) => o.id === orgId)!
    row.status = status
    audit(draft, actor, 'organization.status_changed', 'organization', orgId, row.legalName, {
      status,
    })
  })
  return { ok: true, data: null }
}

/* ------------------------------------------------------------------ */
/* Vacancies                                                           */
/* ------------------------------------------------------------------ */

export type VacancyInput = Omit<Vacancy, 'id' | 'orgId' | 'publishedAt'> & { id?: string }

export function saveVacancy(input: VacancyInput): ActionResult<{ id: string }> {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (!can(account.role, 'manage.vacancies')) {
    return { ok: false, error: 'Hanya admin P3MI yang dapat mengelola lowongan.' }
  }
  const title = input.title.trim()
  const requirements = input.requirements.map((r) => r.trim()).filter(Boolean)
  if (!title || !input.jobOrderId || !input.country || !input.sector) {
    return { ok: false, error: 'Judul, job order, negara, dan sektor wajib diisi.' }
  }
  if (requirements.length === 0) {
    return { ok: false, error: 'Minimal satu persyaratan wajib diisi.' }
  }
  const jobOrder = state.jobOrders.find(
    (j) => j.id === input.jobOrderId && j.orgId === account.orgId,
  )
  if (!jobOrder) return { ok: false, error: 'Job order tidak ditemukan pada tenant ini.' }
  if (jobOrder.status !== 'verified') {
    return { ok: false, error: 'Lowongan hanya dapat dibuat dari job order terverifikasi.' }
  }
  if (input.id) {
    const existing = state.vacancies.find(
      (v) => v.id === input.id && v.orgId === account.orgId,
    )
    if (!existing) return { ok: false, error: 'Lowongan tidak ditemukan.' }
  }

  const vacancyId = input.id ?? `vac-${crypto.randomUUID()}`
  mutate((draft) => {
    const actor = actorOf(draft)
    const payload = {
      jobOrderId: input.jobOrderId,
      title,
      country: input.country,
      sector: input.sector,
      requirements,
      wageCurrency: input.wageCurrency,
      wageMin: input.wageMin,
      wageMax: input.wageMax,
      wageType: input.wageType,
      status: input.status,
      slots: input.slots,
    }
    const row = draft.vacancies.find((v) => v.id === vacancyId)
    if (row) {
      Object.assign(row, payload)
      audit(draft, actor, 'vacancy.updated', 'vacancy', row.id, row.title, {
        status: row.status,
      })
    } else {
      draft.vacancies.unshift({
        id: vacancyId,
        orgId: account.orgId,
        publishedAt: new Date().toISOString(),
        ...payload,
      })
      audit(draft, actor, 'vacancy.created', 'vacancy', vacancyId, title, {
        status: input.status,
      })
    }
  })
  return { ok: true, data: { id: vacancyId } }
}

export function deleteVacancy(vacancyId: string): ActionResult {
  const account = currentAccount()
  if (!account) return { ok: false, error: 'Sesi berakhir.' }
  if (!can(account.role, 'manage.vacancies')) {
    return { ok: false, error: 'Hanya admin P3MI yang dapat menghapus lowongan.' }
  }
  const vacancy = state.vacancies.find(
    (v) => v.id === vacancyId && v.orgId === account.orgId,
  )
  if (!vacancy) return { ok: false, error: 'Lowongan tidak ditemukan.' }
  mutate((draft) => {
    const actor = actorOf(draft)
    const idx = draft.vacancies.findIndex((v) => v.id === vacancyId)
    if (idx === -1) return
    const [removed] = draft.vacancies.splice(idx, 1)
    audit(draft, actor, 'vacancy.deleted', 'vacancy', removed.id, removed.title)
  })
  return { ok: true, data: null }
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export function markNotificationRead(id: string) {
  mutate((draft) => {
    const row = draft.notifications.find((n) => n.id === id)
    if (row) row.readAt = new Date().toISOString()
  })
}

export function markAllNotificationsRead() {
  mutate((draft) => {
    const account = currentAccount(draft)
    if (!account) return
    const now = new Date().toISOString()
    draft.notifications
      .filter((n) => n.userId === account.id && !n.readAt)
      .forEach((n) => {
        n.readAt = now
      })
  })
}

/* ------------------------------------------------------------------ */
/* Demo helpers                                                        */
/* ------------------------------------------------------------------ */

export function documentVersions(state: AppState, candidateId: string, type: DocumentTypeId) {
  return state.documents
    .filter((d) => d.candidateId === candidateId && d.documentType === type)
    .sort((a, b) => b.version - a.version)
}

export function latestDocument(
  state: AppState,
  candidateId: string,
  type: DocumentTypeId,
): CandidateDocument | undefined {
  return documentVersions(state, candidateId, type)[0]
}

export function unreadCount(state: AppState, userId?: string): number {
  if (!userId) return 0
  return state.notifications.filter((n) => n.userId === userId && !n.readAt).length
}

export function myNotifications(state: AppState, userId?: string): AppNotification[] {
  if (!userId) return []
  return state.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function roleHome(role: Role): string {
  switch (role) {
    case 'arblok_admin':
      return '/platform'
    case 'p3mi_admin':
    case 'p3mi_reviewer':
      return '/p3mi'
    case 'agent_coordinator':
    case 'agent':
      return '/agen'
    case 'cpmi':
      return '/cpmi'
  }
}

export function accountsForLogin(s: AppState = state) {
  return s.accounts
    .filter((a) => a.status === 'active')
    .map((a) => ({
      id: a.id,
      email: a.email,
      name: a.name,
      role: a.role,
      title: a.title,
      orgId: a.orgId,
    }))
}

export { MAX_FILE_BYTES, ALLOWED_MIME }
