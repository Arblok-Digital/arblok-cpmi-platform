import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock3,
  LifeBuoy,
  MessageSquarePlus,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { visibleCandidates, visibleComplaints } from '@/lib/permissions'
import { createComplaint } from '@/lib/store'
import { COMPLAINT_CATEGORY } from '@/lib/constants'
import type { Complaint } from '@/lib/types'
import { formatDateTime, formatRelative } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { ComplaintBadge } from '@/components/shared/status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Select, Textarea } from '@/components/ui/form'
import { EmptyState } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'

type Category = Complaint['category']
type Urgency = Complaint['urgency']

export function SupportPage() {
  const { state, account } = useSession()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [candidateId, setCandidateId] = useState('')
  const [category, setCategory] = useState<Category>('biaya')
  const [urgency, setUrgency] = useState<Urgency>('medium')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!account) return null
  const isCpmi = account.role === 'cpmi'
  const candidates = visibleCandidates(state, account)
  const rows = useMemo(
    () =>
      visibleComplaints(state, account).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [state, account],
  )
  const openCount = rows.filter((c) => c.status === 'open' || c.status === 'in_progress').length
  const resolvedCount = rows.filter((c) => c.status === 'resolved').length

  const startCreate = () => {
    setCandidateId(candidates.length === 1 ? candidates[0].id : '')
    setCategory('biaya')
    setUrgency('medium')
    setDescription('')
    setError(null)
    setOpen(true)
  }

  const submit = () => {
    setError(null)
    if (!candidateId) {
      setError('Pilih kandidat terkait pengaduan.')
      return
    }
    if (description.trim().length < 10) {
      setError('Uraian minimal 10 karakter agar dapat ditindaklanjuti.')
      return
    }
    setBusy(true)
    const result = createComplaint(candidateId, category, urgency, description)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success(
      'Pengaduan terkirim',
      `${result.data.code} diterima. Simpan kode ini untuk menanyakan status.`,
    )
    setOpen(false)
    setDescription('')
  }

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Bantuan"
        title={isCpmi ? 'Bantuan & pengaduan' : 'Bantuan agen'}
        description={
          isCpmi
            ? 'Sampaikan pertanyaan atau keluhan tentang proses, biaya, jadwal, atau komunikasi. Pengaduan tercatat dan ditindaklanjuti P3MI.'
            : 'Bantu kandidat menyampaikan keluhan dan pantau tindak lanjutnya. Jangan menekan atau mewakili keterangan kandidat tanpa persetujuan.'
        }
        meta={
          <Badge tone="info" icon={<ShieldCheck className="h-3 w-3" />}>
            Identitas pelapor terlindungi
          </Badge>
        }
        actions={
          candidates.length > 0 ? (
            <Button
              variant="accent"
              icon={<MessageSquarePlus className="h-4 w-4" />}
              onClick={startCreate}
            >
              Buat pengaduan
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Pengaduan aktif"
          value={openCount}
          hint="Baru atau sedang diproses"
          icon={<Clock3 className="h-5 w-5" />}
          tone={openCount ? 'warning' : 'success'}
        />
        <StatCard
          label="Selesai"
          value={resolvedCount}
          hint="Ditindaklanjuti P3MI"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Total riwayat"
          value={rows.length}
          hint="Milik akun/jaringan Anda"
          icon={<LifeBuoy className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Jalur darurat"
          value="SOP P3MI"
          hint="Untuk ancaman / kekerasan"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="danger"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Card>
            <CardHeader
              title="Riwayat pengaduan"
              description="Anda dapat melihat status dan ringkasan penyelesaian."
              icon={<LifeBuoy className="h-4 w-4" />}
            />
            <CardContent className="space-y-2.5">
              {rows.length === 0 ? (
                <EmptyState
                  icon={<LifeBuoy className="h-5 w-5" />}
                  title="Belum ada pengaduan"
                  description="Bila ada kendala, buat pengaduan agar tercatat dan dapat dipantau."
                  action={
                    candidates.length > 0 ? (
                      <Button size="sm" variant="secondary" onClick={startCreate}>
                        Buat pengaduan pertama
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                rows.map((complaint) => {
                  const candidate = state.candidates.find((c) => c.id === complaint.candidateId)
                  return (
                    <div key={complaint.id} className="rounded-xl border border-line p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-bold text-ink">{complaint.code}</p>
                          <ComplaintBadge status={complaint.status} />
                          <Badge
                            tone={
                              complaint.urgency === 'high'
                                ? 'danger'
                                : complaint.urgency === 'medium'
                                  ? 'warning'
                                  : 'muted'
                            }
                          >
                            {complaint.urgency === 'high'
                              ? 'Urgensi tinggi'
                              : complaint.urgency === 'medium'
                                ? 'Sedang'
                                : 'Rendah'}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted">
                          {formatRelative(complaint.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] leading-5 text-slate-600">
                        {complaint.description}
                      </p>
                      <p className="mt-1 text-[10px] text-muted">
                        {COMPLAINT_CATEGORY[complaint.category]} · {candidate?.fullName ?? 'Kandidat'}
                      </p>
                      {complaint.resolution ? (
                        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                            Penyelesaian
                          </p>
                          <p className="mt-0.5 text-[10px] leading-4 text-emerald-900">
                            {complaint.resolution}
                          </p>
                          <p className="mt-1 text-[9px] text-emerald-700/70">
                            {formatDateTime(complaint.resolvedAt)}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Kontak bantuan"
              description="Kanal resmi pada pilot."
              icon={<Phone className="h-4 w-4" />}
            />
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-line px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted">P3MI pilot</p>
                <p className="mt-0.5 text-[11px] font-semibold text-ink">
                  PT Mitra Bhayangkara Nusantara
                </p>
                <p className="text-[10px] text-muted">Tasikmalaya · 08xx-xxxx-xxxx (contoh)</p>
              </div>
              <div className="rounded-xl border border-line px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Jam layanan</p>
                <p className="mt-0.5 text-[11px] font-semibold text-ink">Senin–Jumat, 08.00–16.00 WIB</p>
                <p className="text-[10px] text-muted">Di luar jam kerja, gunakan pengaduan tertulis.</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-red-700">
                  Darurat / ancaman
                </p>
                <p className="mt-0.5 text-[10px] leading-4 text-red-900">
                  Hubungi aparat setempat atau jalur perlindungan sesuai SOP. Jangan menunggu balasan
                  aplikasi bila ada risiko keselamatan.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Panduan singkat"
              description="Sebelum mengirim pengaduan."
              icon={<BookOpen className="h-4 w-4" />}
            />
            <CardContent>
              <ol className="space-y-2 text-[10px] leading-4 text-slate-600">
                <li>1. Catat tanggal, nama pihak, dan hal yang terjadi.</li>
                <li>2. Hindari mengirim dokumen pribadi melalui kolom uraian.</li>
                <li>3. Gunakan kode pengaduan untuk menanyakan status.</li>
                <li>4. Laporkan segera bila ada tekanan, biaya tak resmi, atau ancaman.</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4">
        <InfoNote tone="warning" title="Pengaduan bukan janji penyelesaian instan">
          P3MI wajib mencatat tindak lanjut, tetapi hasil bergantung pada bukti dan pihak terkait.
          Demo ini tidak mengirim pengaduan ke pihak luar.
        </InfoNote>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Buat pengaduan"
        description="Uraian akan dibaca P3MI dan tercatat pada audit trail. Sertakan fakta, bukan dugaan."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button loading={busy} onClick={submit}>
              Kirim pengaduan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Kandidat terkait" htmlFor="complaint-candidate" required>
            <Select
              id="complaint-candidate"
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
            >
              <option value="">Pilih kandidat…</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.fullName} — {candidate.candidateCode}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kategori" htmlFor="complaint-category" required>
              <Select
                id="complaint-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {Object.entries(COMPLAINT_CATEGORY).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Urgensi" htmlFor="complaint-urgency" required>
              <Select
                id="complaint-urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as Urgency)}
              >
                <option value="low">Rendah</option>
                <option value="medium">Sedang</option>
                <option value="high">Tinggi — perlu respons cepat</option>
              </Select>
            </Field>
          </div>
          <Field
            label="Uraian"
            htmlFor="complaint-description"
            required
            hint="Minimal 10 karakter. Jangan menuliskan nomor dokumen lengkap atau data sensitif."
            error={error ?? undefined}
          >
            <Textarea
              id="complaint-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Jelaskan apa yang terjadi, kapan, dan bantuan yang diharapkan…"
            />
          </Field>
          <InfoNote tone="info">
            Pada demo, pengaduan hanya tersimpan di perangkat ini dan tidak dikirim ke pihak luar.
          </InfoNote>
        </div>
      </Dialog>
    </div>
  )
}
