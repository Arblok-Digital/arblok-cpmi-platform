import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileText,
  FileWarning,
  LockKeyhole,
  SearchX,
  ShieldCheck,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { isP3miRole } from '@/lib/permissions'
import { logDocumentAccessService, reviewDocumentService } from '@/services/documents'
import { DOC_STATUS_META, DOC_TYPES } from '@/lib/constants'
import type { CandidateDocument, DocumentStatus } from '@/lib/types'
import { formatBytes, formatDateTime, formatRelative } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { SearchInput } from '@/components/shared/misc'
import { DocumentBadge } from '@/components/shared/status'
import { Badge } from '@/components/ui/badge'
import { Button, LinkButton } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Select, Textarea } from '@/components/ui/form'
import { EmptyState } from '@/components/ui/misc'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

type Queue = 'pending_review' | 'approved' | 'revision_required' | 'rejected' | 'all'
type Decision = Exclude<DocumentStatus, 'uploaded' | 'pending_review'>

const queueTabs: { id: Queue; label: string }[] = [
  { id: 'pending_review', label: 'Menunggu' },
  { id: 'approved', label: 'Disetujui' },
  { id: 'revision_required', label: 'Perlu revisi' },
  { id: 'rejected', label: 'Ditolak' },
  { id: 'all', label: 'Semua' },
]

function docTypeLabel(type: CandidateDocument['documentType']) {
  return DOC_TYPES.find((d) => d.id === type)?.label ?? type
}

export function P3miDocumentsPage() {
  const { state, account } = useSession()
  const toast = useToast()
  const [queue, setQueue] = useState<Queue>('pending_review')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [accessTarget, setAccessTarget] = useState<{
    doc: CandidateDocument
    action: 'view' | 'download'
  } | null>(null)
  const [accessReason, setAccessReason] = useState('')
  const [viewer, setViewer] = useState<CandidateDocument | null>(null)
  const [reviewTarget, setReviewTarget] = useState<CandidateDocument | null>(null)
  const [decision, setDecision] = useState<Decision>('approved')
  const [reviewReason, setReviewReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!account || !isP3miRole(account.role)) return null

  const docs = useMemo(
    () =>
      state.documents
        .filter((d) => d.orgId === account.orgId)
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
    [state.documents, account.orgId],
  )

  const counts = {
    pending: docs.filter((d) => d.status === 'pending_review').length,
    approved: docs.filter((d) => d.status === 'approved').length,
    revision: docs.filter((d) => d.status === 'revision_required').length,
    rejected: docs.filter((d) => d.status === 'rejected').length,
  }

  const filtered = docs.filter((doc) => {
    if (queue !== 'all' && doc.status !== queue) return false
    if (typeFilter !== 'all' && doc.documentType !== typeFilter) return false
    const candidate = state.candidates.find((c) => c.id === doc.candidateId)
    const haystack = `${candidate?.fullName ?? ''} ${candidate?.candidateCode ?? ''} ${docTypeLabel(
      doc.documentType,
    )} ${doc.fileName}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  const openAccess = (doc: CandidateDocument, action: 'view' | 'download') => {
    setAccessTarget({ doc, action })
    setAccessReason('')
    setError(null)
  }

  const submitAccess = async () => {
    if (!accessTarget) return
    setError(null)
    setBusy(true)
    const result = await logDocumentAccessService(accessTarget.doc.id, accessTarget.action, accessReason)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success(
      'Akses dokumen tercatat',
      'Alasan akses masuk ke audit dan log akses data.',
    )
    const target = accessTarget
    setAccessTarget(null)
    setAccessReason('')
    if (target.action === 'view') setViewer(target.doc)
  }

  const openReview = (doc: CandidateDocument) => {
    setReviewTarget(doc)
    setDecision('approved')
    setReviewReason('')
    setError(null)
  }

  const submitReview = async () => {
    if (!reviewTarget) return
    setError(null)
    if (decision !== 'approved' && reviewReason.trim().length < 5) {
      setError('Alasan minimal 5 karakter untuk permintaan revisi atau penolakan.')
      return
    }
    setBusy(true)
    const result = await reviewDocumentService(reviewTarget.id, decision, reviewReason)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success(
      decision === 'approved'
        ? 'Dokumen disetujui'
        : decision === 'revision_required'
          ? 'Permintaan revisi dikirim'
          : 'Dokumen ditolak',
      docTypeLabel(reviewTarget.documentType),
    )
    setReviewTarget(null)
    setReviewReason('')
  }

  const viewerCandidate = viewer
    ? state.candidates.find((c) => c.id === viewer.candidateId)
    : undefined
  const viewerHistory = viewer
    ? state.documentReviews
        .filter((r) => r.documentId === viewer.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : []

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Kepatuhan dokumen"
        title="Verifikasi dokumen"
        description="Antrean pemeriksaan dokumen CPMI. Setiap pratinjau atau unduhan wajib memiliki alasan dan tercatat pada log akses."
        meta={
          <>
            <Badge tone="info" icon={<LockKeyhole className="h-3 w-3" />}>
              Akses berbasis alasan
            </Badge>
            <Badge tone="warning" icon={<ShieldCheck className="h-3 w-3" />}>
              Demo: file tidak disimpan
            </Badge>
          </>
        }
        actions={
          account.role === 'p3mi_admin' ? (
            <LinkButton to="/p3mi/pengaturan" variant="secondary">
              Kebijakan dokumen
            </LinkButton>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Menunggu pemeriksaan"
          value={counts.pending}
          hint="Prioritas antrean hari ini"
          icon={<Clock3 className="h-5 w-5" />}
          tone={counts.pending ? 'warning' : 'success'}
        />
        <StatCard
          label="Disetujui"
          value={counts.approved}
          hint="Lolos pemeriksaan P3MI"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Perlu revisi"
          value={counts.revision}
          hint="Menunggu unggahan ulang CPMI"
          icon={<FileWarning className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label="Ditolak"
          value={counts.rejected}
          hint="Keputusan dengan alasan tercatat"
          icon={<FileText className="h-5 w-5" />}
          tone="slate"
        />
      </div>

      <Card className="mt-5">
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              tabs={queueTabs.map((tab) => ({
                ...tab,
                count:
                  tab.id === 'all'
                    ? docs.length
                    : docs.filter((d) => d.status === tab.id).length,
              }))}
              value={queue}
              onChange={setQueue}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari CPMI, kode, atau jenis dokumen…"
                className="sm:w-64"
                aria-label="Cari dokumen"
              />
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter jenis dokumen"
                className="sm:w-52"
              >
                <option value="all">Semua jenis</option>
                {DOC_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<SearchX className="h-5 w-5" />}
              title="Tidak ada dokumen pada filter ini"
              description="Coba ubah antrean, jenis dokumen, atau kata pencarian."
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-xl border border-line md:block">
                <table className="w-full min-w-[860px] border-collapse text-left text-xs">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-2.5">CPMI</th>
                      <th className="px-4 py-2.5">Dokumen</th>
                      <th className="px-4 py-2.5">Versi</th>
                      <th className="px-4 py-2.5">Diunggah</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((doc) => {
                      const candidate = state.candidates.find((c) => c.id === doc.candidateId)
                      return (
                        <tr key={doc.id} className="hover:bg-slate-50/70" data-testid={`doc-row-${doc.id}`}>
                          <td className="table-cell">
                            <Link
                              to={`/p3mi/kandidat/${doc.candidateId}`}
                              className="font-semibold text-ink hover:text-brand hover:underline"
                            >
                              {candidate?.fullName ?? 'Kandidat'}
                            </Link>
                            <p className="mt-0.5 text-[10px] text-muted">
                              {candidate?.candidateCode} · {candidate?.region}
                            </p>
                          </td>
                          <td className="table-cell">
                            <p className="font-semibold text-slate-700">
                              {docTypeLabel(doc.documentType)}
                            </p>
                            <p className="mt-0.5 max-w-[190px] truncate text-[10px] text-muted">
                              {doc.fileName} · {formatBytes(doc.sizeBytes)}
                            </p>
                          </td>
                          <td className="table-cell font-semibold text-slate-600">v{doc.version}</td>
                          <td className="table-cell text-[10px] text-muted">
                            {formatRelative(doc.uploadedAt)}
                          </td>
                          <td className="table-cell">
                            <DocumentBadge status={doc.status} />
                          </td>
                          <td className="table-cell">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={<Eye className="h-3.5 w-3.5" />}
                                onClick={() => openAccess(doc, 'view')}
                                data-testid={`doc-view-${doc.id}`}
                              >
                                Lihat
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => openReview(doc)} data-testid={`doc-decide-${doc.id}`}>
                                Putuskan
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="space-y-2.5 md:hidden">
                {filtered.map((doc) => {
                  const candidate = state.candidates.find((c) => c.id === doc.candidateId)
                  return (
                    <li key={doc.id} className="rounded-xl border border-line p-3.5" data-testid={`doc-row-${doc.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-ink">
                            {candidate?.fullName ?? 'Kandidat'}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted">
                            {docTypeLabel(doc.documentType)} · v{doc.version}
                          </p>
                        </div>
                        <DocumentBadge status={doc.status} />
                      </div>
                      <p className="mt-2 truncate text-[10px] text-muted">
                        {doc.fileName} · {formatBytes(doc.sizeBytes)} · {formatRelative(doc.uploadedAt)}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          icon={<Eye className="h-3.5 w-3.5" />}
                          onClick={() => openAccess(doc, 'view')}
                        >
                          Lihat
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => openReview(doc)}
                        >
                          Putuskan
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mt-4">
        <InfoNote tone="warning" title="Batas akses pada pilot">
          Reviewer hanya memeriksa dokumen yang diperlukan untuk pra-penempatan. Jangan mengunduh
          dokumen ke perangkat pribadi, membagikannya ke agen, atau menyimpannya di aplikasi pesan.
          Semua akses pada demo ini memakai berkas sintetis dan tidak menyimpan isi file.
        </InfoNote>
      </div>

      <Dialog
        open={Boolean(accessTarget)}
        onClose={() => setAccessTarget(null)}
        title={accessTarget?.action === 'download' ? 'Catat alasan unduhan' : 'Catat alasan akses'}
        description="Alasan disimpan pada audit trail dan log akses dokumen. Gunakan alasan operasional yang spesifik."
        data-testid="doc-access-dialog"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAccessTarget(null)} data-testid="doc-access-cancel">
              Batal
            </Button>
            <Button
              loading={busy}
              icon={<LockKeyhole className="h-4 w-4" />}
              onClick={submitAccess}
              data-testid="doc-access-confirm"
            >
              Lanjutkan akses
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {accessTarget ? (
            <div className="rounded-xl border border-line bg-slate-50 p-3.5">
              <p className="text-xs font-bold text-ink">
                {docTypeLabel(accessTarget.doc.documentType)} · v{accessTarget.doc.version}
              </p>
              <p className="mt-0.5 text-[10px] text-muted">
                {state.candidates.find((c) => c.id === accessTarget.doc.candidateId)?.fullName} ·{' '}
                {accessTarget.doc.fileName}
              </p>
            </div>
          ) : null}
          <Field
            label="Alasan akses"
            htmlFor="access-reason"
            required
            hint="Contoh: memeriksa keaslian KTP untuk verifikasi awal kandidat."
            error={error ?? undefined}
          >
            <Textarea
              id="access-reason"
              value={accessReason}
              onChange={(e) => setAccessReason(e.target.value)}
              placeholder="Tuliskan alasan operasional akses dokumen…"
              rows={3}
            />
          </Field>
          <InfoNote tone="info">
            Pada demo ini tidak ada file pribadi yang tersimpan. Pratinjau hanya menampilkan metadata
            sintetis agar alur audit dapat diuji.
          </InfoNote>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(viewer)}
        onClose={() => setViewer(null)}
        title="Pratinjau dokumen sintetis"
        description={viewer ? `${docTypeLabel(viewer.documentType)} · versi ${viewer.version}` : undefined}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewer(null)}>
              Tutup
            </Button>
            {viewer ? (
              <Button
                variant="secondary"
                icon={<Download className="h-4 w-4" />}
                onClick={() => {
                  const doc = viewer
                  setViewer(null)
                  openAccess(doc, 'download')
                }}
              >
                Catat unduhan
              </Button>
            ) : null}
          </>
        }
      >
        {viewer ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand shadow-sm">
                <FileCheck2 className="h-7 w-7" />
              </div>
              <p className="mt-3 text-sm font-bold text-ink">{viewer.fileName}</p>
              <p className="mt-1 text-[11px] text-muted">
                {formatBytes(viewer.sizeBytes)} · {viewer.mimeType}
              </p>
              <Badge tone="warning" className="mt-3">
                Berkas sintetis — tidak ada isi pribadi
              </Badge>
            </div>
            <dl className="divide-y divide-line rounded-xl border border-line px-3.5">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[11px] text-muted">Kandidat</dt>
                <dd className="text-[11px] font-semibold text-ink">
                  {viewerCandidate?.fullName ?? '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[11px] text-muted">Jenis dokumen</dt>
                <dd className="text-[11px] font-semibold text-ink">
                  {docTypeLabel(viewer.documentType)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[11px] text-muted">Diunggah</dt>
                <dd className="text-[11px] font-semibold text-ink">
                  {formatDateTime(viewer.uploadedAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[11px] text-muted">Status</dt>
                <dd>
                  <DocumentBadge status={viewer.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[11px] text-muted">Jalur penyimpanan</dt>
                <dd className="max-w-[60%] truncate text-[10px] font-medium text-slate-500">
                  {viewer.storagePath}
                </dd>
              </div>
            </dl>
            <div>
              <p className="mb-2 text-[11px] font-bold text-ink">Riwayat keputusan versi ini</p>
              {viewerHistory.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[11px] text-muted">
                  Belum ada keputusan untuk versi ini.
                </p>
              ) : (
                <ul className="space-y-2">
                  {viewerHistory.map((review) => (
                    <li key={review.id} className="rounded-xl border border-line px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-ink">
                          {DOC_STATUS_META[review.decision].label}
                        </span>
                        <span className="text-[10px] text-muted">
                          {formatRelative(review.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {review.reviewerName}
                        {review.reason ? ` · ${review.reason}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title="Keputusan pemeriksaan dokumen"
        description={
          reviewTarget
            ? `${docTypeLabel(reviewTarget.documentType)} · v${reviewTarget.version} · ${
                state.candidates.find((c) => c.id === reviewTarget.candidateId)?.fullName ?? ''
              }`
            : undefined
        }
        data-testid="doc-review-dialog"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewTarget(null)} data-testid="doc-review-cancel">
              Batal
            </Button>
            <Button
              loading={busy}
              variant={decision === 'rejected' ? 'danger' : decision === 'approved' ? 'success' : 'primary'}
              onClick={submitReview}
              data-testid="doc-review-confirm"
            >
              Simpan keputusan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                { id: 'approved', label: 'Setujui', description: 'Dokumen sesuai.' },
                { id: 'revision_required', label: 'Minta revisi', description: 'Perlu unggah ulang.' },
                { id: 'rejected', label: 'Tolak', description: 'Tidak dapat diterima.' },
              ] as { id: Decision; label: string; description: string }[]
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setDecision(option.id)}
                className={cn(
                  'focus-ring rounded-xl border p-3 text-left transition-colors',
                  decision === option.id
                    ? 'border-brand/30 bg-brand-soft'
                    : 'border-line bg-surface hover:border-slate-300',
                )}
              >
                <p className="text-xs font-bold text-ink">{option.label}</p>
                <p className="mt-0.5 text-[10px] leading-4 text-muted">{option.description}</p>
              </button>
            ))}
          </div>
          {decision !== 'approved' ? (
            <Field
              label="Alasan / catatan pemeriksa"
              htmlFor="review-reason"
              required
              hint="Catatan ini dikirim ke CPMI dan agen sumber."
              error={error ?? undefined}
            >
              <Textarea
                id="review-reason"
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                placeholder="Contoh: foto KTP buram, mohon unggah ulang dengan pencahayaan cukup."
                rows={3}
              />
            </Field>
          ) : (
            <InfoNote tone="success" title="Persetujuan akan mencatat reviewer dan waktu">
              Pastikan dokumen sudah diperiksa. Keputusan tidak menghapus versi sebelumnya.
            </InfoNote>
          )}
          {decision !== 'approved' && error ? null : (
            <p className="text-[10px] leading-4 text-muted">
              Keputusan dicatat pada audit trail, riwayat versi, dan notifikasi CPMI/agen.
            </p>
          )}
        </div>
      </Dialog>
    </div>
  )
}
