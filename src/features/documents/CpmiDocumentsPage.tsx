import { useMemo } from 'react'
import {
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  FileWarning,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { latestDocument } from '@/lib/store'
import { DOC_TYPES } from '@/lib/constants'
import type { CandidateDocument, DocumentStatus } from '@/lib/types'
import { formatBytes, formatDateTime, formatRelative, percent } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { DocumentBadge } from '@/components/shared/status'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { EmptyState, Progress } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { FileUploader } from '@/components/shared/file-uploader'
import { uploadDocumentService } from '@/services/documents'

export function CpmiDocumentsPage() {
  const { state, account } = useSession()
  const toast = useToast()

  if (!account) return null
  const candidate = state.candidates.find((c) => c.accountId === account.id)
  if (!candidate) {
    return (
      <div className="page-pad">
        <PageHeader title="Dokumen saya" description="Akun ini belum terhubung ke data CPMI." />
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="Data CPMI belum tersedia"
          description="Hubungi P3MI untuk menautkan akun Anda dengan data kandidat."
        />
      </div>
    )
  }

  const documents = useMemo(
    () =>
      state.documents
        .filter((d) => d.candidateId === candidate.id)
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
    [state.documents, candidate.id],
  )

  const consents = state.consents.filter((c) => c.candidateId === candidate.id)
  const activeConsent = consents.some((c) => !c.revokedAt)
  const required = DOC_TYPES.filter((t) => t.required)
  const approvedRequired = required.filter(
    (t) => latestDocument(state, candidate.id, t.id)?.status === 'approved',
  ).length
  const pending = documents.filter((d) => d.status === 'pending_review').length
  const revision = documents.filter((d) => d.status === 'revision_required').length
  const latestByType = DOC_TYPES.map((type) => ({
    type,
    doc: latestDocument(state, candidate.id, type.id),
  }))

  const latestReview = (doc?: CandidateDocument) => {
    if (!doc) return undefined
    return state.documentReviews
      .filter((r) => r.documentId === doc.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  }

  const handleUpload = async (
    file: File,
  ): Promise<{ ok: true; data: { documentId: string } } | { ok: false; error: string }> => {
    if (!activeConsent) {
      return { ok: false, error: 'Persetujuan pemrosesan data belum aktif.' }
    }
    const result = await uploadDocumentService(candidate.id, 'ktp', {
      name: file.name,
      size: file.size,
      type: file.type,
    })
    if (result.ok) {
      toast.success(
        'Dokumen dikirim',
        'Berkas hanya disimulasikan pada demo. P3MI akan memeriksa metadata versi ini.',
      )
    }
    return result
  }

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow={candidate.candidateCode}
        title="Dokumen saya"
        description="Unggah dokumen pra-penempatan. Setiap unggahan membuat versi baru; versi lama tetap tersimpan untuk audit."
        meta={
          <>
            <Badge tone="warning" icon={<ShieldCheck className="h-3 w-3" />}>
              Demo: berkas tidak disimpan
            </Badge>
            {activeConsent ? (
              <Badge tone="success" icon={<LockKeyhole className="h-3 w-3" />}>
                Persetujuan aktif
              </Badge>
            ) : (
              <Badge tone="danger" icon={<LockKeyhole className="h-3 w-3" />}>
                Persetujuan tidak aktif
              </Badge>
            )}
          </>
        }
      />

      {!activeConsent ? (
        <div className="mb-4">
          <InfoNote tone="warning" title="Persetujuan pemrosesan data tidak aktif">
            Anda tidak dapat mengunggah dokumen baru. Buka menu Data Saya untuk memulihkan
            persetujuan atau hubungi P3MI. Penarikan persetujuan menjeda proses kandidat.
          </InfoNote>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Dokumen wajib"
          value={`${approvedRequired}/${required.length}`}
          hint="Disetujui P3MI"
          icon={<FileCheck2 className="h-5 w-5" />}
          tone="brand"
          progress={percent(approvedRequired, required.length)}
        />
        <StatCard
          label="Menunggu pemeriksaan"
          value={pending}
          hint="Tidak perlu unggah ulang"
          icon={<Clock3 className="h-5 w-5" />}
          tone={pending ? 'warning' : 'success'}
        />
        <StatCard
          label="Perlu revisi"
          value={revision}
          hint="Baca catatan pemeriksa"
          icon={<FileWarning className="h-5 w-5" />}
          tone={revision ? 'danger' : 'success'}
        />
        <StatCard
          label="Total versi"
          value={documents.length}
          hint="Riwayat tidak dihapus"
          icon={<FileText className="h-5 w-5" />}
          tone="slate"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {latestByType.map(({ type, doc }) => {
            const review = latestReview(doc)
            const needsAction =
              !doc || doc.status === 'revision_required' || doc.status === 'rejected'
            return (
              <Card key={type.id}>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        doc?.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : needsAction
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-brand-soft text-brand',
                      )}
                    >
                      {doc?.status === 'approved' ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : needsAction ? (
                        <FileWarning className="h-5 w-5" />
                      ) : (
                        <FileText className="h-5 w-5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold text-ink">{type.label}</p>
                        {type.required ? (
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                            Wajib
                          </span>
                        ) : null}
                        {doc ? <DocumentBadge status={doc.status} /> : null}
                      </div>
                      {doc ? (
                        <p className="mt-1 text-[10px] text-muted">
                          v{doc.version} · {doc.fileName} · {formatBytes(doc.sizeBytes)} ·{' '}
                          {formatRelative(doc.uploadedAt)}
                        </p>
                      ) : (
                        <p className="mt-1 text-[10px] text-muted">
                          Belum diunggah. {type.hint}.
                        </p>
                      )}
                      {review?.reason ? (
                        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] leading-4 text-amber-900">
                          Catatan pemeriksa: {review.reason}
                        </p>
                      ) : null}
                      {doc && doc.status === 'pending_review' ? (
                        <p className="mt-1.5 text-[10px] text-sky-700">
                          Sedang diperiksa P3MI. Anda masih dapat mengunggah versi baru bila perlu.
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <FileUploader
                    documentType={type.id}
                    onUpload={handleUpload}
                    existingDocument={doc ?? null}
                    disabled={!activeConsent}
                    className="w-full"
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Kelengkapan dokumen"
              description="Hanya dokumen wajib yang dihitung."
              icon={<FileCheck2 className="h-4 w-4" />}
            />
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <p className="text-2xl font-extrabold text-ink">
                  {approvedRequired}
                  <span className="text-sm font-semibold text-muted">/{required.length}</span>
                </p>
                <span className="text-[10px] font-bold text-brand">
                  {percent(approvedRequired, required.length)}%
                </span>
              </div>
              <Progress value={percent(approvedRequired, required.length)} />
              <ul className="space-y-2">
                {required.map((type) => {
                  const doc = latestDocument(state, candidate.id, type.id)
                  return (
                    <li key={type.id} className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-600">{type.label}</span>
                      {doc ? (
                        <DocumentBadge status={doc.status} />
                      ) : (
                        <span className="text-[9px] font-semibold text-slate-400">Belum ada</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Riwayat unggahan"
              description="Semua versi tetap tersimpan."
              icon={<Clock3 className="h-4 w-4" />}
            />
            <CardContent className="space-y-2">
              {documents.length === 0 ? (
                <p className="py-5 text-center text-[11px] text-muted">Belum ada unggahan.</p>
              ) : (
                documents.slice(0, 8).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-line px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-semibold text-slate-700">
                        {DOC_TYPES.find((t) => t.id === doc.documentType)?.label} · v{doc.version}
                      </p>
                      <p className="mt-0.5 text-[9px] text-muted">{formatDateTime(doc.uploadedAt)}</p>
                    </div>
                    <DocumentBadge status={doc.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <InfoNote tone="info" title="Privasi berkas">
            Jangan mengunggah dokumen milik orang lain. Pada demo ini file tidak dikirim ke server;
            hanya metadata yang dicatat untuk menguji alur persetujuan, versi, dan audit.
          </InfoNote>
        </div>
      </div>
    </div>
  )
}

export const CPMI_DOC_STATUS_ORDER: DocumentStatus[] = [
  'pending_review',
  'revision_required',
  'approved',
  'rejected',
]
