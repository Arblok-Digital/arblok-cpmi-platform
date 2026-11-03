import { describe, expect, it } from 'vitest'
import {
  can,
  canAccessCandidate,
  canAccessDocument,
  networkAgentIds,
  visibleCandidates,
  visibleComplaints,
  visibleLedger,
  visibleReferrals,
} from './permissions'
import { createSeedState } from './seed'
import type { Account, AppState } from './types'

function accountById(state: AppState, id: string): Account {
  const account = state.accounts.find((row) => row.id === id)
  if (!account) throw new Error(`Seed account ${id} not found`)
  return account
}

function outsiderAccount(state: AppState): Account {
  return {
    ...accountById(state, 'acc-p3mi'),
    id: 'acc-outsider',
    email: 'outsider@example.test',
    orgId: 'org-karya',
  }
}

function candidateIds(state: AppState, account: Account): string[] {
  return visibleCandidates(state, account)
    .map((candidate) => candidate.id)
    .sort()
}

describe('permission matrix', () => {
  it('limits pipeline and commission actions to P3MI roles', () => {
    expect(can('p3mi_admin', 'update.pipeline')).toBe(true)
    expect(can('p3mi_reviewer', 'update.pipeline')).toBe(true)
    expect(can('p3mi_admin', 'record.payment')).toBe(true)
    expect(can('agent', 'update.pipeline')).toBe(false)
    expect(can('agent_coordinator', 'manage.fees')).toBe(false)
    expect(can('cpmi', 'record.payment')).toBe(false)
    expect(can('arblok_admin', 'manage.fees')).toBe(false)
  })

  it('lets agents create referrals but keeps platform admin outside tenant operations', () => {
    expect(can('agent', 'create.referral')).toBe(true)
    expect(can('agent_coordinator', 'create.referral')).toBe(true)
    expect(can('agent', 'view.allReferrals')).toBe(false)
    expect(can(undefined, 'create.referral')).toBe(false)
  })
})

describe('visibleCandidates', () => {
  it('gives an agent only their own book of business', () => {
    const state = createSeedState()
    const asep = accountById(state, 'acc-agent-asep')
    expect(candidateIds(state, asep)).toEqual([
      'cand-ai',
      'cand-diah',
      'cand-iis',
      'cand-nuraeni',
      'cand-rina',
      'cand-siti',
      'cand-tuti',
    ])
    expect(visibleCandidates(state, asep).every((c) => c.agentId === 'ag-asep')).toBe(true)
  })

  it('gives a coordinator their own network and P3MI the whole tenant', () => {
    const state = createSeedState()
    const coordinator = accountById(state, 'acc-coord')
    expect(networkAgentIds(state, coordinator)).toEqual(['ag-asep', 'ag-neng', 'ag-enceng'])
    expect(visibleCandidates(state, coordinator)).toHaveLength(13)

    const p3mi = accountById(state, 'acc-p3mi')
    expect(visibleCandidates(state, p3mi)).toHaveLength(13)
  })

  it('gives a CPMI only their own candidate record', () => {
    const state = createSeedState()
    const siti = accountById(state, 'acc-cpmi-siti')
    expect(candidateIds(state, siti)).toEqual(['cand-siti'])
    expect(canAccessCandidate(state, siti, 'cand-siti')).toBe(true)
    expect(canAccessCandidate(state, siti, 'cand-rina')).toBe(false)
  })

  it('does not expose another tenant to a P3MI account', () => {
    const state = createSeedState()
    const outsider = outsiderAccount(state)
    expect(visibleCandidates(state, outsider)).toEqual([])
    expect(visibleReferrals(state, outsider)).toEqual([])
    expect(visibleLedger(state, outsider)).toEqual([])
    expect(visibleComplaints(state, outsider)).toEqual([])
  })
})

describe('visibleReferrals and ledger', () => {
  it('scopes referrals to the agent, coordinator network, or tenant', () => {
    const state = createSeedState()
    expect(visibleReferrals(state, accountById(state, 'acc-agent-asep'))).toHaveLength(7)
    expect(visibleReferrals(state, accountById(state, 'acc-agent-neng'))).toHaveLength(6)
    expect(visibleReferrals(state, accountById(state, 'acc-coord'))).toHaveLength(13)
    expect(visibleReferrals(state, accountById(state, 'acc-p3mi'))).toHaveLength(13)
    expect(visibleReferrals(state, accountById(state, 'acc-cpmi-siti'))).toHaveLength(1)
  })

  it('scopes commission ledger rows to the owning agent network', () => {
    const state = createSeedState()
    expect(visibleLedger(state, accountById(state, 'acc-agent-asep'))).toHaveLength(5)
    expect(visibleLedger(state, accountById(state, 'acc-agent-neng'))).toHaveLength(1)
    expect(visibleLedger(state, accountById(state, 'acc-coord'))).toHaveLength(6)
    expect(visibleLedger(state, accountById(state, 'acc-p3mi'))).toHaveLength(6)
    expect(visibleLedger(state, accountById(state, 'acc-cpmi-siti'))).toEqual([])
  })

  it('scopes complaints to the candidate owner and their agent', () => {
    const state = createSeedState()
    expect(visibleComplaints(state, accountById(state, 'acc-cpmi-siti'))).toHaveLength(1)
    expect(visibleComplaints(state, accountById(state, 'acc-agent-asep'))).toHaveLength(2)
    expect(visibleComplaints(state, accountById(state, 'acc-agent-neng'))).toEqual([])
    expect(visibleComplaints(state, accountById(state, 'acc-p3mi'))).toHaveLength(2)
  })
})

describe('canAccessDocument', () => {
  it('lets a CPMI open only documents of their own candidate', () => {
    const state = createSeedState()
    const siti = accountById(state, 'acc-cpmi-siti')
    expect(canAccessDocument(state, siti, 'doc-siti-ktp')).toBe(true)
    expect(canAccessDocument(state, siti, 'doc-rina-ktp')).toBe(false)
    expect(canAccessDocument(state, siti, 'doc-tidak-ada')).toBe(false)
  })

  it('lets an agent open documents for candidates in their book', () => {
    const state = createSeedState()
    const asep = accountById(state, 'acc-agent-asep')
    expect(canAccessDocument(state, asep, 'doc-rina-ktp')).toBe(true)
    expect(canAccessDocument(state, asep, 'doc-mira-ktp')).toBe(false)

    const neng = accountById(state, 'acc-agent-neng')
    expect(canAccessDocument(state, neng, 'doc-mira-ktp')).toBe(true)
    expect(canAccessDocument(state, neng, 'doc-rina-ktp')).toBe(false)
  })

  it('keeps P3MI document access inside their own tenant', () => {
    const state = createSeedState()
    const p3mi = accountById(state, 'acc-p3mi')
    expect(canAccessDocument(state, p3mi, 'doc-siti-ktp')).toBe(true)
    expect(canAccessDocument(state, p3mi, 'doc-rina-ktp')).toBe(true)
    expect(canAccessDocument(state, outsiderAccount(state), 'doc-siti-ktp')).toBe(false)
  })
})
