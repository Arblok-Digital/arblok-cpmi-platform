import type { Account, AppState, Candidate, Complaint, LedgerEntry, Referral, Role } from './types'

export type Permission =
  | 'view.platform'
  | 'manage.tenants'
  | 'manage.org'
  | 'manage.agents'
  | 'manage.vacancies'
  | 'view.allReferrals'
  | 'create.referral'
  | 'respond.referral'
  | 'review.documents'
  | 'update.pipeline'
  | 'manage.fees'
  | 'record.payment'
  | 'manage.complaints'
  | 'create.complaint'
  | 'view.audit'
  | 'access.documents'

const MATRIX: Record<Role, Permission[]> = {
  arblok_admin: ['view.platform', 'manage.tenants', 'view.audit', 'manage.org'],
  p3mi_admin: [
    'manage.org',
    'manage.agents',
    'manage.vacancies',
    'view.allReferrals',
    'respond.referral',
    'review.documents',
    'update.pipeline',
    'manage.fees',
    'record.payment',
    'manage.complaints',
    'view.audit',
    'access.documents',
  ],
  p3mi_reviewer: [
    'view.allReferrals',
    'respond.referral',
    'review.documents',
    'update.pipeline',
    'manage.complaints',
    'access.documents',
  ],
  agent_coordinator: ['create.referral', 'create.complaint'],
  agent: ['create.referral', 'create.complaint'],
  cpmi: ['create.complaint', 'access.documents'],
}

export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false
  return MATRIX[role].includes(permission)
}

export function isAgentRole(role: Role): boolean {
  return role === 'agent' || role === 'agent_coordinator'
}

export function isP3miRole(role: Role): boolean {
  return role === 'p3mi_admin' || role === 'p3mi_reviewer'
}

export function isInternalRole(role: Role): boolean {
  return role !== 'cpmi'
}

/** Agent accounts only ever see their own book of business. */
export function visibleReferrals(state: AppState, account: Account): Referral[] {
  const rows = state.referrals.filter((r) => r.orgId === account.orgId)
  if (account.role === 'cpmi') {
    return rows.filter((r) => {
      const candidate = state.candidates.find((c) => c.id === r.candidateId)
      return candidate?.accountId === account.id
    })
  }
  if (account.role === 'agent') {
    return rows.filter((r) => r.agentId === account.agentId)
  }
  if (account.role === 'agent_coordinator') {
    const network = networkAgentIds(state, account)
    return rows.filter((r) => network.includes(r.agentId))
  }
  if (isP3miRole(account.role)) return rows
  return []
}

export function visibleCandidates(state: AppState, account: Account): Candidate[] {
  const rows = state.candidates.filter((c) => c.orgId === account.orgId)
  if (account.role === 'cpmi') return rows.filter((c) => c.accountId === account.id)
  if (account.role === 'agent') return rows.filter((c) => c.agentId === account.agentId)
  if (account.role === 'agent_coordinator') {
    const network = networkAgentIds(state, account)
    return rows.filter((c) => c.agentId && network.includes(c.agentId))
  }
  if (isP3miRole(account.role)) return rows
  return []
}

export function networkAgentIds(state: AppState, account: Account): string[] {
  if (!account.agentId) return []
  return state.agents.filter((a) => a.coordinatorId === account.agentId).map((a) => a.id)
}

export function visibleLedger(state: AppState, account: Account): LedgerEntry[] {
  const rows = state.ledger.filter((l) => l.orgId === account.orgId)
  if (account.role === 'agent') return rows.filter((l) => l.agentId === account.agentId)
  if (account.role === 'agent_coordinator') {
    const network = networkAgentIds(state, account)
    return rows.filter((l) => network.includes(l.agentId))
  }
  if (isP3miRole(account.role)) return rows
  return []
}

export function visibleComplaints(state: AppState, account: Account): Complaint[] {
  const rows = state.complaints.filter((c) => c.orgId === account.orgId)
  if (account.role === 'cpmi') {
    const own = state.candidates.filter((c) => c.accountId === account.id).map((c) => c.id)
    return rows.filter((c) => own.includes(c.candidateId))
  }
  if (account.role === 'agent' || account.role === 'agent_coordinator') {
    const network =
      account.role === 'agent' ? [account.agentId] : [account.agentId, ...networkAgentIds(state, account)]
    const candidateIds = state.candidates
      .filter((c) => c.agentId && network.includes(c.agentId))
      .map((c) => c.id)
    return rows.filter((c) => candidateIds.includes(c.candidateId))
  }
  if (isP3miRole(account.role)) return rows
  return []
}

export function canAccessCandidate(
  state: AppState,
  account: Account,
  candidateId: string,
): boolean {
  return visibleCandidates(state, account).some((c) => c.id === candidateId)
}

export function canAccessDocument(
  state: AppState,
  account: Account,
  documentId: string,
): boolean {
  const doc = state.documents.find((d) => d.id === documentId)
  if (!doc) return false
  if (isP3miRole(account.role)) return doc.orgId === account.orgId
  return canAccessCandidate(state, account, doc.candidateId)
}
