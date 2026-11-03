import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarCheck2,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileWarning,
  Handshake,
  Plane,
  Send,
  ShieldAlert,
  UserRoundCheck,
  Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type {
  BranchStatus,
  CandidateStatus,
  ComplaintStatus,
  DocumentStatus,
  LedgerStatus,
  ReferralStatus,
  Visit,
} from '@/lib/types'
import {
  BRANCH_META,
  COMPLAINT_META,
  DOC_STATUS_META,
  HANDOVER_META,
  LEDGER_META,
  REFERRAL_META,
  STATUS_META,
  VISIT_META,
} from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import type { BadgeTone } from '@/components/ui/badge'

const groupTone: Record<string, BadgeTone> = {
  registrasi: 'muted',
  verifikasi: 'info',
  seleksi: 'warning',
  dokumen: 'warning',
  keberangkatan: 'brand',
  purna: 'success',
}

function statusIcon(status: CandidateStatus): ReactNode {
  const group = STATUS_META[status].group
  const cls = 'h-3 w-3'
  switch (group) {
    case 'registrasi':
      return <Send className={cls} />
    case 'verifikasi':
      return <ClipboardCheck className={cls} />
    case 'seleksi':
      return <BriefcaseBusiness className={cls} />
    case 'dokumen':
      return <FileCheck2 className={cls} />
    case 'keberangkatan':
      return <Plane className={cls} />
    case 'purna':
      return <CheckCircle2 className={cls} />
  }
}

export function CandidateStatusBadge({
  status,
  branch,
  audience = 'internal',
  showBranch = true,
}: {
  status: CandidateStatus
  branch?: BranchStatus
  audience?: 'internal' | 'cpmi'
  showBranch?: boolean
}) {
  const meta = STATUS_META[status]
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={groupTone[meta.group]} icon={statusIcon(status)}>
        {audience === 'cpmi' ? meta.cpmiLabel : meta.label}
      </Badge>
      {branch && showBranch ? (
        <Badge
          tone={BRANCH_META[branch].tone}
          icon={
            branch === 'rejected' ? (
              <ShieldAlert className="h-3 w-3" />
            ) : branch === 'revision_required' ? (
              <FileWarning className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )
          }
        >
          {BRANCH_META[branch].label}
        </Badge>
      ) : null}
    </span>
  )
}

export function ReferralBadge({ status }: { status: ReferralStatus }) {
  const meta = REFERRAL_META[status]
  return (
    <Badge
      tone={meta.tone}
      dot
      icon={status === 'accepted' ? <CheckCircle2 className="h-3 w-3" /> : undefined}
    >
      {meta.label}
    </Badge>
  )
}

export function DocumentBadge({ status }: { status: DocumentStatus }) {
  const meta = DOC_STATUS_META[status]
  const icons: Partial<Record<DocumentStatus, ReactNode>> = {
    approved: <CheckCircle2 className="h-3 w-3" />,
    revision_required: <FileWarning className="h-3 w-3" />,
    rejected: <ShieldAlert className="h-3 w-3" />,
    pending_review: <Clock3 className="h-3 w-3" />,
  }
  return (
    <Badge tone={meta.tone} icon={icons[status] ?? <Circle className="h-2 w-2" />}>
      {meta.label}
    </Badge>
  )
}

export function LedgerBadge({ status }: { status: LedgerStatus }) {
  const meta = LEDGER_META[status]
  return (
    <Badge
      tone={meta.tone}
      icon={
        status === 'paid' ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : status === 'due' || status === 'partially_paid' ? (
          <Clock3 className="h-3 w-3" />
        ) : status === 'disputed' ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <Wallet className="h-3 w-3" />
        )
      }
    >
      {meta.label}
    </Badge>
  )
}

export function ComplaintBadge({ status }: { status: ComplaintStatus }) {
  const meta = COMPLAINT_META[status]
  return <Badge tone={meta.tone} dot>{meta.label}</Badge>
}

export function VisitBadge({ status }: { status: Visit['status'] }) {
  const meta = VISIT_META[status]
  return (
    <Badge
      tone={meta.tone}
      icon={status === 'attended' ? <CalendarCheck2 className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
    >
      {meta.label}
    </Badge>
  )
}

export function HandoverBadge({ status }: { status: string }) {
  const meta = HANDOVER_META[status] ?? { label: status, tone: 'muted' as const }
  return (
    <Badge tone={meta.tone} icon={<Handshake className="h-3 w-3" />}>
      {meta.label}
    </Badge>
  )
}

export function ConsentBadge({ revoked, missing }: { revoked?: boolean; missing?: boolean }) {
  if (missing) {
    return <Badge tone="danger" icon={<ShieldAlert className="h-3 w-3" />}>Belum ada</Badge>
  }
  if (revoked) {
    return <Badge tone="danger" icon={<AlertTriangle className="h-3 w-3" />}>Ditarik</Badge>
  }
  return <Badge tone="success" icon={<UserRoundCheck className="h-3 w-3" />}>Tercatat</Badge>
}

export { groupTone }
