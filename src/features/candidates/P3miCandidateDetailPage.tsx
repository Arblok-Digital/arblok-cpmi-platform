import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileText,
  GitBranch,
  Handshake,
  LockKeyhole,
  MapPin,
  Phone,
  ReceiptText,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { isP3miRole, visibleCandidates } from '@/lib/permissions'
import { approveLedger, clearBranchStatus, latestDocument, reviewDocument, setBranchStatus, transitionStatus } from '@/lib/store'
import { BRANCH_META, DOC_TYPES, STATUS_GROUPS, STATUS_META, STATUS_ORDER } from '@/lib/constants'
import type { BranchStatus, CandidateStatus, DocumentStatus } from '@/lib/types'
import { formatCurrency, formatDate, formatDateTime, formatRelative } from '@/lib/format'
import { DataRow, InfoNote, PageHeader } from '@/components/shared/page'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button, LinkButton } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Field, Select, Textarea } from '@/components/ui/form'
import { Tabs } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/misc'
import {
  CandidateStatusBadge,
  ConsentBadge,
  DocumentBadge,
  HandoverBadge,
  LedgerBadge,
  ReferralBadge,
  VisitBadge,
} from '@/components/shared/status'
import { Timeline } from '@/components/shared/timeline'
import { useToast } from '@/components/ui/toast'

type Tab = 'ringkasan' | 'dokumen' | 'timeline' | 'fee'

export function P3miCandidateDetailPage() {
  const { id } = useParams()
  const { state, account } = useSession()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('ringkasan')
  const [statusOpen, setStatusOpen] = useState(false)
  const [branchOpen, setBranchOpen] = useState(false)
  const [docTarget, setDocTarget] = useState<{ id: string; decision: DocumentStatus; label: string } | null>(null)
  const [toStatus, setToStatus] = useState<CandidateStatus>('referral_acknowledged')
  const [statusReason, setStatusReason] = useState('')
  const [branch, setBranch] = useState<BranchStatus>('on_hold')
  const [branchReason, setBranchReason] = useState('')
  const [docReason, setDocReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!account || !isP3miRole(account.role)) return null
  const candidate = visibleCandidates(state, account).find((c) => c.id === id)
  if (!candidate) {
    return (
      <div className="page-pad">
        <PageHeader backTo="/p3mi/kandidat" backLabel="Kandidat" title="Kandidat tidak ditemukan" />
        <EmptyState
          icon={<UserRound className="h-5 w-5" />}
          title="Data tidak tersedia"
          description="Kandidat mungkin berada di tenant lain atau sudah tidak dapat diakses."
          action={<LinkButton to="/p3mi/kandidat" variant="secondary">Kembali</LinkButton>}
        />
      </div>
    )
  }

  const referral = state.referrals
    .filter((r) => r.candidateId === candidate.id)
    .sort((a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime())[0]
  const agent = state.agents.find((a) => a.id === candidate.agentId)
  const vacancy = state.vacancies.find((v) => v.id === referral?.vacancyId)
  const org = state.organizations.find((o) => o.id === account.orgId)
  const consents = state.consents.filter((c) => c.candidateId === candidate.id)
  const sharingConsent = consents.find((c) => c.consentType === 'data_sharing')
  const processingConsent = consents.find((c) => c.consentType === 'data_processing')
  const visits = state.visits
    .filter((v) => v.candidateId === candidate.id)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
  const handover = state.handovers
    .filter((h) => h.candidateId === candidate.id)
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())[0]
  const documents = state.documents
    .filter((d) => d.candidateId === candidate.id)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
  const pendingDocs = documents.filter((d) => d.status === 'pending_review')
  const ledger = state.ledger.filter((l) => !referral || l.referralId === referral.id)
  const agreement = referral
    ? state.commissionAgreements.find((a) => a.agentId === referral.agentId && a.status === 'active') ??
      state.commissionAgreements.find((a) => a.agentId === referral.agentId)
    : undefined
  const statusEvents = state.statusEvents
    .filter((e) => e.candidateId === candidate.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const auditEvents = state.auditEvents
    .filter((e) => e.entityId === candidate.id || e.entityLabel.includes(candidate.fullName))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const stageIndex = STATUS_ORDER.indexOf(candidate.status)
  const progress = Math.round(((stageIndex + 1) / STATUS_ORDER.length) * 100)
  const nextStatus = STATUS_ORDER[Math.min(stageIndex + 1, STATUS_ORDER.length - 1)]
  const requiredApproved = DOC_TYPES.filter((type) => type.required).filter(
    (type) => latestDocument(state, candidate.id, type.id)?.status === 'approved',
  ).length
  const requiredTotal = DOC_TYPES.filter((type) => type.required).length

  const openStatusDialog = () => {
    setToStatus(candidate.status === 'monitoring' ? 'monitoring' : nextStatus)
    setStatusReason('')
    setError(null)
    setStatusOpen(true)
  }

  const submitStatus = () => {
    setError(null)
    setBusy(true)
    const result = transitionStatus(candidate.id, toStatus, statusReason)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success('Status diperbarui', `${candidate.fullName} → ${STATUS_META[toStatus].label}.`)
    setStatusOpen(false)
  }

  const submitBranch = () => {
    setError(null)
    setBusy(true)
    const result = setBranchStatus(candidate.id, branch, branchReason)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success('Status cabang dicatat', `${BRANCH_META[branch].label} untuk ${candidate.fullName}.`)
    setBranchOpen(false)
    setBranchReason('')
  }

  const clearBranch = () => {
    const reason = window.prompt('Alasan menyelesaikan status cabang:')
    if (!reason) return
    const result = clearBranchStatus(candidate.id, reason)
    if (!result.ok) {
      toast.error('Gagal', result.error)
      return
    }
    toast.success('Status cabang diselesaikan')
  }

  const submitDoc = () => {
    if (!docTarget) return
    setError(null)
    if (docTarget.decision !== 'approved' && docReason.trim().length < 5) {
      setError('Alasan minimal 5 karakter.')
      return
    }
    setBusy(true)
    const result = reviewDocument(
      docTarget.id,
      docTarget.decision as Exclude<DocumentStatus, 'uploaded' | 'pending_review'>,
      docReason,
    )
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success(
      docTarget.decision === 'approved' ? 'Dokumen disetujui' : 'Keputusan dokumen dicatat',
      docTarget.label,
    )
    setDocTarget(null)
    setDocReason('')
  }

  return (
    <div className="page-pad">
      <PageHeader
        backTo="/p3mi/kandidat"
        backLabel="Kandidat"
        eyebrow={`${candidate.candidateCode} · ${candidate.region}`}
        title={candidate.fullName}
        description={`Agen ${agent?.name ?? '—'} · referral ${referral?.code ?? '—'} · terakhir aktif ${formatRelative(candidate.lastActivityAt)}`}
        meta={
          <>
            <CandidateStatusBadge status={candidate.status} branch={candidate.branchStatus} />
            {referral ? <ReferralBadge status={referral.status} /> : null}
            {pendingDocs.length ? <Badge tone="info">{pendingDocs.length} dokumen menunggu</Badge> : null}
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              icon={<GitBranch className="h-4 w-4" />}
              onClick={() => {
                setBranch(candidate.branchStatus ?? 'on_hold')
                setBranchReason(candidate.branchReason ?? '')
                setError(null)
                setBranchOpen(true)
              }}
            >
              Status cabang
            </Button>
            <Button variant="accent" icon={<ChevronRight className="h-4 w-4" />} onClick={openStatusDialog}>
              Perbarui status
            </Button>
          </>
        }
      />

      {candidate.branchStatus ? (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <p className="text-[11px] font-bold text-amber-900">
                Status cabang: {BRANCH_META[candidate.branchStatus].label}
              </p>
              <p className="mt-0.5 text-[10px] leading-4 text-amber-900/80">
                {candidate.branchReason ?? BRANCH_META[candidate.branchStatus].description}
              </p>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={clearBranch}>
            Selesaikan status cabang
          </Button>
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-3.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Tahap pipeline</p>
          <p className="mt-1 text-lg font-extrabold text-ink">{stageIndex + 1} / {STATUS_ORDER.length}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="card p-3.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Dokumen wajib</p>
          <p className="mt-1 text-lg font-extrabold text-ink">{requiredApproved}/{requiredTotal}</p>
          <p className="mt-1 text-[9px] text-muted">{pendingDocs.length} menunggu pemeriksaan</p>
        </div>
        <div className="card p-3.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Kunjungan</p>
          <p className="mt-1 text-lg font-extrabold text-ink">{visits.filter((v) => v.status === 'attended').length}</p>
          <p className="mt-1 text-[9px] text-muted">{visits.length} total jadwal</p>
        </div>
        <div className="card p-3.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Fee tercatat</p>
          <p className="mt-1 text-lg font-extrabold text-ink">
            {formatCurrency(ledger.reduce((sum, l) => sum + l.amount, 0))}
          </p>
          <p className="mt-1 text-[9px] text-muted">{ledger.filter((l) => l.status === 'paid').length} lunas</p>
        </div>
      </div>

      <div className="mb-4">
        <Tabs<Tab>
          tabs={[
            { id: 'ringkasan', label: 'Ringkasan' },
            { id: 'dokumen', label: 'Dokumen', count: documents.length },
            { id: 'timeline', label: 'Timeline & audit', count: statusEvents.length },
            { id: 'fee', label: 'Fee', count: ledger.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'ringkasan' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <Card>
              <CardHeader title="Profil kandidat" description="Data minimum untuk pra-penempatan." icon={<UserRound className="h-4 w-4" />} />
              <CardContent className="grid gap-x-8 pt-1 sm:grid-cols-2">
                <div className="divide-y divide-line">
                  <DataRow label="Nama lengkap" value={candidate.fullName} />
                  <DataRow
                    label="Telepon"
                    value={
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted" /> {candidate.phone}
                      </span>
                    }
                  />
                  <DataRow
                    label="Wilayah"
                    value={
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted" /> {candidate.region}
                      </span>
                    }
                  />
                  <DataRow label="Pendidikan" value={candidate.education ?? '—'} />
                </div>
                <div className="divide-y divide-line">
                  <DataRow label="Tanggal lahir" value={candidate.birthDate ? formatDate(candidate.birthDate) : '—'} />
                  <DataRow label="Jenis kelamin" value={candidate.gender === 'L' ? 'Laki-laki' : candidate.gender === 'P' ? 'Perempuan' : '—'} />
                  <DataRow label="Sumber" value={candidate.source === 'agent' ? 'Referral agen' : candidate.source === 'p3mi' ? 'Input P3MI' : 'Datang langsung'} />
                  <DataRow label="Dibuat" value={formatDate(candidate.createdAt)} />
                </div>
                {candidate.address ? (
                  <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-600 sm:col-span-2">
                    <span className="font-semibold">Alamat singkat: </span>
                    {candidate.address}
                  </p>
                ) : null}
                {candidate.internalNote ? (
                  <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-900 sm:col-span-2">
                    <span className="font-semibold">Catatan internal: </span>
                    {candidate.internalNote}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader title="Referral & atribusi" description="Sumber dikunci setelah diterima." icon={<FileText className="h-4 w-4" />} />
                <CardContent className="divide-y divide-line pt-1">
                  <DataRow label="Kode referral" value={<span className="font-mono">{referral?.code ?? '—'}</span>} />
                  <DataRow label="Agen sumber" value={agent?.name ?? '—'} />
                  <DataRow label="Kode agen" value={agent?.code ?? '—'} />
                  <DataRow label="Status atribusi" value={referral?.attributionLocked ? 'Terkunci' : 'Belum terkunci'} />
                  <DataRow label="Diajukan" value={formatDate(referral?.submittedAt)} />
                  {referral?.rejectionReason ? (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[10px] leading-4 text-red-800">
                      {referral.rejectionReason}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader title="Persetujuan CPMI" description="Dua consent terpisah." icon={<ShieldCheck className="h-4 w-4" />} />
                <CardContent className="space-y-2 pt-2">
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-2">
                    <span className="text-[10px] text-slate-600">Pemrosesan data</span>
                    <ConsentBadge revoked={Boolean(processingConsent?.revokedAt)} missing={!processingConsent} />
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-2">
                    <span className="text-[10px] text-slate-600">Pembagian ke P3MI</span>
                    <ConsentBadge revoked={Boolean(sharingConsent?.revokedAt)} missing={!sharingConsent} />
                  </div>
                  <p className="text-[9px] leading-4 text-muted">
                    Versi {sharingConsent?.noticeVersion ?? '—'} · dicatat {formatDate(sharingConsent?.consentedAt)}
                  </p>
                  {!sharingConsent || sharingConsent.revokedAt ? (
                    <InfoNote tone="warning">Jeda pemrosesan data lebih lanjut sampai consent ditelaah.</InfoNote>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader title="Kunjungan & serah terima" description="Koordinasi dengan agen sumber." icon={<CalendarDays className="h-4 w-4" />} action={<Link to="/p3mi/kunjungan" className="text-[10px] font-bold text-brand hover:underline">Kelola</Link>} />
              <CardContent className="space-y-2 pt-2">
                {visits.length === 0 && !handover ? (
                  <p className="py-4 text-center text-xs text-muted">Belum ada jadwal atau handover.</p>
                ) : null}
                {visits.slice(0, 4).map((visit) => (
                  <div key={visit.id} className="flex items-start justify-between gap-3 rounded-xl border border-line p-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-ink">{formatDateTime(visit.scheduledAt)}</p>
                      <p className="mt-0.5 text-[9px] text-muted">{visit.locationLabel}</p>
                      {visit.notes ? <p className="mt-1 text-[9px] leading-4 text-slate-600">{visit.notes}</p> : null}
                    </div>
                    <VisitBadge status={visit.status} />
                  </div>
                ))}
                {handover ? (
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-line p-3">
                    <div>
                      <p className="text-[11px] font-bold text-ink">Serah terima agen</p>
                      <p className="mt-0.5 text-[9px] text-muted">
                        Diajukan {formatDateTime(handover.requestedAt)}
                        {handover.proofReference ? ` · ${handover.proofReference}` : ''}
                      </p>
                      {handover.notes ? <p className="mt-1 text-[9px] leading-4 text-slate-600">{handover.notes}</p> : null}
                    </div>
                    <HandoverBadge status={handover.status} />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Status saat ini" description="Perubahan status memerlukan alasan." icon={<Clock3 className="h-4 w-4" />} />
              <CardContent className="pt-2">
                <CandidateStatusBadge status={candidate.status} branch={candidate.branchStatus} />
                <p className="mt-2 text-[10px] leading-4 text-muted">{STATUS_META[candidate.status].description}</p>
                <div className="mt-3 space-y-1">
                  <DataRow label="Tahap" value={`${stageIndex + 1} dari ${STATUS_ORDER.length}`} />
                  <DataRow label="Diperbarui" value={formatRelative(candidate.lastActivityAt)} />
                </div>
                <Button className="mt-3 w-full" size="sm" onClick={openStatusDialog} icon={<ChevronRight className="h-3.5 w-3.5" />}>
                  Perbarui status
                </Button>
              </CardContent>
            </Card>

            {vacancy ? (
              <Card>
                <CardHeader title="Lowongan" description={`${vacancy.country} · ${vacancy.sector}`} icon={<BriefcaseBusiness className="h-4 w-4" />} />
                <CardContent className="pt-1">
                  <p className="text-xs font-bold text-ink">{vacancy.title}</p>
                  <p className="mt-1 text-[10px] text-muted">
                    {formatCurrency(vacancy.wageMin, vacancy.wageCurrency)} –{' '}
                    {formatCurrency(vacancy.wageMax, vacancy.wageCurrency)} / {vacancy.wageType}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {vacancy.requirements.map((req) => (
                      <li key={req} className="flex items-start gap-1.5 text-[9px] leading-4 text-muted">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader title="Dokumen" description={`${documents.length} file terunggah`} icon={<FileCheck2 className="h-4 w-4" />} action={<button type="button" onClick={() => setTab('dokumen')} className="text-[10px] font-bold text-brand hover:underline">Buka</button>} />
              <CardContent className="space-y-2 pt-2">
                {DOC_TYPES.filter((type) => type.required).map((type) => {
                  const doc = latestDocument(state, candidate.id, type.id)
                  return (
                    <div key={type.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-[10px] text-slate-600">{type.label}</span>
                      {doc ? <DocumentBadge status={doc.status} /> : <Badge tone="muted">Belum ada</Badge>}
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Akses cepat" description="Modul terkait." icon={<ArrowRight className="h-4 w-4" />} />
              <CardContent className="space-y-1 pt-2">
                {[
                  { to: '/p3mi/dokumen', label: 'Verifikasi dokumen', icon: <FileCheck2 className="h-3.5 w-3.5" /> },
                  { to: '/p3mi/kunjungan', label: 'Jadwal & serah terima', icon: <Handshake className="h-3.5 w-3.5" /> },
                  { to: '/p3mi/fee', label: 'Perjanjian fee', icon: <ReceiptText className="h-3.5 w-3.5" /> },
                ].map((item) => (
                  <Link key={item.to} to={item.to} className="flex items-center gap-2 rounded-lg px-2 py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-brand">
                    <span className="text-muted">{item.icon}</span>
                    {item.label}
                    <ArrowRight className="ml-auto h-3 w-3 text-slate-300" />
                  </Link>
                ))}
              </CardContent>
            </Card>

            <div className="rounded-xl border border-line bg-surface p-3.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-ink">
                <LockKeyhole className="h-3.5 w-3.5 text-brand" /> Kontak organisasi
              </p>
              <p className="mt-1 text-[9px] text-muted">{org?.legalName}</p>
              <p className="text-[9px] text-muted">{org?.contactEmail}</p>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'dokumen' ? (
        <div className="space-y-4">
          <InfoNote tone="info" title="Alur dokumen privat">
            File disimpan pada bucket privat. Setiap tampilan/unduhan internal dicatat pada access
            log dengan alasan. Keputusan review tidak menghapus versi lama.
          </InfoNote>
          {DOC_TYPES.map((type) => {
            const versions = state.documents
              .filter((d) => d.candidateId === candidate.id && d.documentType === type.id)
              .sort((a, b) => b.version - a.version)
            return (
              <Card key={type.id}>
                <CardHeader
                  title={type.label}
                  description={`${versions.length} versi · ${type.required ? 'wajib' : 'opsional'}`}
                  icon={<FileCheck2 className="h-4 w-4" />}
                  action={
                    versions[0] ? (
                      <DocumentBadge status={versions[0].status} />
                    ) : (
                      <Badge tone="muted">Belum diunggah</Badge>
                    )
                  }
                />
                <CardContent className="pt-2">
                  {versions.length === 0 ? (
                    <p className="py-3 text-[10px] text-muted">
                      Belum ada file. CPMI atau agen dapat mengunggah melalui halaman dokumen.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {versions.map((doc) => {
                        const review = state.documentReviews
                          .filter((r) => r.documentId === doc.id)
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                        return (
                          <div key={doc.id} className="rounded-xl border border-line p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-bold text-ink">{doc.fileName}</p>
                                <p className="mt-0.5 text-[9px] text-muted">
                                  Versi {doc.version} · {(doc.sizeBytes / 1024 / 1024).toFixed(2)} MB ·{' '}
                                  {formatRelative(doc.uploadedAt)}
                                </p>
                                <p className="mt-0.5 text-[9px] text-muted">
                                  Diunggah oleh {state.accounts.find((a) => a.id === doc.uploadedBy)?.name ?? '—'}
                                </p>
                              </div>
                              <DocumentBadge status={doc.status} />
                            </div>
                            {review?.reason ? (
                              <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[9px] leading-4 text-amber-900">
                                Catatan {review.reviewerName}: {review.reason}
                              </p>
                            ) : null}
                            {doc.status === 'pending_review' ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="success"
                                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                                  onClick={() => {
                                    setDocTarget({ id: doc.id, decision: 'approved', label: `${type.label} v${doc.version}` })
                                    setDocReason('')
                                    setError(null)
                                  }}
                                >
                                  Setujui
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setDocTarget({ id: doc.id, decision: 'revision_required', label: `${type.label} v${doc.version}` })
                                    setDocReason('')
                                    setError(null)
                                  }}
                                >
                                  Minta revisi
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setDocTarget({ id: doc.id, decision: 'rejected', label: `${type.label} v${doc.version}` })
                                    setDocReason('')
                                    setError(null)
                                  }}
                                >
                                  Tolak
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : null}

      {tab === 'timeline' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Timeline status" description="Append-only, termasuk status cabang." icon={<Clock3 className="h-4 w-4" />} />
            <CardContent className="pt-3">
              {statusEvents.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted">Belum ada event status.</p>
              ) : (
                <Timeline
                  items={statusEvents.map((event) => ({
                    id: event.id,
                    title:
                      STATUS_META[event.toStatus as CandidateStatus]?.label ??
                      BRANCH_META[event.toStatus as BranchStatus]?.label ??
                      event.toStatus,
                    description: event.reason,
                    timestamp: formatDateTime(event.createdAt),
                    actor: event.actorName,
                    tone:
                      event.toStatus === 'rejected' || event.toStatus === 'revision_required'
                        ? ('danger' as const)
                        : event.toStatus === 'on_hold'
                          ? ('warning' as const)
                          : ('brand' as const),
                    footer: (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-500">
                        {event.visibility === 'candidate' ? 'terlihat CPMI' : 'internal'}
                      </span>
                    ),
                  }))}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Audit terkait" description="Aksi kritis pada kandidat ini." icon={<ShieldCheck className="h-4 w-4" />} />
            <CardContent className="pt-2">
              {auditEvents.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted">Belum ada audit event.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {auditEvents.map((event) => (
                    <li key={event.id} className="py-2.5">
                      <p className="text-[10px] font-bold text-slate-700">{event.action.replace(/\./g, ' · ')}</p>
                      <p className="mt-0.5 text-[9px] text-muted">
                        {event.actorName} · {formatDateTime(event.createdAt)}
                      </p>
                      {event.metadata ? (
                        <p className="mt-0.5 truncate font-mono text-[8px] text-slate-400">
                          {JSON.stringify(event.metadata)}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'fee' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card>
            <CardHeader title="Fee referral" description="Hanya milestone yang terverifikasi menghasilkan fee." icon={<ReceiptText className="h-4 w-4" />} />
            <CardContent className="p-0">
              {ledger.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={<ReceiptText className="h-5 w-5" />}
                    title="Belum ada fee"
                    description="Fee dibuat otomatis saat status mencapai handover, departed, atau working dan perjanjian agen aktif."
                    compact
                  />
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {ledger.map((entry) => (
                    <li key={entry.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-ink">{entry.label}</p>
                        <p className="mt-0.5 font-mono text-[9px] text-muted">
                          {entry.code} · jatuh tempo {formatDate(entry.dueAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-brand">
                          {formatCurrency(entry.amount, entry.currency)}
                        </span>
                        <LedgerBadge status={entry.status} />
                        {account.role === 'p3mi_admin' &&
                        ['earned', 'submitted', 'under_review'].includes(entry.status) ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const result = approveLedger(entry.id)
                              if (!result.ok) toast.error('Gagal', result.error)
                              else toast.success('Fee disetujui', entry.code)
                            }}
                          >
                            Setujui
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Perjanjian komisi" description={agreement?.agreementNumber ?? 'Belum ada perjanjian'} icon={<FileText className="h-4 w-4" />} />
              <CardContent className="pt-2">
                {agreement ? (
                  <div className="space-y-2">
                    <DataRow label="Tipe" value={agreement.agreementType === 'fixed' ? 'Tetap per milestone' : 'Bertingkat'} />
                    <DataRow label="Berlaku" value={`${formatDate(agreement.validFrom)} – ${formatDate(agreement.validUntil)}`} />
                    <div className="border-t border-line pt-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Milestone</p>
                      <ul className="mt-1 space-y-1">
                        {agreement.milestones.map((milestone) => (
                          <li key={milestone.code} className="flex items-center justify-between gap-2 text-[10px]">
                            <span className="text-slate-600">{milestone.label}</span>
                            <span className="font-bold text-ink">{formatCurrency(milestone.amount, milestone.currency)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-[9px] leading-4 text-muted">{agreement.triggerDefinition}</p>
                  </div>
                ) : (
                  <p className="py-3 text-[10px] text-muted">
                    Fee tidak dihitung tanpa perjanjian komisi yang aktif.
                  </p>
                )}
              </CardContent>
            </Card>

            <InfoNote tone="warning" title="Batas data demo">
              Nominal fee pada demo adalah data sintetis dan bukan ketentuan resmi. Jangan menganggap
              catatan ini sebagai bukti pembayaran atau perjanjian yang mengikat.
            </InfoNote>
          </div>
        </div>
      ) : null}

      <Dialog
        open={statusOpen}
        onClose={() => {
          if (!busy) {
            setStatusOpen(false)
            setError(null)
          }
        }}
        title="Perbarui status pipeline"
        description="Status adalah catatan operasional. Perubahan mundur memerlukan alasan; milestone dapat membuat fee otomatis."
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button onClick={submitStatus} loading={busy}>
              Simpan status
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-slate-50 p-3">
            <p className="text-[10px] text-muted">Status saat ini</p>
            <p className="mt-1 text-xs font-bold text-ink">{STATUS_META[candidate.status].label}</p>
          </div>
          <Field label="Status baru" htmlFor="to-status" required>
            <Select id="to-status" value={toStatus} onChange={(e) => setToStatus(e.target.value as CandidateStatus)}>
              {STATUS_GROUPS.map((group) => (
                <optgroup key={group.id} label={group.label}>
                  {STATUS_ORDER.filter((status) => STATUS_META[status].group === group.id).map((status) => (
                    <option key={status} value={status}>
                      {STATUS_META[status].label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field
            label="Alasan / catatan"
            htmlFor="status-reason"
            hint="Wajib bila mengembalikan status ke tahap sebelumnya."
          >
            <Textarea
              id="status-reason"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Contoh: employer meminta pemeriksaan ulang dokumen…"
            />
          </Field>
          {toStatus === 'employer_handover' || toStatus === 'departed' || toStatus === 'working' ? (
            <InfoNote tone="success" title="Milestone fee">
              Status ini dapat membuat catatan fee otomatis apabila referral diterima dan perjanjian
              agen aktif. Sistem mencegah duplikasi per referral + milestone.
            </InfoNote>
          ) : null}
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={branchOpen}
        onClose={() => {
          if (!busy) {
            setBranchOpen(false)
            setError(null)
          }
        }}
        title="Status cabang"
        description="Status cabang menjelaskan kondisi di luar pipeline utama. Alasan wajib dicatat untuk audit."
        footer={
          <>
            <Button variant="secondary" onClick={() => setBranchOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button onClick={submitBranch} loading={busy} variant="danger">
              Simpan status cabang
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Jenis status" htmlFor="branch-status" required>
            <Select id="branch-status" value={branch} onChange={(e) => setBranch(e.target.value as BranchStatus)}>
              {(Object.keys(BRANCH_META) as BranchStatus[]).map((item) => (
                <option key={item} value={item}>
                  {BRANCH_META[item].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Alasan" htmlFor="branch-reason" required hint="Akan terlihat pada audit; sebagian terlihat CPMI.">
            <Textarea
              id="branch-reason"
              value={branchReason}
              onChange={(e) => setBranchReason(e.target.value)}
              placeholder="Contoh: kandidat menunda proses karena alasan keluarga…"
            />
          </Field>
          {candidate.branchStatus ? (
            <InfoNote tone="warning">
              Kandidat sudah memiliki status cabang {BRANCH_META[candidate.branchStatus].label}.
              Menyimpan akan menggantinya dan menambah event baru.
            </InfoNote>
          ) : null}
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={docTarget !== null}
        onClose={() => {
          if (!busy) {
            setDocTarget(null)
            setError(null)
          }
        }}
        title={
          docTarget?.decision === 'approved'
            ? 'Setujui dokumen?'
            : docTarget?.decision === 'revision_required'
              ? 'Minta revisi dokumen?'
              : 'Tolak dokumen?'
        }
        description={docTarget?.label}
        tone={docTarget?.decision === 'rejected' ? 'danger' : 'default'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDocTarget(null)} disabled={busy}>
              Batal
            </Button>
            <Button
              variant={docTarget?.decision === 'approved' ? 'success' : docTarget?.decision === 'rejected' ? 'danger' : 'primary'}
              onClick={submitDoc}
              loading={busy}
              icon={docTarget?.decision === 'approved' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            >
              Simpan keputusan
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {docTarget?.decision !== 'approved' ? (
            <Field label="Catatan pemeriksa" htmlFor="doc-reason" required hint="Catatan dikirim ke CPMI dan agen.">
              <Textarea
                id="doc-reason"
                value={docReason}
                onChange={(e) => setDocReason(e.target.value)}
                placeholder="Jelaskan bagian yang perlu diperbaiki…"
              />
            </Field>
          ) : (
            <InfoNote tone="success" title="Dokumen akan disetujui">
              Persetujuan dicatat pada riwayat versi. Dokumen lama tetap tersimpan.
            </InfoNote>
          )}
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </Dialog>
    </div>
  )
}
