import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Inbox,
  MessageSquareWarning,
  SearchX,
  ShieldCheck,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { visibleComplaints } from '@/lib/permissions'
import { updateComplaint } from '@/lib/store'
import { COMPLAINT_CATEGORY } from '@/lib/constants'
import type { Complaint, ComplaintStatus } from '@/lib/types'
import { formatDateTime, formatRelative } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { SearchInput } from '@/components/shared/misc'
import { ComplaintBadge } from '@/components/shared/status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Select, Textarea } from '@/components/ui/form'
import { EmptyState } from '@/components/ui/misc'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'

type Filter = 'open' | 'in_progress' | 'resolved' | 'all'

const urgencyTone: Record<Complaint['urgency'], 'muted' | 'warning' | 'danger'> = {
  low: 'muted',
  medium: 'warning',
  high: 'danger',
}

const urgencyLabel: Record<Complaint['urgency'], string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
}

export function P3miComplaintsPage() {
  const { state, account } = useSession()
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('open')
  const [query, setQuery] = useState('')
  const [target, setTarget] = useState<Complaint | null>(null)
  const [nextStatus, setNextStatus] = useState<ComplaintStatus>('in_progress')
  const [resolution, setResolution] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!account) return null
  const rows = useMemo(
    () =>
      visibleComplaints(state, account).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [state, account],
  )

  const counts = {
    open: rows.filter((c) => c.status === 'open').length,
    progress: rows.filter((c) => c.status === 'in_progress').length,
    resolved: rows.filter((c) => c.status === 'resolved' || c.status === 'closed').length,
    high: rows.filter((c) => c.urgency === 'high' && c.status !== 'resolved' && c.status !== 'closed')
      .length,
  }

  const filtered = rows.filter((complaint) => {
    if (filter === 'resolved' && !['resolved', 'closed'].includes(complaint.status)) return false
    if (filter !== 'all' && filter !== 'resolved' && complaint.status !== filter) return false
    const candidate = state.candidates.find((c) => c.id === complaint.candidateId)
    const term = query.trim().toLowerCase()
    if (!term) return true
    return `${complaint.code} ${complaint.description} ${complaint.createdByName} ${
      candidate?.fullName ?? ''
    } ${COMPLAINT_CATEGORY[complaint.category]}`
      .toLowerCase()
      .includes(term)
  })

  const openComplaint = (complaint: Complaint) => {
    setTarget(complaint)
    setNextStatus(complaint.status === 'open' ? 'in_progress' : complaint.status)
    setResolution(complaint.resolution ?? '')
    setError(null)
  }

  const submit = () => {
    if (!target) return
    setError(null)
    if (nextStatus === 'resolved' && resolution.trim().length < 10) {
      setError('Ringkasan penyelesaian minimal 10 karakter.')
      return
    }
    setBusy(true)
    const result = updateComplaint(target.id, nextStatus, resolution)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success('Pengaduan diperbarui', `${target.code} → ${nextStatus.replace(/_/g, ' ')}.`)
    setTarget(null)
    setResolution('')
  }

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Layanan & kepatuhan"
        title="Pengaduan"
        description="Tindak lanjuti pengaduan CPMI dan agen. Setiap penyelesaian wajib memiliki ringkasan yang dapat dibaca pelapor."
        meta={
          <Badge tone="warning" icon={<ShieldCheck className="h-3 w-3" />}>
            Kerahasiaan pelapor dijaga
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Pengaduan baru"
          value={counts.open}
          hint="Belum ditindaklanjuti"
          icon={<Inbox className="h-5 w-5" />}
          tone={counts.open ? 'warning' : 'success'}
        />
        <StatCard
          label="Ditindaklanjuti"
          value={counts.progress}
          hint="Sedang diproses"
          icon={<Clock3 className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Selesai"
          value={counts.resolved}
          hint="Resolved atau ditutup"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Urgensi tinggi"
          value={counts.high}
          hint="Perlu respons cepat"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={counts.high ? 'danger' : 'slate'}
        />
      </div>

      <Card className="mt-5">
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              tabs={[
                { id: 'open', label: 'Baru', count: counts.open },
                { id: 'in_progress', label: 'Diproses', count: counts.progress },
                { id: 'resolved', label: 'Selesai', count: counts.resolved },
                { id: 'all', label: 'Semua', count: rows.length },
              ]}
              value={filter}
              onChange={setFilter}
            />
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kode, pelapor, kandidat…"
              className="sm:w-72"
              aria-label="Cari pengaduan"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<SearchX className="h-5 w-5" />}
              title="Tidak ada pengaduan"
              description="Belum ada pengaduan pada filter ini."
            />
          ) : (
            <ul className="space-y-2.5">
              {filtered.map((complaint) => {
                const candidate = state.candidates.find((c) => c.id === complaint.candidateId)
                return (
                  <li key={complaint.id} className="rounded-xl border border-line p-3.5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={
                            complaint.urgency === 'high'
                              ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700'
                              : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand'
                          }
                        >
                          <MessageSquareWarning className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-bold text-ink">{complaint.code}</p>
                            <ComplaintBadge status={complaint.status} />
                            <Badge tone={urgencyTone[complaint.urgency]}>
                              {urgencyLabel[complaint.urgency]}
                            </Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-600">
                            {complaint.description}
                          </p>
                          <p className="mt-1 text-[10px] text-muted">
                            {candidate?.fullName ?? 'Kandidat'} · {COMPLAINT_CATEGORY[complaint.category]} · oleh{' '}
                            {complaint.createdByName} · {formatRelative(complaint.createdAt)}
                          </p>
                          {complaint.resolution ? (
                            <p className="mt-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] leading-4 text-emerald-800">
                              Penyelesaian: {complaint.resolution}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => openComplaint(complaint)}>
                          Tindak lanjuti
                        </Button>
                        <Link
                          to={`/p3mi/kandidat/${complaint.candidateId}`}
                          className="focus-ring inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold text-brand hover:bg-brand-soft"
                        >
                          Kandidat
                        </Link>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-4">
        <InfoNote tone="info" title="Jangan meminta dokumen sensitif lewat pengaduan">
          Gunakan kanal ini untuk koordinasi operasional. Untuk dugaan kekerasan, penipuan, atau
          ancaman, eskalasi segera ke jalur perlindungan sesuai SOP dan catat tindakan minimum yang
          diambil tanpa membuka identitas pelapor ke pihak yang dilaporkan.
        </InfoNote>
      </div>

      <Dialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target ? `Tindak lanjuti ${target.code}` : 'Tindak lanjuti'}
        description={
          target
            ? `${COMPLAINT_CATEGORY[target.category]} · oleh ${target.createdByName} · ${formatDateTime(
                target.createdAt,
              )}`
            : undefined
        }
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>
              Batal
            </Button>
            <Button loading={busy} onClick={submit}>
              Simpan tindak lanjut
            </Button>
          </>
        }
      >
        {target ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-slate-50 p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Uraian pelapor</p>
              <p className="mt-1.5 text-[11px] leading-5 text-slate-700">{target.description}</p>
              <p className="mt-2 text-[10px] text-muted">
                Kandidat:{' '}
                {state.candidates.find((c) => c.id === target.candidateId)?.fullName ?? '—'}
              </p>
            </div>
            <Field label="Status penanganan" htmlFor="complaint-status" required>
              <Select
                id="complaint-status"
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as ComplaintStatus)}
              >
                <option value="open">Baru</option>
                <option value="in_progress">Ditindaklanjuti</option>
                <option value="resolved">Selesai</option>
                <option value="closed">Ditutup</option>
              </Select>
            </Field>
            <Field
              label="Ringkasan tindakan / penyelesaian"
              htmlFor="complaint-resolution"
              required={nextStatus === 'resolved'}
              hint="Wajib untuk status selesai. Akan dikirim sebagai notifikasi kepada pelapor."
              error={error ?? undefined}
            >
              <Textarea
                id="complaint-resolution"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
                placeholder="Contoh: biaya yang dipersoalkan sudah dikonfirmasi sesuai perjanjian; pelapor diberi penjelasan rinci pada 2 Nov 2026."
              />
            </Field>
            <InfoNote tone="warning" title="Jaga jejak audit">
              Jangan mengubah uraian pelapor. Catat tindakan pada ringkasan penyelesaian agar
              keputusan dapat ditinjau.
            </InfoNote>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
