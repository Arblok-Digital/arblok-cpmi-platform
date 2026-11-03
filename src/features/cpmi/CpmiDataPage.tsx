import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  LockKeyhole,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { revokeConsent, updateCandidateProfile } from '@/lib/store'
import { EDUCATION_OPTIONS, REGION_OPTIONS } from '@/lib/constants'
import { formatDate, formatDateTime, normalizePhone } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { ConsentBadge } from '@/components/shared/status'
import { Badge } from '@/components/ui/badge'
import { Button, LinkButton } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { EmptyState } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'

export function CpmiDataPage() {
  const { state, account } = useSession()
  const toast = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    phone: '',
    address: '',
    education: '',
    region: '',
  })

  if (!account) return null
  const candidate = state.candidates.find((c) => c.accountId === account.id)
  if (!candidate) {
    return (
      <div className="page-pad">
        <PageHeader title="Data saya" description="Akun belum terhubung dengan data CPMI." />
        <EmptyState
          icon={<UserRound className="h-5 w-5" />}
          title="Data belum tersedia"
          description="Hubungi P3MI untuk menautkan akun dengan data kandidat."
        />
      </div>
    )
  }

  const consents = state.consents.filter((c) => c.candidateId === candidate.id)
  const processing = consents.find((c) => c.consentType === 'data_processing')
  const sharing = consents.find((c) => c.consentType === 'data_sharing')
  const active = consents.some((c) => !c.revokedAt)

  const saveProfile = () => {
    setError(null)
    const phone = normalizePhone(form.phone)
    if (phone.length < 10 || phone.length > 15) {
      setError('Nomor telepon tidak valid. Gunakan format 08xx atau 62xx.')
      return
    }
    if (!form.region.trim()) {
      setError('Wilayah wajib diisi.')
      return
    }
    setBusy(true)
    const result = updateCandidateProfile(candidate.id, {
      phone: form.phone.trim(),
      address: form.address.trim(),
      education: form.education || undefined,
      region: form.region,
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success('Data diperbarui', 'Perubahan tercatat pada audit kandidat.')
    setEditOpen(false)
  }

  const submitRevoke = () => {
    setError(null)
    if (reason.trim().length < 10) {
      setError('Alasan minimal 10 karakter agar dapat ditelaah.')
      return
    }
    setBusy(true)
    const result = revokeConsent(candidate.id, reason)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success('Persetujuan ditarik', 'Proses dijeda untuk telaah P3MI.')
    setRevokeOpen(false)
    setReason('')
  }

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow={candidate.candidateCode}
        title="Data saya"
        description="Periksa dan perbarui data kontak. Perubahan penting tercatat pada audit. Data sensitif tidak ditampilkan penuh di halaman ini."
        meta={
          <>
            <Badge tone={active ? 'success' : 'danger'} icon={<LockKeyhole className="h-3 w-3" />}>
              {active ? 'Persetujuan aktif' : 'Persetujuan ditarik'}
            </Badge>
            <Badge tone="muted">{candidate.region}</Badge>
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              icon={<ShieldCheck className="h-4 w-4" />}
              onClick={() => {
                setReason('')
                setError(null)
                setRevokeOpen(true)
              }}
              disabled={!active}
            >
              Tarik persetujuan
            </Button>
            <Button variant="accent" icon={<Save className="h-4 w-4" />} onClick={() => {
              setForm({
                phone: candidate.phone,
                address: candidate.address ?? '',
                education: candidate.education ?? '',
                region: candidate.region,
              })
              setError(null)
              setEditOpen(true)
            }}>
              Perbarui data
            </Button>
          </>
        }
      />

      {!active ? (
        <div className="mb-4">
          <InfoNote tone="warning" title="Persetujuan pemrosesan data tidak aktif">
            Proses kandidat dijeda. Hubungi P3MI untuk meninjau kembali persetujuan. Anda tetap dapat
            melihat status dan riwayat, tetapi tidak dapat mengunggah dokumen baru.
          </InfoNote>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Identitas kandidat"
              description="Data inti dikelola P3MI; kontak dapat Anda perbarui."
              icon={<UserRound className="h-4 w-4" />}
            />
            <CardContent className="space-y-2.5 text-[11px]">
              {[
                ['Nama lengkap', candidate.fullName],
                ['Nama panggilan', candidate.nickname],
                ['Kode kandidat', candidate.candidateCode],
                ['Jenis kelamin', candidate.gender === 'P' ? 'Perempuan' : candidate.gender === 'L' ? 'Laki-laki' : '—'],
                ['Tanggal lahir', candidate.birthDate ? formatDate(candidate.birthDate) : '—'],
                ['Pendidikan', candidate.education ?? '—'],
                ['Wilayah', candidate.region],
                ['Telepon', candidate.phone],
                ['Alamat', candidate.address ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 border-b border-line pb-2 last:border-0 last:pb-0">
                  <span className="text-muted">{label}</span>
                  <span className="max-w-[65%] text-right font-semibold text-ink">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Persetujuan data"
              description="Persetujuan pemrosesan dan pembagian data dicatat terpisah."
              icon={<LockKeyhole className="h-4 w-4" />}
            />
            <CardContent className="space-y-3">
              {[processing, sharing].map((consent, index) => (
                <div key={index} className="rounded-xl border border-line p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-bold text-ink">
                      {index === 0 ? 'Pemrosesan data' : 'Pembagian data kepada P3MI'}
                    </p>
                    <ConsentBadge
                      revoked={Boolean(consent?.revokedAt)}
                      missing={!consent}
                    />
                  </div>
                  {consent ? (
                    <div className="mt-1.5 space-y-1 text-[10px] leading-4 text-muted">
                      <p>Tujuan: {consent.purpose}</p>
                      <p>Penerima: {consent.recipient}</p>
                      <p>
                        Dicatat {formatDateTime(consent.consentedAt)} · versi notice{' '}
                        {consent.noticeVersion}
                      </p>
                      {consent.revokedAt ? (
                        <p className="font-semibold text-red-700">
                          Ditarik {formatDateTime(consent.revokedAt)}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[10px] text-muted">
                      Belum ada catatan persetujuan. Hubungi P3MI.
                    </p>
                  )}
                </div>
              ))}
              <InfoNote tone="info">
                Persetujuan dapat ditarik kapan saja. Penarikan menjeda proses dan tidak menghapus
                catatan audit yang sudah ada.
              </InfoNote>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Ringkasan proses" icon={<CheckCircle2 className="h-4 w-4" />} />
            <CardContent className="space-y-2 text-[10px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted">Status saat ini</span>
                <LinkButton to="/cpmi/perkembangan" size="sm" variant="ghost">
                  Lihat progres
                </LinkButton>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted">Wilayah</span>
                <span className="inline-flex items-center gap-1 font-semibold text-ink">
                  <MapPin className="h-3 w-3" /> {candidate.region}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted">Kontak</span>
                <span className="inline-flex items-center gap-1 font-semibold text-ink">
                  <Phone className="h-3 w-3" /> {candidate.phone}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted">Terakhir aktif</span>
                <span className="font-semibold text-ink">{formatDate(candidate.lastActivityAt)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Dokumen" icon={<FileText className="h-4 w-4" />} />
            <CardContent className="space-y-2">
              <p className="text-[10px] leading-4 text-muted">
                Unggah dan pantau dokumen pra-penempatan. Berkas tidak disimpan pada demo.
              </p>
              <LinkButton to="/cpmi/dokumen" variant="secondary" className="w-full" icon={<FileText className="h-4 w-4" />}>
                Buka dokumen saya
              </LinkButton>
            </CardContent>
          </Card>

          <InfoNote tone="warning" title="Perlindungan data">
            Jangan membagikan kode OTP, nomor rekening, atau dokumen pribadi melalui pesan pribadi.
            Gunakan kanal resmi P3MI dan laporkan permintaan mencurigakan.
          </InfoNote>
        </div>
      </div>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Perbarui data kontak"
        description="Perubahan tercatat pada audit kandidat. Data inti seperti nama dan tanggal lahir hanya dapat diubah P3MI."
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Batal
            </Button>
            <Button loading={busy} icon={<Save className="h-4 w-4" />} onClick={saveProfile}>
              Simpan perubahan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nomor telepon" htmlFor="cpmi-phone" required hint="Format 08xx atau 62xx.">
            <Input
              id="cpmi-phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              inputMode="tel"
            />
          </Field>
          <Field label="Wilayah" htmlFor="cpmi-region" required>
            <Select
              id="cpmi-region"
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
            >
              {REGION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pendidikan terakhir" htmlFor="cpmi-education">
            <Select
              id="cpmi-education"
              value={form.education}
              onChange={(e) => setForm((f) => ({ ...f, education: e.target.value }))}
            >
              <option value="">Belum diisi</option>
              {EDUCATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Alamat" htmlFor="cpmi-address" hint="Alamat domisili saat ini.">
            <Textarea
              id="cpmi-address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              rows={3}
            />
          </Field>
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        title="Tarik persetujuan data?"
        description="Proses kandidat akan dijeda sampai P3MI menelaah. Tindakan ini tercatat pada audit."
        tone="danger"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRevokeOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" loading={busy} onClick={submitRevoke}>
              Tarik persetujuan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            <p className="text-[10px] leading-4 text-red-900">
              Penarikan persetujuan tidak menghapus data secara otomatis. Ajukan permintaan
              penghapusan sesuai kebijakan P3MI dan UU PDP.
            </p>
          </div>
          <Field
            label="Alasan penarikan"
            htmlFor="revoke-reason"
            required
            hint="Minimal 10 karakter."
            error={error ?? undefined}
          >
            <Textarea
              id="revoke-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Jelaskan alasan Anda…"
            />
          </Field>
        </div>
      </Dialog>
    </div>
  )
}
