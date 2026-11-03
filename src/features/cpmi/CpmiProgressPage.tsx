import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  FileCheck2,
  FileWarning,
  Flag,
  LifeBuoy,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSession } from '@/app/session'
import { latestDocument } from '@/lib/store'
import { BRANCH_META, DOC_TYPES, STATUS_META, STATUS_ORDER } from '@/lib/constants'
import { formatDate, formatDateTime, percent } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { CandidateStatusBadge, DocumentBadge, VisitBadge } from '@/components/shared/status'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { EmptyState, Progress } from '@/components/ui/misc'
import { Timeline } from '@/components/shared/timeline'
import { cn } from '@/lib/utils'

export function CpmiProgressPage() {
  const { state, account } = useSession()
  if (!account) return null
  const candidate = state.candidates.find((c) => c.accountId === account.id)
  if (!candidate) {
    return (
      <div className="page-pad">
        <PageHeader title="Perkembangan" description="Akun belum terhubung dengan data CPMI." />
        <EmptyState
          icon={<Flag className="h-5 w-5" />}
          title="Data belum tersedia"
          description="Hubungi P3MI untuk menautkan akun dengan data kandidat."
        />
      </div>
    )
  }

  const currentIndex = STATUS_ORDER.indexOf(candidate.status)
  const progress = percent(currentIndex + 1, STATUS_ORDER.length)
  const required = DOC_TYPES.filter((t) => t.required)
  const approvedRequired = required.filter(
    (t) => latestDocument(state, candidate.id, t.id)?.status === 'approved',
  ).length
  const pendingDocs = state.documents.filter(
    (d) => d.candidateId === candidate.id && d.status === 'pending_review',
  ).length
  const revisionDocs = state.documents.filter(
    (d) => d.candidateId === candidate.id && d.status === 'revision_required',
  ).length
  const upcomingVisits = state.visits
    .filter(
      (v) =>
        v.candidateId === candidate.id &&
        (v.status === 'proposed' || v.status === 'confirmed'),
    )
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  const events = state.statusEvents
    .filter((e) => e.candidateId === candidate.id && e.visibility === 'candidate')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const consults = state.consents.filter((c) => c.candidateId === candidate.id)
  const consentActive = consults.some((c) => !c.revokedAt)

  const nextStage = STATUS_ORDER[Math.min(currentIndex + 1, STATUS_ORDER.length - 1)]
  const actions: string[] = []
  if (!consentActive) actions.push('Hubungi P3MI untuk meninjau persetujuan data yang ditarik.')
  if (revisionDocs) actions.push('Perbaiki dokumen yang diminta revisi pada menu Dokumen Saya.')
  if (pendingDocs) actions.push('Tunggu pemeriksaan dokumen oleh P3MI; tidak perlu unggah ulang.')
  if (upcomingVisits.length) actions.push('Hadir sesuai jadwal kunjungan ke kantor P3MI.')
  if (!actions.length)
    actions.push('Pantau notifikasi dan siapkan dokumen berikutnya sesuai arahan P3MI.')

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow={candidate.candidateCode}
        title="Perkembangan proses"
        description="Status ini adalah catatan operasional P3MI pada pilot, bukan pengganti informasi resmi pemerintah atau visa."
        meta={<CandidateStatusBadge status={candidate.status} branch={candidate.branchStatus} audience="cpmi" />}
        actions={
          <LinkButton to="/cpmi/bantuan" variant="secondary" icon={<LifeBuoy className="h-4 w-4" />}>
            Ada kendala?
          </LinkButton>
        }
      />

      {candidate.branchStatus ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="text-[11px] font-bold text-amber-900">
              {BRANCH_META[candidate.branchStatus].label}
            </p>
            <p className="mt-0.5 text-[10px] leading-4 text-amber-900/80">
              {candidate.branchReason ?? BRANCH_META[candidate.branchStatus].description}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Tahap proses"
          value={`${currentIndex + 1}/${STATUS_ORDER.length}`}
          hint={STATUS_META[candidate.status].cpmiLabel}
          icon={<Flag className="h-5 w-5" />}
          tone="brand"
          progress={progress}
        />
        <StatCard
          label="Dokumen wajib"
          value={`${approvedRequired}/${required.length}`}
          hint={revisionDocs ? `${revisionDocs} perlu revisi` : `${pendingDocs} menunggu pemeriksaan`}
          icon={<FileCheck2 className="h-5 w-5" />}
          tone={revisionDocs ? 'warning' : 'success'}
        />
        <StatCard
          label="Kunjungan"
          value={upcomingVisits.length}
          hint={upcomingVisits[0] ? formatDate(upcomingVisits[0].scheduledAt) : 'Belum ada jadwal'}
          icon={<CalendarDays className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label="Persetujuan data"
          value={consentActive ? 'Aktif' : 'Ditarik'}
          hint={consentActive ? 'Pemrosesan berjalan' : 'Proses dijeda'}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone={consentActive ? 'success' : 'danger'}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Peta tahapan"
              description="Tahapan yang sudah dilalui ditandai selesai. P3MI dapat mencatat status cabang bila perlu."
              icon={<Flag className="h-4 w-4" />}
              action={<span className="text-[10px] font-bold text-brand">{progress}%</span>}
            />
            <CardContent className="space-y-3">
              <Progress value={progress} />
              <ol className="space-y-0.5">
                {STATUS_ORDER.map((status, index) => {
                  const done = index < currentIndex
                  const current = index === currentIndex
                  return (
                    <li
                      key={status}
                      className={cn(
                        'flex items-start gap-3 rounded-lg px-2 py-1.5',
                        current && 'bg-brand-soft',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold',
                          done
                            ? 'bg-emerald-100 text-emerald-700'
                            : current
                              ? 'bg-brand text-white'
                              : 'border border-slate-200 text-slate-400',
                        )}
                      >
                        {done ? <CheckCircle2 className="h-3 w-3" /> : current ? index + 1 : <Circle className="h-2 w-2" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'text-[11px]',
                            current ? 'font-bold text-brand' : done ? 'font-semibold text-slate-600' : 'text-slate-400',
                          )}
                        >
                          {STATUS_META[status].cpmiLabel}
                        </p>
                        {current ? (
                          <p className="mt-0.5 text-[9px] leading-4 text-brand/70">
                            {STATUS_META[status].description}
                          </p>
                        ) : null}
                      </div>
                      {current ? (
                        <Badge tone="brand" dot>
                          Sekarang
                        </Badge>
                      ) : null}
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Riwayat yang dapat Anda lihat"
              description="Catatan internal P3MI tidak ditampilkan di sini."
              icon={<Clock3 className="h-4 w-4" />}
            />
            <CardContent>
              {events.length === 0 ? (
                <p className="py-4 text-center text-[11px] text-muted">Belum ada riwayat.</p>
              ) : (
                <Timeline
                  items={events.map((event) => ({
                    id: event.id,
                    title: event.toStatus ? STATUS_META[event.toStatus as keyof typeof STATUS_META]?.cpmiLabel ?? event.toStatus : 'Pembaruan status',
                    description: event.reason,
                    timestamp: formatDateTime(event.createdAt),
                    actor: event.actorName,
                    tone: event.toStatus === 'rejected' || event.toStatus === 'withdrawn' ? 'danger' : 'brand',
                  }))}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Langkah berikutnya"
              description={currentIndex < STATUS_ORDER.length - 1 ? `Menuju: ${STATUS_META[nextStage].cpmiLabel}` : 'Tahap akhir pemantauan'}
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <CardContent className="space-y-2">
              {actions.map((action) => (
                <div key={action} className="flex items-start gap-2 rounded-lg border border-line px-2.5 py-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <p className="text-[10px] leading-4 text-slate-600">{action}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {upcomingVisits[0] ? (
            <Card>
              <CardHeader title="Jadwal kunjungan" icon={<CalendarDays className="h-4 w-4" />} />
              <CardContent className="space-y-2">
                {upcomingVisits.map((visit) => (
                  <div key={visit.id} className="rounded-lg border border-line px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold text-ink">
                        {formatDateTime(visit.scheduledAt)}
                      </p>
                      <VisitBadge status={visit.status} />
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-[9px] text-muted">
                      <MapPin className="h-3 w-3" /> {visit.locationLabel}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Dokumen terakhir" icon={<FileCheck2 className="h-4 w-4" />} />
            <CardContent className="space-y-2">
              {required.map((type) => {
                const doc = latestDocument(state, candidate.id, type.id)
                return (
                  <div key={type.id} className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-600">{type.label}</span>
                    {doc ? (
                      <DocumentBadge status={doc.status} />
                    ) : (
                      <span className="text-[9px] text-slate-400">Belum ada</span>
                    )}
                  </div>
                )
              })}
              {revisionDocs ? (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[10px] leading-4 text-amber-900">
                  <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Ada dokumen yang perlu diperbaiki. Buka menu Dokumen Saya.
                </div>
              ) : null}
              <LinkButton to="/cpmi/dokumen" variant="secondary" size="sm" className="w-full">
                Kelola dokumen
              </LinkButton>
            </CardContent>
          </Card>

          <InfoNote tone="info" title="Status bukan jaminan">
            Tahapan dapat berubah bila ada revisi, penundaan, atau keputusan pemberi kerja. Jangan
            berhenti bekerja atau mengeluarkan biaya besar hanya berdasarkan status aplikasi.
          </InfoNote>

          <div className="text-center">
            <Link to="/cpmi/bantuan" className="text-[10px] font-bold text-brand hover:underline">
              Laporkan masalah proses <LifeBuoy className="ml-0.5 inline h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
