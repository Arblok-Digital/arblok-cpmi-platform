import { beforeEach, describe, expect, it } from 'vitest'
import {
  approveLedger,
  getState,
  logDocumentAccess,
  recordPayment,
  respondHandover,
  respondReferral,
  resetDemo,
  reviewDocument,
  setVisitStatus,
  transitionStatus,
  updateComplaint,
  uploadDocument,
} from './store'
import type { Account } from './types'

const DENIED = 'Akses lintas tenant ditolak.'

/** Injects a second-tenant P3MI admin into the demo state and signs them in. */
function signInAsOtherOrgAdmin(): Account {
  const state = getState()
  const template = state.accounts.find((row) => row.id === 'acc-p3mi')
  if (!template) throw new Error('Seed P3MI account not found')
  const outsider: Account = {
    ...template,
    id: 'acc-outsider',
    name: 'Outsider Admin',
    email: 'outsider@example.test',
    orgId: 'org-karya',
  }
  state.accounts.push(outsider)
  state.currentUserId = outsider.id
  return outsider
}

beforeEach(() => {
  resetDemo()
})

describe('cross-tenant mutation guards', () => {
  it('blocks foreign P3MI admins from reviewing documents or logging access', () => {
    signInAsOtherOrgAdmin()
    const reviewsBefore = getState().documentReviews.length
    const accessBefore = getState().accessEvents.length

    expect(reviewDocument('doc-siti-ijazah', 'approved')).toEqual({ ok: false, error: DENIED })
    expect(getState().documentReviews).toHaveLength(reviewsBefore)
    expect(getState().documents.find((row) => row.id === 'doc-siti-ijazah')?.status).toBe(
      'revision_required',
    )

    expect(logDocumentAccess('doc-siti-ktp', 'view', 'Cek lintas tenant')).toEqual({
      ok: false,
      error: 'Anda tidak memiliki akses ke dokumen ini.',
    })
    expect(getState().accessEvents).toHaveLength(accessBefore)
  })

  it('blocks foreign P3MI admins from changing visits and handovers', () => {
    signInAsOtherOrgAdmin()

    expect(setVisitStatus('visit-siti', 'attended')).toEqual({ ok: false, error: DENIED })
    expect(getState().visits.find((row) => row.id === 'visit-siti')?.status).toBe('confirmed')

    expect(respondHandover('ho-diah', true)).toEqual({ ok: false, error: DENIED })
    expect(getState().handovers.find((row) => row.id === 'ho-diah')?.status).toBe('requested')
  })

  it('blocks foreign P3MI admins from approving fees or recording payments', () => {
    signInAsOtherOrgAdmin()

    expect(approveLedger('kms-mira-handover')).toEqual({ ok: false, error: DENIED })
    expect(getState().ledger.find((row) => row.id === 'kms-mira-handover')?.status).toBe('earned')

    expect(
      recordPayment('ag-neng', 100_000, 'CROSS-TENANT-1', new Date().toISOString()).ok,
    ).toBe(false)
    expect(getState().payments.some((row) => row.reference === 'CROSS-TENANT-1')).toBe(false)
  })

  it('blocks pipeline, referral, and complaint changes across tenants', () => {
    signInAsOtherOrgAdmin()

    expect(transitionStatus('cand-siti', 'employer_handover')).toEqual({
      ok: false,
      error: 'Kandidat tidak ditemukan pada tenant Anda.',
    })
    expect(respondReferral('ref-cand-nengyul', 'accepted')).toEqual({ ok: false, error: DENIED })
    expect(updateComplaint('comp-001', 'resolved', 'Selesai dari tenant lain')).toEqual({
      ok: false,
      error: DENIED,
    })
    expect(getState().complaints.find((row) => row.id === 'comp-001')?.status).toBe('open')
  })

  it('blocks document uploads for candidates outside the tenant', () => {
    signInAsOtherOrgAdmin()

    const before = getState().documents.length
    expect(
      uploadDocument('cand-siti', 'ktp', {
        name: 'ktp-lintas-tenant.pdf',
        size: 100_000,
        type: 'application/pdf',
      }).ok,
    ).toBe(false)
    expect(getState().documents).toHaveLength(before)
  })
})
