import { beforeEach, describe, expect, it } from 'vitest'
import {
  createReferral,
  deleteAgentAgreement,
  deleteVacancy,
  getState,
  login,
  logDocumentAccess,
  logout,
  recordPayment,
  resetDemo,
  reviewDocument,
  saveAgentAgreement,
  saveVacancy,
  transitionStatus,
  uploadDocument,
} from './store'
import type { NewReferralInput } from './types'

const PASSWORD = 'demo1234'
const PAYABLE_STATUSES = ['earned', 'approved', 'due', 'partially_paid']

function signIn(email: string) {
  const result = login(email, PASSWORD)
  if (!result.ok) throw new Error(result.error)
  return result.data
}

function referralInput(overrides: Partial<NewReferralInput> = {}): NewReferralInput {
  const base: NewReferralInput = {
    fullName: 'Rina Uji Coba',
    phone: '081298765432',
    region: 'Tasikmalaya Kota',
    consent: {
      dataProcessing: true,
      dataSharing: true,
      purpose: 'Uji alur referral',
      recipient: 'PT Mitra Bhayangkara Nusantara',
      noticeVersion: 'v1.0',
    },
  }
  return { ...base, ...overrides, consent: { ...base.consent, ...overrides.consent } }
}

beforeEach(() => {
  resetDemo()
})

describe('auth', () => {
  it('accepts only active demo accounts with the demo password', () => {
    expect(login('tidak-ada@example.test', PASSWORD).ok).toBe(false)
    expect(login('asep@mitraagen.id', 'salah').ok).toBe(false)
    expect(getState().currentUserId).toBeNull()

    signIn('asep@mitraagen.id')
    expect(getState().currentUserId).toBe('acc-agent-asep')

    logout()
    expect(getState().currentUserId).toBeNull()
  })
})

describe('createReferral', () => {
  it('stores a candidate, referral, and both consent records', () => {
    signIn('asep@mitraagen.id')
    const before = getState().candidates.length
    const result = createReferral(referralInput())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.duplicate).toBe(false)

    const state = getState()
    expect(state.candidates).toHaveLength(before + 1)
    const referral = state.referrals.find((row) => row.id === result.data.referralId)
    expect(referral?.status).toBe('submitted')
    expect(referral?.agentId).toBe('ag-asep')
    expect(referral?.attributionLocked).toBe(false)

    const candidate = state.candidates.find((row) => row.id === referral?.candidateId)
    expect(candidate?.agentId).toBe('ag-asep')
    expect(candidate?.status).toBe('lead_registered')
    expect(candidate?.candidateCode).toMatch(/^CP-\d{4}-\d{5}$/)

    const consentTypes = state.consents
      .filter((row) => row.candidateId === candidate?.id)
      .map((row) => row.consentType)
      .sort()
    expect(consentTypes).toEqual(['data_processing', 'data_sharing'])
  })

  it('flags a phone number that already exists in the tenant', () => {
    signIn('asep@mitraagen.id')
    const result = createReferral(
      referralInput({ fullName: 'Siti Duplikat', phone: '081234567801' }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.duplicate).toBe(true)

    const state = getState()
    const referral = state.referrals.find((row) => row.id === result.data.referralId)
    expect(referral?.duplicateOfId).toBe('cand-siti')
    expect(referral?.duplicateWarning).toBe(true)
    expect(
      state.referralEvents.some(
        (event) => event.referralId === referral?.id && event.type === 'duplicate_warning',
      ),
    ).toBe(true)
  })

  it('rejects a referral without both consent records and stores nothing', () => {
    signIn('asep@mitraagen.id')
    const before = getState().candidates.length
    const input = referralInput()
    input.consent.dataSharing = false

    expect(createReferral(input).ok).toBe(false)
    expect(getState().candidates).toHaveLength(before)
  })

  it('rejects referral creation from non-agent roles', () => {
    signIn('hendra@mitrabhayangkara.co.id')
    expect(createReferral(referralInput()).ok).toBe(false)
  })
})

describe('transitionStatus', () => {
  it('requires a reason before moving a candidate back in the pipeline', () => {
    signIn('hendra@mitrabhayangkara.co.id')

    expect(transitionStatus('cand-rina', 'lead_registered').ok).toBe(false)
    expect(getState().candidates.find((row) => row.id === 'cand-rina')?.status).toBe('job_matching')

    expect(transitionStatus('cand-rina', 'lead_registered', 'Koreksi tahap input').ok).toBe(true)
    expect(getState().candidates.find((row) => row.id === 'cand-rina')?.status).toBe(
      'lead_registered',
    )
  })

  it('creates a milestone fee only once even when the status is replayed', () => {
    signIn('hendra@mitrabhayangkara.co.id')
    const handoverFees = () =>
      getState().ledger.filter(
        (row) => row.referralId === 'ref-cand-siti' && row.milestoneCode === 'handover',
      )

    expect(transitionStatus('cand-siti', 'employer_handover').ok).toBe(true)
    expect(handoverFees()).toHaveLength(1)
    const fee = handoverFees()[0]
    expect(fee.amount).toBe(1_500_000)
    expect(fee.status).toBe('earned')
    expect(fee.paidAmount).toBe(0)

    expect(
      transitionStatus('cand-siti', 'initial_verification', 'Koreksi data verifikasi').ok,
    ).toBe(true)
    expect(transitionStatus('cand-siti', 'employer_handover').ok).toBe(true)
    expect(handoverFees()).toHaveLength(1)
  })

  it('rejects pipeline changes from agent accounts', () => {
    signIn('asep@mitraagen.id')
    expect(transitionStatus('cand-siti', 'employer_handover').ok).toBe(false)
  })
})

describe('recordPayment', () => {
  it('allocates a partial payment to the oldest payable fee', () => {
    signIn('hendra@mitrabhayangkara.co.id')
    const payable = getState().ledger.filter(
      (row) => row.agentId === 'ag-asep' && PAYABLE_STATUSES.includes(row.status),
    )
    expect(payable).toHaveLength(1)
    const target = payable[0]

    const result = recordPayment(
      'ag-asep',
      100_000,
      'UJI-BAYAR-1',
      new Date('2026-11-02T10:00:00.000Z').toISOString(),
    )
    expect(result.ok).toBe(true)

    const state = getState()
    const updated = state.ledger.find((row) => row.id === target.id)
    expect(updated?.paidAmount).toBe(100_000)
    expect(updated?.status).toBe('partially_paid')

    const payment = state.payments.find((row) => row.reference === 'UJI-BAYAR-1')
    expect(payment?.amount).toBe(100_000)
    expect(payment?.allocations).toEqual([{ ledgerId: target.id, amount: 100_000 }])
  })

  it('rejects overpayment and non-positive amounts', () => {
    signIn('hendra@mitrabhayangkara.co.id')
    const target = getState().ledger.find(
      (row) => row.agentId === 'ag-asep' && PAYABLE_STATUSES.includes(row.status),
    )
    if (!target) throw new Error('Expected a payable fee')
    const outstanding = target.amount - target.paidAmount

    expect(
      recordPayment('ag-asep', outstanding + 1, 'UJI-BAYAR-2', new Date().toISOString()).ok,
    ).toBe(false)
    expect(recordPayment('ag-asep', 0, 'UJI-BAYAR-3', new Date().toISOString()).ok).toBe(false)
    expect(recordPayment('ag-asep', -50_000, 'UJI-BAYAR-4', new Date().toISOString()).ok).toBe(
      false,
    )
  })

  it('only lets P3MI admin record payments, and only for agents with payable fees', () => {
    signIn('nadia@mitrabhayangkara.co.id')
    expect(recordPayment('ag-asep', 100_000, 'UJI-BAYAR-5', new Date().toISOString()).ok).toBe(
      false,
    )

    signIn('hendra@mitrabhayangkara.co.id')
    expect(recordPayment('ag-enceng', 100_000, 'UJI-BAYAR-6', new Date().toISOString()).ok).toBe(
      false,
    )
  })
})

describe('documents', () => {
  it('records access only for documents within the actor scope', () => {
    signIn('siti.cpmi@example.test')
    const before = getState().accessEvents.length

    expect(logDocumentAccess('doc-siti-ktp', 'view', 'Pemeriksaan data pribadi').ok).toBe(true)
    expect(getState().accessEvents).toHaveLength(before + 1)

    expect(logDocumentAccess('doc-rina-ktp', 'view', 'Tidak berhak').ok).toBe(false)
    expect(getState().accessEvents).toHaveLength(before + 1)
  })

  it('creates the next version for a CPMI uploading their own document', () => {
    signIn('siti.cpmi@example.test')
    const result = uploadDocument('cand-siti', 'ktp', {
      name: 'ktp-siti-v2.pdf',
      size: 500_000,
      type: 'application/pdf',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const document = getState().documents.find((row) => row.id === result.data.documentId)
    expect(document?.version).toBe(2)
    expect(document?.status).toBe('pending_review')
    expect(document?.storagePath).toContain(result.data.documentId)
  })

  it('rejects other candidates, unsupported file types, and oversized files', () => {
    signIn('siti.cpmi@example.test')
    const before = getState().documents.length

    expect(
      uploadDocument('cand-rina', 'ktp', {
        name: 'ktp-rina.pdf',
        size: 100_000,
        type: 'application/pdf',
      }).ok,
    ).toBe(false)
    expect(
      uploadDocument('cand-siti', 'ktp', {
        name: 'ktp.exe',
        size: 100_000,
        type: 'application/x-msdownload',
      }).ok,
    ).toBe(false)
    expect(
      uploadDocument('cand-siti', 'ktp', {
        name: 'ktp-besar.pdf',
        size: 4 * 1024 * 1024,
        type: 'application/pdf',
      }).ok,
    ).toBe(false)
    expect(getState().documents).toHaveLength(before)
  })

  it('clears the revision branch when the last revision-required document is approved', () => {
    signIn('nadia@mitrabhayangkara.co.id')
    expect(getState().candidates.find((row) => row.id === 'cand-iis')?.branchStatus).toBe(
      'revision_required',
    )

    expect(reviewDocument('doc-iis-ijazah', 'approved').ok).toBe(true)
    const candidate = getState().candidates.find((row) => row.id === 'cand-iis')
    expect(candidate?.branchStatus).toBeUndefined()
    expect(candidate?.branchReason).toBeUndefined()
  })
})

describe('vacancies', () => {
  const input = {
    title: 'Perawat Lansia Uji',
    country: 'Jepang',
    sector: 'Kesehatan & perawatan',
    requirements: ['Sehat jasmani'],
    wageCurrency: 'JPY',
    wageMin: 180000,
    wageMax: 220000,
    wageType: 'bulanan' as const,
    slots: 2,
    status: 'draft' as const,
  }

  it('admin P3MI dapat membuat, mengubah, dan menghapus lowongan dengan audit', () => {
    const account = signIn('hendra@mitrabhayangkara.co.id')
    const jobOrder = getState().jobOrders.find((jo) => jo.orgId === account.orgId)!
    const before = getState().vacancies.length

    const created = saveVacancy({ ...input, jobOrderId: jobOrder.id })
    expect(created.ok).toBe(true)
    expect(getState().vacancies.length).toBe(before + 1)
    const saved = getState().vacancies.find((v) => v.id === (created as { data: { id: string } }).data.id)!
    expect(saved.title).toBe('Perawat Lansia Uji')
    expect(saved.orgId).toBe(account.orgId)
    expect(getState().auditEvents.some((e) => e.action === 'vacancy.created')).toBe(true)

    const updated = saveVacancy({ ...input, id: saved.id, jobOrderId: jobOrder.id, title: 'Perawat Lansia Revisi' })
    expect(updated.ok).toBe(true)
    expect(getState().vacancies.find((v) => v.id === saved.id)?.title).toBe('Perawat Lansia Revisi')

    expect(deleteVacancy(saved.id).ok).toBe(true)
    expect(getState().vacancies.some((v) => v.id === saved.id)).toBe(false)
    expect(getState().auditEvents.some((e) => e.action === 'vacancy.deleted')).toBe(true)
  })

  it('menolak lowongan tanpa persyaratan dan dari job order tenant lain', () => {
    const account = signIn('hendra@mitrabhayangkara.co.id')
    const jobOrder = getState().jobOrders.find((jo) => jo.orgId === account.orgId)!
    const otherJobOrder = getState().jobOrders.find((jo) => jo.orgId !== account.orgId)

    expect(saveVacancy({ ...input, jobOrderId: jobOrder.id, requirements: [] }).ok).toBe(false)
    if (otherJobOrder) {
      expect(saveVacancy({ ...input, jobOrderId: otherJobOrder.id }).ok).toBe(false)
    }
  })

  it('peran non-admin tidak dapat mengelola lowongan', () => {
    const account = signIn('nadia@mitrabhayangkara.co.id')
    const jobOrder = getState().jobOrders.find((jo) => jo.orgId === account.orgId)!
    expect(saveVacancy({ ...input, jobOrderId: jobOrder.id }).ok).toBe(false)
    expect(deleteVacancy(getState().vacancies[0].id).ok).toBe(false)
  })
})

describe('agent agreements', () => {
  it('membuat dan menghapus perjanjian agen dengan audit', () => {
    const account = signIn('hendra@mitrabhayangkara.co.id')
    const agent = getState().agents.find((a) => a.orgId === account.orgId)!
    const created = saveAgentAgreement({
      agentId: agent.id,
      agreementNumber: 'AG-UJI-001',
      validFrom: '2026-01-01',
      validUntil: null,
      status: 'active',
    })
    expect(created.ok).toBe(true)
    const id = (created as { data: { id: string } }).data.id
    expect(getState().agentAgreements.find((a) => a.id === id)?.agreementNumber).toBe('AG-UJI-001')

    expect(deleteAgentAgreement(id).ok).toBe(true)
    expect(getState().agentAgreements.some((a) => a.id === id)).toBe(false)
  })

  it('menolak nomor perjanjian kosong', () => {
    const account = signIn('hendra@mitrabhayangkara.co.id')
    const agent = getState().agents.find((a) => a.orgId === account.orgId)!
    expect(
      saveAgentAgreement({
        agentId: agent.id,
        agreementNumber: '   ',
        validFrom: '2026-01-01',
        validUntil: null,
        status: 'draft',
      }).ok,
    ).toBe(false)
  })
})
