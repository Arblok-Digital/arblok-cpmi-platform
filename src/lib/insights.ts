import type { Account, AppState, Candidate } from './types'
import { STATUS_GROUPS, STATUS_META, type StatusGroupId } from './constants'
import { can, isP3miRole, visibleCandidates, visibleComplaints, visibleLedger, visibleReferrals } from './permissions'

export type ActionTone = 'warning' | 'info' | 'danger' | 'success'
export type ActionKind =
  | 'referral'
  | 'document'
  | 'visit'
  | 'handover'
  | 'fee'
  | 'complaint'
  | 'schedule'
  | 'consent'

export interface ActionItem {
  id: string
  title: string
  detail: string
  href: string
  tone: ActionTone
  kind: ActionKind
  at: string
}

export function agentActions(state: AppState, account: Account): ActionItem[] {
  const candidates = visibleCandidates(state, account)
  const referrals = visibleReferrals(state, account)
  const items: ActionItem[] = []

  candidates.forEach((candidate) => {
    const referral = referrals.find((r) => r.candidateId === candidate.id)
    if (!referral) return
    if (referral.status === 'rejected') {
      items.push({
        id: `rejected-${candidate.id}`,
        title: `Tinjau penolakan ${candidate.nickname}`,
        detail: referral.rejectionReason ?? 'P3MI menolak referral ini.',
        href: `/agen/kandidat/${candidate.id}`,
        tone: 'danger',
        kind: 'referral',
        at: referral.decidedAt ?? referral.submittedAt ?? candidate.createdAt,
      })
      return
    }
    if (referral.status !== 'accepted') return

    const visits = state.visits.filter((v) => v.candidateId === candidate.id)
    const activeVisit = visits.find((v) => v.status === 'proposed' || v.status === 'confirmed')
    const attended = visits.some((v) => v.status === 'attended')
    const handover = state.handovers.find((h) => h.candidateId === candidate.id && h.status !== 'declined')

    if (candidate.branchStatus === 'revision_required') {
      items.push({
        id: `revision-${candidate.id}`,
        title: `Dokumen ${candidate.nickname} perlu diperbaiki`,
        detail: candidate.branchReason ?? 'Bantu CPMI mengunggah ulang dokumen.',
        href: `/agen/kandidat/${candidate.id}`,
        tone: 'warning',
        kind: 'document',
        at: candidate.lastActivityAt,
      })
      return
    }
    if (!activeVisit && !attended) {
      items.push({
        id: `schedule-${candidate.id}`,
        title: `Jadwalkan kunjungan ${candidate.nickname}`,
        detail: 'Referral sudah diterima. Usulkan jadwal kunjungan ke kantor P3MI.',
        href: `/agen/kandidat/${candidate.id}`,
        tone: 'warning',
        kind: 'schedule',
        at: candidate.lastActivityAt,
      })
      return
    }
    if (attended && !handover) {
      items.push({
        id: `handover-${candidate.id}`,
        title: `Ajukan serah terima ${candidate.nickname}`,
        detail: 'Kandidat sudah hadir. Minta konfirmasi serah terima kepada P3MI.',
        href: `/agen/kandidat/${candidate.id}`,
        tone: 'info',
        kind: 'handover',
        at: candidate.lastActivityAt,
      })
    }
  })

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

export function p3miActions(state: AppState, account: Account): ActionItem[] {
  if (!isP3miRole(account.role)) return []
  const items: ActionItem[] = []
  const orgId = account.orgId

  state.referrals
    .filter((r) => r.orgId === orgId && r.status === 'submitted')
    .forEach((r) => {
      const candidate = state.candidates.find((c) => c.id === r.candidateId)
      if (!candidate) return
      items.push({
        id: `ref-${r.id}`,
        title: `Respons referral ${candidate.fullName}`,
        detail: `${r.code}${r.duplicateWarning ? ' · peringatan duplikat' : ''}`,
        href: `/p3mi/referral/${r.id}`,
        tone: r.duplicateWarning ? 'danger' : 'warning',
        kind: 'referral',
        at: r.submittedAt ?? candidate.createdAt,
      })
    })

  state.documents
    .filter((d) => d.orgId === orgId && d.status === 'pending_review')
    .forEach((d) => {
      const candidate = state.candidates.find((c) => c.id === d.candidateId)
      items.push({
        id: `doc-${d.id}`,
        title: `Periksa dokumen ${candidate?.fullName ?? ''}`,
        detail: `${d.documentType.replace(/_/g, ' ')} · versi ${d.version}`,
        href: '/p3mi/dokumen',
        tone: 'info',
        kind: 'document',
        at: d.uploadedAt,
      })
    })

  state.visits
    .filter((v) => v.status === 'proposed')
    .forEach((v) => {
      const candidate = state.candidates.find((c) => c.id === v.candidateId)
      items.push({
        id: `visit-${v.id}`,
        title: `Konfirmasi jadwal ${candidate?.fullName ?? ''}`,
        detail: new Date(v.scheduledAt).toLocaleString('id-ID', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
        href: '/p3mi/kunjungan',
        tone: 'warning',
        kind: 'visit',
        at: v.createdAt,
      })
    })

  state.handovers
    .filter((h) => h.status === 'requested')
    .forEach((h) => {
      const candidate = state.candidates.find((c) => c.id === h.candidateId)
      items.push({
        id: `ho-${h.id}`,
        title: `Konfirmasi serah terima ${candidate?.fullName ?? ''}`,
        detail: 'Agen sudah mengajukan handover.',
        href: '/p3mi/kunjungan',
        tone: 'warning',
        kind: 'handover',
        at: h.requestedAt,
      })
    })

  if (can(account.role, 'manage.fees')) {
    state.ledger
      .filter((l) => l.orgId === orgId && l.status === 'earned')
      .forEach((l) => {
        items.push({
          id: `fee-${l.id}`,
          title: `Setujui fee ${l.code}`,
          detail: `${l.label} · Rp${l.amount.toLocaleString('id-ID')}`,
          href: '/p3mi/fee',
          tone: 'info',
          kind: 'fee',
          at: l.earnedAt,
        })
      })
  }

  visibleComplaints(state, account)
    .filter((c) => c.status === 'open')
    .forEach((c) => {
      items.push({
        id: `comp-${c.id}`,
        title: `Tindak lanjuti ${c.code}`,
        detail: c.description.slice(0, 90),
        href: '/p3mi/pengaduan',
        tone: c.urgency === 'high' ? 'danger' : 'warning',
        kind: 'complaint',
        at: c.createdAt,
      })
    })

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

export function groupCounts(candidates: Candidate[]): { id: StatusGroupId; label: string; value: number }[] {
  return STATUS_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    value: candidates.filter(
      (c) => !c.branchStatus && STATUS_META[c.status].group === group.id,
    ).length,
  }))
}

export function activeCandidates(candidates: Candidate[]): Candidate[] {
  return candidates.filter(
    (c) => c.branchStatus !== 'rejected' && c.branchStatus !== 'closed' && c.branchStatus !== 'withdrawn',
  )
}

export function outstandingTotal(state: AppState, account: Account): number {
  return visibleLedger(state, account)
    .filter((l) => ['earned', 'approved', 'due', 'partially_paid'].includes(l.status))
    .reduce((sum, l) => sum + (l.amount - l.paidAmount), 0)
}
