import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  LockKeyhole,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { isP3miRole } from '@/lib/permissions'
import { respondReferral } from '@/lib/store'
import { formatDate, formatDateTime, formatRelative, normalizePhone } from '@/lib/format'
import { STATUS_META } from '@/lib/constants'
import { PageHeader, DataRow, InfoNote } from '@/components/shared/page'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button, LinkButton } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Textarea, Checkbox } from '@/components/ui/form'
import { Timeline } from '@/components/shared/timeline'
import { ConsentBadge, ReferralBadge } from '@/components/shared/status'
import { EmptyState } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'

type Decision = 'accept' | 'reject' | 'dispute'

export function P3miReferralDetailPage() {
  const { id } = useParams()
  const { state, account } = useSession()
  const toast = useToast()
  const [decision, setDecision] = useState<Decision | null>(null)
  const [reason, setReason] = useState('')
  const [ackDuplicate, setAckDuplicate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!account || !isP3miRole(account.role)) return null
  const referral = state.referrals.find((r) => r.id === id && r.orgId === account.orgId)
  const candidate = referral ? state.candidates.find((c) => c.id === referral.candidateId) : undefined
  const agent = referral ? state.agents.find((a) => a.id === referral.agentId) : undefined
  const vacancy = referral ? state.vacancies.find((v) => v.id === referral.vacancyId) : undefined
  const consents = referral
    ? state.consents.filter((c) => c.candidateId === referral.candidateId)
    : []
  const sharingConsent = consents.find((c) => c.consentType === 'data_sharing')
  const processingConsent = consents.find((c) => c.consentType === 'data_processing')
  const duplicate = referral?.duplicateOfId
    ? state.candidates.find((c) => c.id === referral.duplicateOfId)
    : undefined
  const duplicateReferral = duplicate
    ? state.referrals.find((r) => r.candidateId === duplicate.id)
    : undefined
  const events = referral
    ? state.referralEvents
        .filter((e) => e.referralId === referral.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : []
  const candidateDocs = referral
    ? state.documents
        .filter((d) => d.candidateId === referral.candidateId)
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    : []

  if (!referral || !candidate) {
    return (
      <div className="page-pad">
        <PageHeader backTo="/p3mi/referral" backLabel="Referral masuk" title="Referral tidak ditemukan" />
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="Data tidak tersedia"
          description="Referral mungkin berada di tenant lain atau sudah tidak dapat diakses."
          action={<LinkButton to="/p3mi/referral" variant="secondary">Kembali</LinkButton>}
        />
      </div>
    )
  }

  const closeDialog = () => {
    if (busy) return
    setDecision(null)
    setReason('')
    setAckDuplicate(false)
    setError(null)
  }

  const submitDecision = () => {
    if (!decision) return
    if (decision !== 'accept' && reason.trim().length < 5) {
      setError('Alasan minimal 5 karakter agar keputusan dapat diaudit.')
      return
    }
    if (decision === 'accept' && referral.duplicateWarning && !ackDuplicate) {
      setError('Centang konfirmasi bahwa peringatan duplikat sudah ditinjau.')
      return
    }
    setBusy(true)
    const result = respondReferral(
      referral.id,
      decision === 'accept' ? 'accepted' : decision === 'reject' ? 'rejected' : 'disputed',
      decision === 'accept' ? undefined : reason,
    )
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success(
      decision === 'accept' ? 'Referral diterima' : decision === 'reject' ? 'Referral ditolak' : 'Dispute dicatat',
      decision === 'accept'
        ? 'Sumber referral dikunci dan agen telah dinotifikasi.'
        : 'Keputusan beserta alasan tersimpan pada jejak audit.',
    )
    closeDialog()
  }

  const title =
    decision === 'accept' ? 'Terima referral?' : decision === 'reject' ? 'Tolak referral?' : 'Ajukan dispute?'
  const description =
    decision === 'accept'
      ? 'Sumber referral akan dikunci secara operasional dan status kandidat menjadi Referral Acknowledged.'
      : decision === 'reject'
        ? 'Penolakan wajib memiliki alasan. Agen dapat melihat alasan dan riwayat keputusan.'
        : 'Dispute menandai referral untuk telaah lanjutan. Tuliskan dasar dan bukti yang perlu diperiksa.'
  const dialogTone = decision === 'reject' ? 'danger' : 'default'

  return (
    <div className="page-pad">
      <PageHeader
        backTo="/p3mi/referral"
        backLabel="Referral masuk"
        eyebrow={`${referral.code} · masuk ${formatRelative(referral.submittedAt)}`}
        title={candidate.fullName}
        description={`${candidate.candidateCode} · ${candidate.region} · agen sumber ${agent?.name ?? '—'}`}
        meta={
          <>
            <ReferralBadge status={referral.status} />
            <ConsentBadge revoked={Boolean(sharingConsent?.revokedAt)} missing={!sharingConsent} />
            {referral.duplicateWarning ? (
              <Badge tone="danger" icon={<AlertTriangle className="h-3 w-3" />}>
                Peringatan duplikat
              </Badge>
            ) : null}
          </>
        }
        actions={
          <LinkButton
            to={`/p3mi/kandidat/${candidate.id}`}
            variant="secondary"
            icon={<ArrowRight className="h-4 w-4" />}
          >
            Buka kandidat
          </LinkButton>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Ringkasan kandidat"
              description="Data minimal yang dikirim agen pada tahap referral."
              icon={<UserRound className="h-4 w-4" />}
            />
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
                <DataRow label="Agen sumber" value={agent?.name ?? '—'} />
                <DataRow label="Kode agen" value={agent?.code ?? '—'} />
                <DataRow label="Tanggal lahir" value={candidate.birthDate ? formatDate(candidate.birthDate) : '—'} />
                <DataRow label="Status awal" value={STATUS_META[candidate.status].label} />
              </div>
              {candidate.address ? (
                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[10px] leading-5 text-slate-600 sm:col-span-2">
                  <span className="font-semibold text-slate-700">Alamat singkat: </span>
                  {candidate.address}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {referral.duplicateWarning && duplicate ? (
            <Card className="border-red-200">
              <CardHeader
                title="Kemungkinan duplikat"
                description="Nomor telepon cocok dengan kandidat lain pada tenant yang sama."
                icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
                action={<Badge tone="danger">Tinjau manual</Badge>}
              />
              <CardContent className="pt-1">
                <div className="rounded-xl border border-red-100 bg-red-50/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-ink">{duplicate.fullName}</p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {duplicate.candidateCode} · {duplicate.region} · agen{' '}
                        {state.agents.find((a) => a.id === duplicate.agentId)?.name ?? '—'}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-slate-600">
                        {normalizePhone(candidate.phone)} = {normalizePhone(duplicate.phone)}
                      </p>
                    </div>
                    <Link
                      to={`/p3mi/kandidat/${duplicate.id}`}
                      className="text-[10px] font-bold text-brand hover:underline"
                    >
                      Bandingkan kandidat →
                    </Link>
                  </div>
                  {duplicateReferral ? (
                    <p className="mt-2 text-[9px] leading-4 text-red-800/80">
                      Kandidat pembanding memiliki referral {duplicateReferral.code} berstatus{' '}
                      {duplicateReferral.status}. Sistem tidak menghapus klaim secara otomatis;
                      keputusan mengikuti prosedur dispute pada perjanjian.
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Persetujuan CPMI"
              description="Consent pemrosesan dan pembagian data harus terpisah dan dapat diaudit."
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <CardContent className="space-y-2 pt-1">
              {[
                { label: 'Pemrosesan data', consent: processingConsent },
                { label: 'Pembagian data kepada P3MI', consent: sharingConsent },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex flex-col gap-2 rounded-xl border border-line p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-[11px] font-bold text-ink">{row.label}</p>
                    <p className="mt-0.5 text-[10px] text-muted">
                      {row.consent
                        ? `Versi ${row.consent.noticeVersion} · ${formatDate(row.consent.consentedAt)} · penerima: ${row.consent.recipient}`
                        : 'Belum ada catatan persetujuan.'}
                    </p>
                    {row.consent?.evidence ? (
                      <p className="mt-1 line-clamp-2 text-[9px] text-slate-500">{row.consent.evidence}</p>
                    ) : null}
                  </div>
                  <ConsentBadge revoked={Boolean(row.consent?.revokedAt)} missing={!row.consent} />
                </div>
              ))}
              {!sharingConsent ? (
                <InfoNote tone="warning">
                  Jangan memproses data lebih lanjut sampai persetujuan pembagian data dicatat.
                </InfoNote>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Jejak referral"
              description="Append-only: event lama tidak ditimpa."
              icon={<FileText className="h-4 w-4" />}
            />
            <CardContent className="pt-3">
              <Timeline
                items={events.map((event) => ({
                  id: event.id,
                  title:
                    event.type === 'submitted'
                      ? 'Referral dikirim'
                      : event.type === 'accepted'
                        ? 'Referral diterima'
                        : event.type === 'rejected'
                          ? 'Referral ditolak'
                          : event.type === 'duplicate_warning'
                            ? 'Peringatan duplikat dibuat'
                            : event.type === 'source_locked'
                              ? 'Sumber referral dikunci'
                              : event.type,
                  description: event.reason,
                  timestamp: formatDateTime(event.createdAt),
                  actor: event.actorName,
                  tone:
                    event.type === 'rejected' || event.type === 'duplicate_warning'
                      ? 'danger'
                      : event.type === 'accepted'
                        ? 'success'
                        : 'brand',
                }))}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="lg:sticky lg:top-20">
            <CardHeader title="Keputusan P3MI" description="Aksi sensitif meminta konfirmasi." />
            <CardContent className="pt-1">
              {referral.status === 'submitted' ? (
                <>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[10px] font-bold text-amber-900">Menunggu keputusan</p>
                    <p className="mt-1 text-[9px] leading-4 text-amber-800">
                      Tinjau consent dan duplikat sebelum menerima. Penerimaan mengunci sumber
                      referral secara operasional.
                    </p>
                  </div>
                  <div className="mt-3 space-y-2">
                    <Button
                      className="w-full"
                      variant="success"
                      icon={<CheckCircle2 className="h-4 w-4" />}
                      onClick={() => setDecision('accept')}
                      data-testid="referral-accept-btn"
                    >
                      Terima referral
                    </Button>
                    <Button
                      className="w-full"
                      variant="secondary"
                      icon={<XCircle className="h-4 w-4" />}
                      onClick={() => setDecision('reject')}
                      data-testid="referral-reject-btn"
                    >
                      Tolak dengan alasan
                    </Button>
                    <Button
                      className="w-full"
                      variant="ghost"
                      icon={<AlertTriangle className="h-4 w-4" />}
                      onClick={() => setDecision('dispute')}
                      data-testid="referral-dispute-btn"
                    >
                      Ajukan dispute
                    </Button>
                  </div>
                </>
              ) : referral.status === 'accepted' ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800">
                      <LockKeyhole className="h-3.5 w-3.5" /> Sumber terkunci
                    </p>
                    <p className="mt-1 text-[9px] leading-4 text-emerald-900/70">
                      Diterima {formatDateTime(referral.acceptedAt)}. Perubahan sumber hanya melalui
                      dispute resolution dengan alasan dan bukti.
                    </p>
                  </div>
                  <InfoNote tone="info" title="Langkah berikutnya">
                    Jadwalkan kunjungan atau konfirmasi jadwal dari agen. Setelah kandidat hadir,
                    P3MI mengambil alih pemeriksaan.
                  </InfoNote>
                  <Button
                    className="w-full"
                    variant="secondary"
                    icon={<ArrowRight className="h-4 w-4" />}
                    onClick={() => {
                      window.location.href = `/p3mi/kandidat/${candidate.id}`
                    }}
                  >
                    Kelola kandidat
                  </Button>
                </div>
              ) : referral.status === 'rejected' ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-[10px] font-bold text-red-800">Referral ditolak</p>
                  <p className="mt-1 text-[10px] leading-4 text-red-800/80">{referral.rejectionReason}</p>
                  <p className="mt-2 text-[9px] text-red-700/60">
                    Dicatat {formatDateTime(referral.decidedAt)}
                  </p>
                </div>
              ) : (
                <InfoNote tone="warning" title="Dispute berjalan">
                  Referral ditandai dispute. Selesaikan sesuai prosedur perjanjian; jangan mengubah
                  data sumber secara diam-diam.
                </InfoNote>
              )}

              <div className="mt-4 space-y-1 border-t border-line pt-3">
                <DataRow label="Kode referral" value={<span className="font-mono">{referral.code}</span>} />
                <DataRow label="Dikirim" value={formatDateTime(referral.submittedAt)} />
                <DataRow
                  label="Dokumen awal"
                  value={`${candidateDocs.length} file`}
                />
                <DataRow
                  label="Kontak P3MI"
                  value={state.organizations.find((o) => o.id === account.orgId)?.contactEmail ?? '—'}
                />
              </div>
            </CardContent>
          </Card>

          {vacancy ? (
            <Card>
              <CardHeader
                title="Lowongan terkait"
                description={`${vacancy.country} · ${vacancy.sector}`}
                icon={<BriefcaseBusiness className="h-4 w-4" />}
              />
              <CardContent className="pt-1">
                <p className="text-xs font-bold text-ink">{vacancy.title}</p>
                <ul className="mt-2 space-y-1">
                  {vacancy.requirements.map((r) => (
                    <li key={r} className="flex items-start gap-1.5 text-[10px] leading-4 text-muted">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                      {r}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[9px] text-slate-500">
                  Referensi lowongan diverifikasi P3MI. Bukan jaminan penempatan.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <div className="rounded-xl border border-line bg-surface p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-ink">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Kewenangan
            </p>
            <p className="mt-1 text-[9px] leading-4 text-muted">
              Role aplikasi tidak menciptakan kewenangan hukum. Validasi keabsahan dokumen dan
              proses penempatan tetap milik P3MI sesuai ketentuan yang berlaku.
            </p>
          </div>
        </div>
      </div>

      <Dialog
        open={decision !== null}
        onClose={closeDialog}
        title={title}
        description={description}
        tone={dialogTone}
        data-testid="referral-decision-dialog"
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog} disabled={busy} data-testid="referral-dialog-cancel">
              Batal
            </Button>
            <Button
              variant={decision === 'accept' ? 'success' : decision === 'reject' ? 'danger' : 'primary'}
              onClick={submitDecision}
              loading={busy}
              data-testid="referral-dialog-confirm"
            >
              {decision === 'accept' ? 'Ya, terima referral' : decision === 'reject' ? 'Tolak referral' : 'Catat dispute'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {decision === 'accept' && referral.duplicateWarning ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-red-800">
                <AlertTriangle className="h-3.5 w-3.5" /> Peringatan duplikat belum diselesaikan
              </p>
              <p className="mt-1 text-[10px] leading-4 text-red-800/80">
                Nomor telepon kandidat cocok dengan {duplicate?.fullName}. Pastikan Anda sudah
                meninjau prosedur atribusi sebelum menerima klaim.
              </p>
              <div className="mt-2">
                <Checkbox
                  id="ack-duplicate"
                  checked={ackDuplicate}
                  onChange={setAckDuplicate}
                  label="Saya sudah meninjau peringatan duplikat"
                  description="Keputusan tetap tercatat dalam audit event."
                />
              </div>
            </div>
          ) : null}

          {decision !== 'accept' ? (
            <div>
              <label htmlFor="decision-reason" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Alasan <span className="text-red-600">*</span>
              </label>
              <Textarea
                id="decision-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tuliskan alasan operasional yang jelas dan dapat diaudit…"
                autoFocus
              />
              <p className="mt-1.5 text-[10px] text-muted">
                Alasan akan terlihat oleh agen sumber dan tersimpan pada referral event.
              </p>
            </div>
          ) : (
            <InfoNote tone="info">
              Status kandidat akan menjadi {STATUS_META.referral_acknowledged.label}. Notifikasi
              dikirim ke agen sumber dan CPMI (bila memiliki akun).
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
