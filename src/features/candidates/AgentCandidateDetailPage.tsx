import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Handshake,
  MapPin,
  MessageSquareWarning,
  Phone,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { visibleCandidates, visibleLedger, visibleReferrals } from '@/lib/permissions'
import { latestDocument, requestHandover, scheduleVisit } from '@/lib/store'
import { DOC_TYPES, STATUS_META, STATUS_ORDER } from '@/lib/constants'
import { formatCurrency, formatDate, formatDateTime, formatRelative, toLocalInputValue } from '@/lib/format'
import { DataRow, InfoNote, PageHeader } from '@/components/shared/page'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button, LinkButton } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/form'
import { Avatar, EmptyState } from '@/components/ui/misc'
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
import type { BranchStatus } from '@/lib/types'

const OFFICE_LABEL = 'Kantor P3MI — Jl. Sutisna Senjaya, Tasikmalaya'

function defaultVisitValue() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(10, 0, 0, 0)
  return toLocalInputValue(date.toISOString())
}

export function AgentCandidateDetailPage() {
  const { id } = useParams()
  const { state, account } = useSession()
  const toast = useToast()
  const [visitOpen, setVisitOpen] = useState(false)
  const [handoverOpen, setHandoverOpen] = useState(false)
  const [visitAt, setVisitAt] = useState(defaultVisitValue())
  const [visitLocation, setVisitLocation] = useState(OFFICE_LABEL)
  const [visitNotes, setVisitNotes] = useState('')
  const [handoverNotes, setHandoverNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!account) return null
  const visible = visibleCandidates(state, account)
  const candidate = visible.find((c) => c.id === id)
  if (!candidate) {
    return (
      <div className="page-pad">
        <PageHeader backTo="/agen/kandidat" backLabel="Kandidat saya" title="Kandidat tidak ditemukan" />
        <EmptyState
          icon={<UserRound className="h-5 w-5" />}
          title="Data tidak tersedia"
          description="Kandidat mungkin bukan bagian dari jaringan Anda atau sudah tidak dapat diakses."
          action={
            <LinkButton to="/agen/kandidat" variant="secondary">
              Kembali ke daftar
            </LinkButton>
          }
        />
      </div>
    )
  }

  const referrals = visibleReferrals(state, account).filter((r) => r.candidateId === candidate.id)
  const referral =
    referrals.find((r) => r.status === 'accepted') ??
    referrals.sort(
      (a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime(),
    )[0]
  const agent = state.agents.find((a) => a.id === candidate.agentId)
  const vacancy = state.vacancies.find((v) => v.id === referral?.vacancyId)
  const org = state.organizations.find((o) => o.id === candidate.orgId)
  const consents = state.consents.filter((c) => c.candidateId === candidate.id)
  const sharingConsent = consents.find((c) => c.consentType === 'data_sharing')
  const processingConsent = consents.find((c) => c.consentType === 'data_processing')
  const visits = state.visits
    .filter((v) => v.candidateId === candidate.id)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
  const activeVisit = visits.find((v) => v.status === 'proposed' || v.status === 'confirmed')
  const attended = visits.some((v) => v.status === 'attended')
  const handover = state.handovers
    .filter((h) => h.candidateId === candidate.id)
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())[0]
  const documents = state.documents.filter((d) => d.candidateId === candidate.id)
  const ledger = visibleLedger(state, account).filter(
    (l) => !referral || l.referralId === referral.id,
  )
  const stageIndex = STATUS_ORDER.indexOf(candidate.status)
  const progress = Math.round(((stageIndex + 1) / STATUS_ORDER.length) * 100)
  const statusEvents = state.statusEvents
    .filter((e) => e.candidateId === candidate.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const referralEvents = state.referralEvents
    .filter((e) => referrals.some((r) => r.id === e.referralId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const canSchedule = referral?.status === 'accepted' && !activeVisit
  const canHandover =
    referral?.status === 'accepted' &&
    !handover &&
    (attended || stageIndex >= STATUS_ORDER.indexOf('initial_verification'))
  const revisionDocs = documents.filter((d) => d.status === 'revision_required')
  const approvedRequired = DOC_TYPES.filter((type) => type.required).filter(
    (type) => latestDocument(state, candidate.id, type.id)?.status === 'approved',
  ).length
  const requiredCount = DOC_TYPES.filter((type) => type.required).length

  const submitVisit = () => {
    setError(null)
    if (!visitAt) {
      setError('Tanggal dan waktu kunjungan wajib diisi.')
      return
    }
    setBusy(true)
    const result = scheduleVisit(candidate.id, new Date(visitAt).toISOString(), visitLocation, visitNotes)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success('Jadwal diusulkan', 'P3MI akan mengonfirmasi jadwal kunjungan kandidat.')
    setVisitOpen(false)
    setVisitNotes('')
  }

  const submitHandover = () => {
    setError(null)
    setBusy(true)
    const result = requestHandover(candidate.id, handoverNotes)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success('Serah terima diajukan', 'Menunggu konfirmasi P3MI.')
    setHandoverOpen(false)
    setHandoverNotes('')
  }

  return (
    <div className="page-pad">
      <PageHeader
        backTo="/agen/kandidat"
        backLabel="Kandidat saya"
        eyebrow={`${candidate.candidateCode} · ${candidate.region}`}
        title={candidate.fullName}
        description={`Referensi ${agent?.code ?? '—'} · agen ${agent?.name ?? '—'} · terakhir aktif ${formatRelative(candidate.lastActivityAt)}`}
        meta={
          <>
            <CandidateStatusBadge status={candidate.status} branch={candidate.branchStatus} />
            {referral ? <ReferralBadge status={referral.status} /> : null}
          </>
        }
        actions={
          <>
            <LinkButton to="/agen/bantuan" variant="secondary" icon={<MessageSquareWarning className="h-4 w-4" />}>
              Pengaduan
            </LinkButton>
            {canSchedule ? (
              <Button
                variant="accent"
                icon={<CalendarDays className="h-4 w-4" />}
                onClick={() => {
                  setError(null)
                  setVisitOpen(true)
                }}
              >
                Usulkan jadwal
              </Button>
            ) : canHandover ? (
              <Button
                variant="accent"
                icon={<Handshake className="h-4 w-4" />}
                onClick={() => {
                  setError(null)
                  setHandoverOpen(true)
                }}
              >
                Ajukan handover
              </Button>
            ) : null}
          </>
        }
      />

      {candidate.branchStatus ? (
        <div className="mb-4">
          <InfoNote
            tone={candidate.branchStatus === 'rejected' ? 'warning' : 'warning'}
            title={candidate.branchStatus === 'revision_required' ? 'Perlu perbaikan' : 'Catatan proses'}
          >
            {candidate.branchReason ?? 'Ada catatan dari P3MI yang perlu ditindaklanjuti.'}
          </InfoNote>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="bg-radial-brand p-5 text-white">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Avatar name={candidate.fullName} size="lg" />
                  <div>
                    <p className="text-base font-extrabold">{candidate.fullName}</p>
                    <p className="mt-0.5 text-[10px] text-white/55">
                      {candidate.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                      {candidate.birthDate ? ` · lahir ${formatDate(candidate.birthDate)}` : ''}
                      {candidate.education ? ` · ${candidate.education}` : ''}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-bold">
                        {STATUS_META[candidate.status].label}
                      </span>
                      <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-bold">
                        Tahap {stageIndex + 1}/{STATUS_ORDER.length}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-amber-200">Progres</p>
                  <p className="mt-1 text-2xl font-extrabold">{progress}%</p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-[10px] leading-4 text-white/55">
                {STATUS_META[candidate.status].description} Status ini adalah catatan operasional P3MI,
                bukan data resmi pemerintah.
              </p>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader title="Data kandidat" description="Hanya data yang diperlukan." icon={<UserRound className="h-4 w-4" />} />
              <CardContent className="divide-y divide-line pt-1">
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
                <DataRow label="Sumber" value={candidate.source === 'agent' ? 'Referral agen' : candidate.source === 'p3mi' ? 'Input P3MI' : 'Datang langsung'} />
                {candidate.address ? <DataRow label="Alamat" value={candidate.address} /> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Referral & sumber" description="Atribusi tercatat secara operasional." icon={<FileText className="h-4 w-4" />} />
              <CardContent className="pt-1">
                {referral ? (
                  <div className="space-y-1">
                    <DataRow label="Kode" value={<span className="font-mono">{referral.code}</span>} />
                    <DataRow label="Diajukan" value={formatDate(referral.submittedAt)} />
                    <DataRow label="Agen" value={agent?.name ?? '—'} />
                    <DataRow
                      label="Sumber terkunci"
                      value={referral.attributionLocked ? 'Ya' : 'Belum'}
                    />
                    {referral.rejectionReason ? (
                      <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[10px] leading-4 text-red-800">
                        {referral.rejectionReason}
                      </p>
                    ) : null}
                    {referral.duplicateWarning ? (
                      <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[9px] leading-4 text-amber-900">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        Referral memiliki peringatan duplikat dan sedang/telah ditinjau P3MI.
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="py-4 text-center text-xs text-muted">Belum ada referral tercatat.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Langkah berikutnya"
              description="Tindakan yang dapat Anda lakukan tanpa mengubah keputusan P3MI."
              icon={<ArrowRight className="h-4 w-4" />}
            />
            <CardContent className="pt-2">
              <ol className="space-y-2.5">
                {buildNextSteps({
                  referralStatus: referral?.status,
                  activeVisit: Boolean(activeVisit),
                  attended,
                  handoverStatus: handover?.status,
                  revisionCount: revisionDocs.length,
                }).map((step, index) => (
                  <li key={step.title} className="flex items-start gap-2.5 rounded-xl border border-line p-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-ink">{step.title}</p>
                      <p className="mt-0.5 text-[10px] leading-4 text-muted">{step.body}</p>
                    </div>
                    {step.done ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    )}
                  </li>
                ))}
              </ol>
              {canSchedule ? (
                <Button
                  className="mt-3 w-full"
                  variant="secondary"
                  icon={<CalendarDays className="h-4 w-4" />}
                  onClick={() => setVisitOpen(true)}
                >
                  Usulkan jadwal kunjungan
                </Button>
              ) : null}
              {canHandover ? (
                <Button
                  className="mt-2 w-full"
                  variant="secondary"
                  icon={<Handshake className="h-4 w-4" />}
                  onClick={() => setHandoverOpen(true)}
                >
                  Ajukan serah terima
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Dokumen"
              description={`${approvedRequired}/${requiredCount} dokumen wajib disetujui. Unggah melalui portal CPMI.`}
              icon={<FileCheck2 className="h-4 w-4" />}
              action={
                revisionDocs.length ? (
                  <Badge tone="warning">{revisionDocs.length} perlu revisi</Badge>
                ) : null
              }
            />
            <CardContent className="pt-2">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {DOC_TYPES.map((type) => {
                  const doc = latestDocument(state, candidate.id, type.id)
                  return (
                    <div key={type.id} className="rounded-xl border border-line p-3">
                      <p className="text-[10px] font-bold text-slate-700">{type.label}</p>
                      <div className="mt-2">
                        {doc ? (
                          <div className="space-y-1">
                            <DocumentBadge status={doc.status} />
                            <p className="truncate text-[9px] text-muted">
                              v{doc.version} · {formatRelative(doc.uploadedAt)}
                            </p>
                          </div>
                        ) : (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-500">
                            Belum diunggah
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {revisionDocs.length ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-900">
                  Bantu CPMI mengunggah ulang dokumen yang ditandai. Catatan pemeriksa tersedia pada
                  portal CPMI. Agen tidak dapat mengubah hasil pemeriksaan.
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Riwayat proses" description="Gabungan event referral dan perubahan status." icon={<Clock3 className="h-4 w-4" />} />
            <CardContent className="pt-3">
              {statusEvents.length === 0 && referralEvents.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted">Belum ada riwayat.</p>
              ) : (
                <Timeline
                  items={[
                    ...referralEvents.map((event) => ({
                      id: event.id,
                      title:
                        event.type === 'submitted'
                          ? 'Referral diajukan'
                          : event.type === 'accepted'
                            ? 'Referral diterima P3MI'
                            : event.type === 'rejected'
                              ? 'Referral ditolak'
                              : event.type === 'source_locked'
                                ? 'Sumber referral dikunci'
                                : event.type === 'duplicate_warning'
                                  ? 'Peringatan duplikat'
                                  : event.type,
                      description: event.reason,
                      timestamp: formatDateTime(event.createdAt),
                      actor: event.actorName,
                      tone:
                        event.type === 'rejected' || event.type === 'duplicate_warning'
                          ? ('danger' as const)
                          : event.type === 'accepted'
                            ? ('success' as const)
                            : ('brand' as const),
                    })),
                    ...statusEvents.map((event) => ({
                      id: event.id,
                      title:
                        STATUS_META[event.toStatus as keyof typeof STATUS_META]?.label ??
                        (event.toStatus as BranchStatus) ??
                        event.toStatus,
                      description: event.reason,
                      timestamp: formatDateTime(event.createdAt),
                      actor: event.actorName,
                      tone: 'brand' as const,
                    })),
                  ]
                    .sort(
                      (a, b) =>
                        new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime(),
                    )
                    .slice(0, 14)}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="lg:sticky lg:top-20">
            <CardHeader title="Jadwal & serah terima" description="Koordinasi dengan kantor P3MI." icon={<CalendarDays className="h-4 w-4" />} />
            <CardContent className="space-y-3 pt-2">
              {activeVisit ? (
                <div className="rounded-xl border border-line bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold text-ink">{formatDateTime(activeVisit.scheduledAt)}</p>
                      <p className="mt-0.5 text-[9px] text-muted">{activeVisit.locationLabel}</p>
                    </div>
                    <VisitBadge status={activeVisit.status} />
                  </div>
                  {activeVisit.notes ? (
                    <p className="mt-2 text-[9px] leading-4 text-slate-600">{activeVisit.notes}</p>
                  ) : null}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[10px] text-muted">
                  Tidak ada jadwal aktif.
                </p>
              )}

              <div className="flex items-center justify-between border-t border-line pt-3 text-[10px]">
                <span className="text-muted">Serah terima</span>
                {handover ? <HandoverBadge status={handover.status} /> : <span className="font-semibold text-slate-500">Belum diajukan</span>}
              </div>
              {handover?.proofReference ? (
                <p className="font-mono text-[9px] text-muted">Bukti {handover.proofReference}</p>
              ) : null}
              {handover?.notes ? (
                <p className="rounded-lg bg-slate-50 px-2.5 py-2 text-[9px] leading-4 text-slate-600">{handover.notes}</p>
              ) : null}

              {!activeVisit && referral?.status === 'accepted' ? (
                <Button size="sm" variant="secondary" className="w-full" onClick={() => setVisitOpen(true)}>
                  Usulkan jadwal
                </Button>
              ) : null}
              {!handover && referral?.status === 'accepted' ? (
                <Button
                  size="sm"
                  variant={canHandover ? 'primary' : 'secondary'}
                  className="w-full"
                  disabled={!canHandover}
                  onClick={() => setHandoverOpen(true)}
                >
                  Ajukan handover
                </Button>
              ) : null}
              {!canHandover && !handover && referral?.status === 'accepted' ? (
                <p className="text-[9px] leading-4 text-muted">
                  Handover dapat diajukan setelah kandidat hadir ke kantor P3MI atau pemeriksaan awal dimulai.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Persetujuan data" description="Consent CPMI tercatat terpisah." icon={<ShieldCheck className="h-4 w-4" />} />
            <CardContent className="space-y-2 pt-2">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-2">
                <span className="text-[10px] text-slate-600">Pemrosesan</span>
                <ConsentBadge revoked={Boolean(processingConsent?.revokedAt)} missing={!processingConsent} />
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-2">
                <span className="text-[10px] text-slate-600">Pembagian ke P3MI</span>
                <ConsentBadge revoked={Boolean(sharingConsent?.revokedAt)} missing={!sharingConsent} />
              </div>
              <p className="text-[9px] leading-4 text-muted">
                Persetujuan tidak dapat diganti dengan persetujuan komisi agen. Bila CPMI menarik
                persetujuan, proses akan dijeda untuk telaah.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Komisi referral" description="Hanya milestone terverifikasi." icon={<Wallet className="h-4 w-4" />} />
            <CardContent className="pt-2">
              {ledger.length === 0 ? (
                <p className="py-4 text-center text-[10px] text-muted">
                  Belum ada fee untuk referral ini.
                </p>
              ) : (
                <div className="space-y-2">
                  {ledger.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-line p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[10px] font-bold text-ink">{entry.label}</p>
                        <LedgerBadge status={entry.status} />
                      </div>
                      <p className="mt-1 text-[10px] font-semibold text-brand">
                        {formatCurrency(entry.amount, entry.currency)}
                      </p>
                      <p className="text-[8px] text-muted">Jatuh tempo {formatDate(entry.dueAt)}</p>
                    </div>
                  ))}
                  <Link to="/agen/komisi" className="inline-flex items-center gap-1 text-[10px] font-bold text-brand hover:underline">
                    Buka komisi <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {vacancy ? (
            <Card>
              <CardHeader title="Lowongan terkait" description={`${vacancy.country} · ${vacancy.sector}`} icon={<BriefcaseBusiness className="h-4 w-4" />} />
              <CardContent className="pt-1">
                <p className="text-xs font-bold text-ink">{vacancy.title}</p>
                <p className="mt-1 text-[10px] text-muted">
                  {formatCurrency(vacancy.wageMin, vacancy.wageCurrency)} –{' '}
                  {formatCurrency(vacancy.wageMax, vacancy.wageCurrency)} / {vacancy.wageType}
                </p>
                <p className="mt-2 text-[9px] leading-4 text-slate-500">
                  Referensi lowongan diverifikasi P3MI. Bukan jaminan penempatan.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <div className="rounded-xl border border-line bg-surface p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-ink">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Kontak P3MI
            </p>
            <p className="mt-1 text-[10px] text-muted">{org?.legalName}</p>
            <p className="text-[9px] text-muted">{org?.contactEmail}</p>
            <p className="mt-2 text-[9px] leading-4 text-slate-500">
              Jangan meminta atau mengirim dokumen pribadi melalui chat pribadi tanpa kanal resmi.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-amber-900">
              <AlertTriangle className="h-3.5 w-3.5" /> Reminder kepatuhan
            </p>
            <p className="mt-1 text-[9px] leading-4 text-amber-900/80">
              Jangan menjanjikan lowongan, visa, atau fee sebelum ada konfirmasi tertulis dari P3MI.
              Data pada mode demo ini sintetis.
            </p>
          </div>
        </div>
      </div>

      <Dialog
        open={visitOpen}
        onClose={() => {
          if (!busy) {
            setVisitOpen(false)
            setError(null)
          }
        }}
        title="Usulkan jadwal kunjungan"
        description="Jadwal akan berstatus menunggu konfirmasi P3MI. Pastikan CPMI sudah setuju dengan waktu ini."
        footer={
          <>
            <Button variant="secondary" onClick={() => setVisitOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button onClick={submitVisit} loading={busy} icon={<CalendarDays className="h-4 w-4" />}>
              Kirim usulan
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Tanggal & waktu" htmlFor="visit-at" required>
            <Input
              id="visit-at"
              type="datetime-local"
              value={visitAt}
              onChange={(e) => setVisitAt(e.target.value)}
            />
          </Field>
          <Field label="Lokasi" htmlFor="visit-location" required>
            <Input
              id="visit-location"
              value={visitLocation}
              onChange={(e) => setVisitLocation(e.target.value)}
            />
          </Field>
          <Field label="Catatan" htmlFor="visit-notes" hint="Misalnya dokumen asli yang perlu dibawa.">
            <Textarea
              id="visit-notes"
              value={visitNotes}
              onChange={(e) => setVisitNotes(e.target.value)}
              placeholder="Bawa KTP asli dan ijazah…"
            />
          </Field>
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={handoverOpen}
        onClose={() => {
          if (!busy) {
            setHandoverOpen(false)
            setError(null)
          }
        }}
        title="Ajukan serah terima"
        description="P3MI akan mengonfirmasi penerimaan kandidat. Handover bukan perpindahan kepemilikan data; tetap ada jejak audit."
        footer={
          <>
            <Button variant="secondary" onClick={() => setHandoverOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button onClick={submitHandover} loading={busy} icon={<Handshake className="h-4 w-4" />}>
              Ajukan handover
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-slate-50 p-3">
            <p className="text-[10px] font-bold text-ink">Ringkasan kandidat</p>
            <p className="mt-1 text-[10px] text-muted">
              {candidate.fullName} · {candidate.candidateCode} · {candidate.region}
            </p>
            <p className="mt-1 text-[10px] text-muted">
              Status saat ini: {STATUS_META[candidate.status].label}
            </p>
          </div>
          <Field label="Catatan untuk P3MI" htmlFor="handover-notes" hint="Opsional, tetapi membantu pemeriksaan awal.">
            <Textarea
              id="handover-notes"
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              placeholder="Kandidat sudah hadir, dokumen awal sudah diserahkan…"
            />
          </Field>
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

function buildNextSteps(input: {
  referralStatus?: string
  activeVisit: boolean
  attended: boolean
  handoverStatus?: string
  revisionCount: number
}) {
  return [
    {
      title: 'Referral diterima P3MI',
      body: 'Sumber referral dikunci setelah penerimaan.',
      done: input.referralStatus === 'accepted',
    },
    {
      title: 'Kunjungan ke kantor',
      body: input.activeVisit
        ? 'Jadwal sudah diusulkan dan menunggu konfirmasi P3MI.'
        : input.attended
          ? 'Kandidat sudah hadir ke kantor P3MI.'
          : 'Usulkan jadwal kunjungan agar pemeriksaan awal dapat dimulai.',
      done: input.attended,
    },
    {
      title: 'Serah terima ke P3MI',
      body: input.handoverStatus === 'accepted'
        ? 'P3MI sudah menerima serah terima.'
        : input.handoverStatus === 'requested'
          ? 'Menunggu konfirmasi P3MI.'
          : 'Diajukan setelah kandidat hadir atau pemeriksaan awal dimulai.',
      done: input.handoverStatus === 'accepted',
    },
    {
      title: 'Kelengkapan dokumen',
      body:
        input.revisionCount > 0
          ? `${input.revisionCount} dokumen perlu diperbaiki melalui portal CPMI.`
          : 'Tidak ada revisi dokumen yang terbuka.',
      done: input.revisionCount === 0,
    },
  ]
}
