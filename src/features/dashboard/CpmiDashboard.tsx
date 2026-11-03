import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileWarning,
  LifeBuoy,
  MapPin,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { DOC_TYPES, STATUS_META, STATUS_ORDER } from '@/lib/constants'
import { visibleComplaints } from '@/lib/permissions'
import { latestDocument } from '@/lib/store'
import {
  formatDate,
  formatDateLong,
  formatDateTime,
  isToday,
  percent,
} from '@/lib/format'
import { PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/button'
import { DocumentBadge } from '@/components/shared/status'
import { Timeline } from '@/components/shared/timeline'
import { InfoNote } from '@/components/shared/page'
import { cn } from '@/lib/utils'

export function CpmiDashboard() {
  const { state, account } = useSession()
  if (!account) return null
  const candidate = state.candidates.find((c) => c.accountId === account.id)
  if (!candidate) {
    return (
      <div className="page-pad">
        <PageHeader title="Beranda" description="Akun CPMI belum terhubung dengan data kandidat." />
        <InfoNote tone="warning" title="Data belum terhubung">
          Hubungi admin P3MI untuk menautkan akun ini dengan profil CPMI Anda. Jangan membuat akun
          baru dengan email milik orang lain.
        </InfoNote>
      </div>
    )
  }

  const meta = STATUS_META[candidate.status]
  const stageIndex = STATUS_ORDER.indexOf(candidate.status)
  const progress = percent(stageIndex + 1, STATUS_ORDER.length)
  const documents = state.documents.filter((d) => d.candidateId === candidate.id)
  const required = DOC_TYPES.filter((d) => d.required)
  const latestRequired = required.map((type) => ({
    type,
    doc: latestDocument(state, candidate.id, type.id),
  }))
  const approvedRequired = latestRequired.filter((row) => row.doc?.status === 'approved').length
  const revision = documents.filter((d) => d.status === 'revision_required')
  const consent = state.consents.find(
    (c) => c.candidateId === candidate.id && c.consentType === 'data_sharing',
  )
  const visit = state.visits
    .filter(
      (v) =>
        v.candidateId === candidate.id &&
        (v.status === 'proposed' || v.status === 'confirmed') &&
        new Date(v.scheduledAt).getTime() > Date.now() - 3600000,
    )
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]
  const complaints = visibleComplaints(state, account)
  const openComplaints = complaints.filter((c) => c.status !== 'resolved' && c.status !== 'closed')
  const events = state.statusEvents
    .filter((e) => e.candidateId === candidate.id && e.visibility === 'candidate')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const nextStep = (() => {
    if (candidate.branchStatus === 'revision_required') {
      return {
        title: 'Lengkapi dokumen yang perlu diperbaiki',
        body:
          revision[0]?.documentType
            ? `Dokumen ${DOC_TYPES.find((d) => d.id === revision[0].documentType)?.label ?? ''} perlu diunggah ulang.`
            : 'Ada dokumen yang perlu diperbaiki.',
        href: '/cpmi/dokumen',
        tone: 'warning' as const,
      }
    }
    if (!visit && stageIndex < STATUS_ORDER.indexOf('office_visit_confirmed')) {
      return {
        title: 'Menunggu jadwal kunjungan',
        body: 'P3MI akan mengonfirmasi jadwal kunjungan ke kantor. Pastikan nomor telepon aktif.',
        href: '/cpmi/perkembangan',
        tone: 'info' as const,
      }
    }
    if (visit) {
      return {
        title: isToday(visit.scheduledAt) ? 'Hadir ke kantor P3MI hari ini' : 'Jadwal kunjungan Anda',
        body: `${formatDateTime(visit.scheduledAt)} · ${visit.locationLabel}`,
        href: '/cpmi/perkembangan',
        tone: 'success' as const,
      }
    }
    if (approvedRequired < required.length) {
      return {
        title: 'Lengkapi dokumen awal',
        body: `${approvedRequired} dari ${required.length} dokumen wajib sudah disetujui.`,
        href: '/cpmi/dokumen',
        tone: 'warning' as const,
      }
    }
    return {
      title: 'Proses berjalan di P3MI',
      body: 'Tidak ada tindakan mendesak. Pantau perkembangan secara berkala.',
      href: '/cpmi/perkembangan',
      tone: 'info' as const,
    }
  })()

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow={formatDateLong(new Date().toISOString())}
        title={`Halo, ${candidate.nickname}`}
        description="Portal CPMI untuk melihat status, melengkapi dokumen, dan menghubungi P3MI. Status di sini adalah catatan P3MI, bukan data resmi pemerintah."
        actions={
          <LinkButton to="/cpmi/dokumen" variant="accent" icon={<FileCheck2 className="h-4 w-4" />}>
            Kelola dokumen
          </LinkButton>
        }
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted">
              <UserRound className="h-3 w-3" /> {candidate.candidateCode}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted">
              <MapPin className="h-3 w-3" /> {candidate.region}
            </span>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="overflow-hidden rounded-2xl bg-radial-brand text-white shadow-card lg:col-span-2">
          <div className="relative p-5 sm:p-6">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
                    Status proses Anda
                  </p>
                  <p className="mt-1.5 text-xl font-extrabold tracking-tight sm:text-2xl">
                    {meta.cpmiLabel}
                  </p>
                  <p className="mt-1 text-[11px] text-white/55">{meta.description}</p>
                </div>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-white">
                  Tahap {stageIndex + 1} dari {STATUS_ORDER.length}
                </span>
              </div>

              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between text-[10px] text-white/50">
                  <span>Progres keseluruhan</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[9px] text-white/35">
                  <span>Pendaftaran</span>
                  <span>Persiapan</span>
                  <span>Berangkat</span>
                  <span>Monitoring</span>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.07] p-3.5">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-brand-deep">
                    {nextStep.tone === 'warning' ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold">{nextStep.title}</p>
                    <p className="mt-0.5 text-[10px] leading-4 text-white/60">{nextStep.body}</p>
                  </div>
                  <Link
                    to={nextStep.href}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20"
                    aria-label="Buka langkah berikutnya"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {candidate.branchStatus ? (
                <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-[10px] leading-4 text-amber-100">
                  Catatan: {candidate.branchReason ?? 'Ada catatan tambahan dari P3MI.'}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <StatCard
            label="Dokumen disetujui"
            value={`${approvedRequired}/${required.length}`}
            hint={`${documents.length} file terunggah`}
            icon={<FileCheck2 className="h-5 w-5" />}
            tone="brand"
            progress={percent(approvedRequired, required.length)}
            to="/cpmi/dokumen"
          />
          <StatCard
            label="Perlu diperbaiki"
            value={revision.length}
            hint={revision.length ? 'Lihat catatan pemeriksa' : 'Tidak ada revisi'}
            icon={<FileWarning className="h-5 w-5" />}
            tone={revision.length ? 'warning' : 'success'}
            to="/cpmi/dokumen"
          />
          <StatCard
            label="Pengaduan aktif"
            value={openComplaints.length}
            hint="Hubungi P3MI bila ada kendala"
            icon={<LifeBuoy className="h-5 w-5" />}
            tone="slate"
            to="/cpmi/bantuan"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Perkembangan terbaru"
            description="Versi sederhana dari timeline proses. Catatan internal P3MI tidak ditampilkan."
            icon={<Clock3 className="h-4 w-4" />}
            action={
              <Link to="/cpmi/perkembangan" className="text-[10px] font-bold text-brand hover:underline">
                Lihat semua
              </Link>
            }
          />
          <CardContent className="pt-3">
            <Timeline
              items={events.slice(0, 5).map((event) => ({
                id: event.id,
                title:
                  STATUS_META[event.toStatus as keyof typeof STATUS_META]?.cpmiLabel ??
                  event.toStatus,
                description: event.reason,
                timestamp: formatDateTime(event.createdAt),
                actor: event.visibility === 'candidate' ? 'Tim P3MI' : undefined,
                tone:
                  event.toStatus === 'rejected' ||
                  event.toStatus === 'revision_required' ||
                  event.toStatus === 'on_hold'
                    ? 'warning'
                    : 'brand',
              }))}
            />
            {events.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">Belum ada catatan perkembangan.</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Kunjungan"
              description="Jadwal Anda ke kantor P3MI."
              icon={<CalendarDays className="h-4 w-4" />}
            />
            <CardContent className="pt-2">
              {visit ? (
                <div className="rounded-xl border border-line bg-slate-50/70 p-3">
                  <p className="text-xs font-bold text-ink">{formatDateTime(visit.scheduledAt)}</p>
                  <p className="mt-1 flex items-start gap-1 text-[10px] leading-4 text-muted">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {visit.locationLabel}
                  </p>
                  {visit.notes ? (
                    <p className="mt-2 rounded-lg bg-surface px-2 py-1.5 text-[10px] leading-4 text-slate-600">
                      {visit.notes}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="py-4 text-center text-xs text-muted">Belum ada jadwal kunjungan.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Persetujuan data"
              description="Dasar pemrosesan data Anda."
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <CardContent className="pt-2">
              {consent ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted">Status</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[9px] font-bold',
                        consent.revokedAt
                          ? 'bg-red-50 text-red-700'
                          : 'bg-emerald-50 text-emerald-700',
                      )}
                    >
                      {consent.revokedAt ? 'Ditarik' : 'Tercatat'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted">Versi pemberitahuan</span>
                    <span className="text-[10px] font-semibold text-ink">{consent.noticeVersion}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted">Tanggal</span>
                    <span className="text-[10px] font-semibold text-ink">
                      {formatDate(consent.consentedAt)}
                    </span>
                  </div>
                  <Link
                    to="/cpmi/data"
                    className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-brand hover:underline"
                  >
                    Kelola persetujuan <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <p className="py-4 text-center text-xs text-muted">Belum ada catatan persetujuan.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="mt-4">
        <Card>
          <CardHeader
            title="Dokumen awal"
            description="Hanya dokumen yang diminta P3MI. File disimpan pada bucket privat."
            icon={<FileCheck2 className="h-4 w-4" />}
            action={
              <Link to="/cpmi/dokumen" className="text-[10px] font-bold text-brand hover:underline">
                Kelola dokumen
              </Link>
            }
          />
          <CardContent className="pt-2">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {latestRequired.map(({ type, doc }) => (
                <div key={type.id} className="rounded-xl border border-line p-3">
                  <p className="text-[10px] font-bold text-slate-700">{type.label}</p>
                  <div className="mt-2">
                    {doc ? (
                      <DocumentBadge status={doc.status} />
                    ) : (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-500">
                        Belum diunggah
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {revision.length ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] leading-4 text-amber-900">
                Ada {revision.length} dokumen yang perlu diperbaiki. Buka halaman dokumen untuk
                melihat catatan pemeriksa dan mengunggah versi baru.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-line bg-surface px-4 py-3">
        <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-ink">Butuh bantuan?</p>
          <p className="mt-0.5 text-[10px] leading-5 text-muted">
            Sampaikan pertanyaan atau kendala melalui pengaduan. Jangan memberikan dokumen pribadi
            melalui chat pribadi tanpa kanal resmi.
          </p>
        </div>
        <Link
          to="/cpmi/bantuan"
          className="shrink-0 text-[10px] font-bold text-brand hover:underline"
        >
          Buat pengaduan
        </Link>
      </div>
    </div>
  )
}
