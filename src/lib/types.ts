export type Role =
  | 'arblok_admin'
  | 'p3mi_admin'
  | 'p3mi_reviewer'
  | 'agent_coordinator'
  | 'agent'
  | 'cpmi'

export type OrgStatus = 'active' | 'onboarding' | 'suspended'
export type AccountStatus = 'active' | 'invited' | 'suspended'
export type AgentStatus = 'active' | 'pending' | 'inactive'

export interface Organization {
  id: string
  legalName: string
  shortName: string
  slug: string
  status: OrgStatus
  city: string
  province: string
  joinedAt: string
  plan: string
  contactEmail: string
  quota: {
    storageUsedMb: number
    storageLimitMb: number
    dbUsedMb: number
    dbLimitMb: number
    members: number
  }
}

export interface Account {
  id: string
  email: string
  name: string
  role: Role
  orgId: string
  phone: string
  title: string
  status: AccountStatus
  agentId?: string
  candidateId?: string
  lastLoginAt?: string
}

export interface Agent {
  id: string
  orgId: string
  accountId?: string
  name: string
  code: string
  region: string
  phone: string
  status: AgentStatus
  coordinatorId?: string
  joinedAt: string
  agreementNumber: string
  agreementValidUntil: string
  note?: string
}

export interface JobOrder {
  id: string
  orgId: string
  referenceCode: string
  country: string
  sector: string
  employerLabel: string
  status: 'draft' | 'verified' | 'closed'
  verifiedAt?: string
}

export interface Vacancy {
  id: string
  orgId: string
  jobOrderId: string
  title: string
  country: string
  sector: string
  requirements: string[]
  wageCurrency: string
  wageMin: number
  wageMax: number
  wageType: 'bulanan' | 'per jam'
  publishedAt: string
  status: 'published' | 'draft' | 'closed'
  slots: number
}

export type CandidateStatus =
  | 'lead_registered'
  | 'referral_acknowledged'
  | 'office_visit_confirmed'
  | 'initial_verification'
  | 'candidate_screening'
  | 'job_matching'
  | 'overseas_partner_review'
  | 'employer_selection'
  | 'employer_approved'
  | 'placement_agreement'
  | 'employment_contract'
  | 'visa_work_permit'
  | 'pre_departure'
  | 'departure_approved'
  | 'departed'
  | 'arrived'
  | 'employer_handover'
  | 'working'
  | 'monitoring'

export type BranchStatus =
  | 'on_hold'
  | 'revision_required'
  | 'rejected'
  | 'withdrawn'
  | 'closed'

export interface Candidate {
  id: string
  orgId: string
  accountId?: string
  fullName: string
  nickname: string
  phone: string
  birthDate?: string
  gender?: 'P' | 'L'
  education?: string
  region: string
  address?: string
  status: CandidateStatus
  branchStatus?: BranchStatus
  branchReason?: string
  agentId?: string
  createdAt: string
  createdBy: string
  source: 'agent' | 'p3mi' | 'walk_in'
  internalNote?: string
  lastActivityAt: string
  candidateCode: string
}

export type ReferralStatus =
  | 'draft'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'disputed'
  | 'withdrawn'

export interface Referral {
  id: string
  orgId: string
  candidateId: string
  agentId: string
  vacancyId?: string
  code: string
  submittedAt?: string
  acceptedAt?: string
  decidedAt?: string
  status: ReferralStatus
  rejectionReason?: string
  duplicateOfId?: string
  duplicateWarning: boolean
  attributionLocked: boolean
}

export interface ReferralEvent {
  id: string
  referralId: string
  type:
    | 'submitted'
    | 'duplicate_warning'
    | 'accepted'
    | 'rejected'
    | 'disputed'
    | 'withdrawn'
    | 'source_locked'
  actorUserId: string
  actorName: string
  reason?: string
  createdAt: string
}

export interface Consent {
  id: string
  candidateId: string
  orgId: string
  consentType: 'data_processing' | 'data_sharing'
  purpose: string
  recipient: string
  noticeVersion: string
  consentedAt: string
  revokedAt?: string
  evidence: string
  recordedBy: string
}

export interface Visit {
  id: string
  candidateId: string
  referralId: string
  scheduledAt: string
  locationLabel: string
  status: 'proposed' | 'confirmed' | 'attended' | 'no_show' | 'cancelled'
  confirmedBy?: string
  notes?: string
  createdAt: string
}

export interface Handover {
  id: string
  candidateId: string
  referralId: string
  fromAgentId: string
  receivedBy?: string
  requestedAt: string
  acceptedAt?: string
  proofReference?: string
  notes?: string
  status: 'requested' | 'accepted' | 'declined'
}

export type DocumentTypeId =
  | 'ktp'
  | 'kartu_keluarga'
  | 'ijazah'
  | 'skck'
  | 'paspor'
  | 'foto'
  | 'sertifikat'

export type DocumentStatus =
  | 'uploaded'
  | 'pending_review'
  | 'approved'
  | 'revision_required'
  | 'rejected'

export interface CandidateDocument {
  id: string
  candidateId: string
  orgId: string
  documentType: DocumentTypeId
  fileName: string
  storagePath: string
  mimeType: string
  sizeBytes: number
  version: number
  status: DocumentStatus
  uploadedBy: string
  uploadedAt: string
  reviewedAt?: string
  isDummy: boolean
}

export interface DocumentReview {
  id: string
  documentId: string
  reviewerUserId: string
  reviewerName: string
  decision: 'approved' | 'revision_required' | 'rejected'
  reason?: string
  createdAt: string
}

export interface StatusEvent {
  id: string
  candidateId: string
  orgId: string
  fromStatus?: string
  toStatus: string
  actorUserId: string
  actorName: string
  reason?: string
  visibility: 'internal' | 'candidate'
  createdAt: string
}

export interface CommissionMilestone {
  code: string
  label: string
  amount: number
  currency: string
}

export interface CommissionAgreement {
  id: string
  orgId: string
  agentId: string
  agreementNumber: string
  agreementType: 'fixed' | 'tiered'
  triggerDefinition: string
  milestones: CommissionMilestone[]
  validFrom: string
  validUntil: string
  status: 'draft' | 'active' | 'ended'
  documentPath?: string
  signedAt?: string
}

export interface AgentAgreement {
  id: string
  orgId: string
  agentId: string
  agreementNumber: string
  validFrom: string
  validUntil: string | null
  status: 'draft' | 'active' | 'ended'
  createdAt: string
}

export type LedgerStatus =
  | 'pending'
  | 'earned'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'due'
  | 'partially_paid'
  | 'paid'
  | 'disputed'
  | 'cancelled'

export interface LedgerEntry {
  id: string
  orgId: string
  agreementId: string
  referralId: string
  agentId: string
  code: string
  milestoneCode: string
  label: string
  amount: number
  currency: string
  earnedAt: string
  dueAt?: string
  status: LedgerStatus
  paidAmount: number
  sourceEventId?: string
  note?: string
}

export interface PaymentAllocation {
  ledgerId: string
  amount: number
}

export interface CommissionPayment {
  id: string
  orgId: string
  agentId: string
  reference: string
  paidAt: string
  amount: number
  currency: string
  recordedBy: string
  proofPath?: string
  allocations: PaymentAllocation[]
}

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface Complaint {
  id: string
  orgId: string
  candidateId: string
  code: string
  category: 'biaya' | 'dokumen' | 'jadwal' | 'komunikasi' | 'lainnya'
  description: string
  urgency: 'low' | 'medium' | 'high'
  status: ComplaintStatus
  assignedTo?: string
  resolution?: string
  createdAt: string
  createdBy: string
  createdByName: string
  resolvedAt?: string
}

export interface AppNotification {
  id: string
  userId: string
  orgId: string
  title: string
  body: string
  linkPath: string
  readAt?: string
  createdAt: string
  kind: 'info' | 'action' | 'success' | 'warning'
}

export interface AuditEvent {
  id: string
  orgId: string
  actorUserId: string
  actorName: string
  action: string
  entityType: string
  entityId: string
  entityLabel: string
  metadata?: Record<string, string | number | boolean>
  createdAt: string
}

export interface DataAccessEvent {
  id: string
  orgId: string
  actorUserId: string
  actorName: string
  candidateId: string
  documentId: string
  action: 'view' | 'download'
  reason: string
  createdAt: string
}

export interface AppState {
  schemaVersion: number
  seededAt: string
  currentUserId: string | null
  organizations: Organization[]
  accounts: Account[]
  agents: Agent[]
  jobOrders: JobOrder[]
  vacancies: Vacancy[]
  candidates: Candidate[]
  referrals: Referral[]
  referralEvents: ReferralEvent[]
  consents: Consent[]
  visits: Visit[]
  handovers: Handover[]
  documents: CandidateDocument[]
  documentReviews: DocumentReview[]
  statusEvents: StatusEvent[]
  commissionAgreements: CommissionAgreement[]
  agentAgreements: AgentAgreement[]
  ledger: LedgerEntry[]
  payments: CommissionPayment[]
  complaints: Complaint[]
  notifications: AppNotification[]
  auditEvents: AuditEvent[]
  accessEvents: DataAccessEvent[]
}

export type NewReferralInput = {
  fullName: string
  phone: string
  region: string
  birthDate?: string
  gender?: 'P' | 'L'
  education?: string
  vacancyId?: string
  address?: string
  notes?: string
  consent: {
    dataProcessing: boolean
    dataSharing: boolean
    purpose: string
    recipient: string
    noticeVersion: string
  }
}
