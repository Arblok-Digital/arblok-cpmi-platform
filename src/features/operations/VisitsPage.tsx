import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Handshake,
  MapPin,
  SearchX,
  UserRound,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { isP3miRole } from '@/lib/permissions'
import { respondHandover, scheduleVisit, setVisitStatus } from '@/lib/store'
import { HANDOVER_META } from '@/lib/constants'
import type { Handover, Visit } from '@/lib/types'
import { formatDateTime, formatRelative, toLocalInputValue } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { SearchInput } from '@/components/shared/misc'
import { HandoverBadge, VisitBadge } from '@/components/shared/status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Select, Textarea } from '@/components/ui/form'
import { EmptyState } from '@/components/ui/misc'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'

type Tab = 'jadwal' | 'handover'
type VisitNext = 'confirmed' | 'attended' | 'no_show' | 'cancelled'

const nextVisitOptions: { id: VisitNext; label: string }[] = [
  { id: 'confirmed', label: 'Konfirmasi' },
  { id: 'attended', label: 'Tandai hadir' },
  { id: 'no_show', label: 'Tidak hadir' },
  { id: 'cancelled', label: 'Batalkan' },
]

export function VisitsPage() {
  const { state, account } = useSession()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('jadwal')
  const [query, setQuery] = useState('')
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [candidateId, setCandidateId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [location, setLocation] = useState('Kantor P3MI Mitra Bhayangkara — Tasikmalaya')
  const [scheduleNotes, setScheduleNotes] = useState('')
  const [visitTarget, setVisitTarget] = useState<{ visit: Visit; next: VisitNext } | null>(null)
  const [visitNotes, setVisitNotes] = useState('')
  const [handoverTarget, setHandoverTarget] = useState<{ handover: Handover; accept: boolean } | null>(
    null,
  )
  const [handoverNotes, setHandoverNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!account || !isP3miRole(account.role)) return null

  const candidates = state.candidates.filter((c) => c.orgId === account.orgId)
  const candidateName = (id: string) => candidates.find((c) => c.id === id)?.fullName ?? 'Kandidat'

  const visits = useMemo(
    () =>
      state.visits
        .filter((v) => candidates.some((c) => c.id === v.candidateId))
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
    [state.visits, candidates],
  )
  const handovers = useMemo(
    () =>
      state.handovers
        .filter((h) => candidates.some((c) => c.id === h.candidateId))
        .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
    [state.handovers, candidates],
  )

  const acceptedCandidates = candidates.filter((c) =>
    state.referrals.some((r) => r.candidateId === c.id && r.status === 'accepted'),
  )
  const upcoming = visits.filter(
    (v) =>
      (v.status === 'proposed' || v.status === 'confirmed') &&
      new Date(v.scheduledAt).getTime() > Date.now() - 3600000,
  )
  const proposed = visits.filter((v) => v.status === 'proposed')
  const attended = visits.filter((v) => v.status === 'attended')
  const requested = handovers.filter((h) => h.status === 'requested')

  const filteredVisits = visits.filter((v) => {
    const term = query.trim().toLowerCase()
    if (!term) return true
    return `${candidateName(v.candidateId)} ${v.locationLabel} ${v.status}`
      .toLowerCase()
      .includes(term)
  })
  const filteredHandovers = handovers.filter((h) => {
    const term = query.trim().toLowerCase()
    if (!term) return true
    return `${candidateName(h.candidateId)} ${h.status} ${h.proofReference ?? ''}`
      .toLowerCase()
      .includes(term)
  })

  const openSchedule = (presetCandidate?: string) => {
    setCandidateId(presetCandidate ?? '')
    setScheduledAt(toLocalInputValue(new Date(Date.now() + 86400000).toISOString()))
    setLocation('Kantor P3MI Mitra Bhayangkara — Tasikmalaya')
    setScheduleNotes('')
    setError(null)
    setScheduleOpen(true)
  }

  const submitSchedule = () => {
    setError(null)
    if (!candidateId) {
      setError('Pilih kandidat terlebih dahulu.')
      return
    }
    if (!scheduledAt) {
      setError('Tanggal dan waktu kunjungan wajib diisi.')
      return
    }
    setBusy(true)
    const result = scheduleVisit(
      candidateId,
      new Date(scheduledAt).toISOString(),
      location,
      scheduleNotes,
    )
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success('Jadwal kunjungan dibuat', `${candidateName(candidateId)} · ${formatDateTime(scheduledAt)}`)
    setScheduleOpen(false)
  }

  const submitVisit = () => {
    if (!visitTarget) return
    setError(null)
    setBusy(true)
    const result = setVisitStatus(visitTarget.visit.id, visitTarget.next, visitNotes)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success('Status kunjungan diperbarui', candidateName(visitTarget.visit.candidateId))
    setVisitTarget(null)
    setVisitNotes('')
  }

  const submitHandover = () => {
    if (!handoverTarget) return
    setError(null)
    setBusy(true)
    const result = respondHandover(
      handoverTarget.handover.id,
      handoverTarget.accept,
      handoverNotes,
    )
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success(
      handoverTarget.accept ? 'Serah terima diterima' : 'Serah terima ditolak',
      candidateName(handoverTarget.handover.candidateId),
    )
    setHandoverTarget(null)
    setHandoverNotes('')
  }

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Operasional lapangan"
        title="Jadwal & serah terima"
        description="Konfirmasi kunjungan kandidat ke kantor P3MI dan catat serah terima dari agen sumber. Kehadiran kandidat menjadi dasar pemeriksaan awal."
        meta={
          <Badge tone="info" icon={<CalendarCheck2 className="h-3 w-3" />}>
            {upcoming.length} jadwal aktif
          </Badge>
        }
        actions={
          <Button
            variant="accent"
            icon={<CalendarPlus className="h-4 w-4" />}
            onClick={() => openSchedule()}
          >
            Jadwalkan kunjungan
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Jadwal mendatang"
          value={upcoming.length}
          hint="Terkonfirmasi atau diusulkan"
          icon={<CalendarDays className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Perlu konfirmasi"
          value={proposed.length}
          hint="Diusulkan agen sumber"
          icon={<Clock3 className="h-5 w-5" />}
          tone={proposed.length ? 'warning' : 'success'}
        />
        <StatCard
          label="Kandidat hadir"
          value={attended.length}
          hint="Dasar pemeriksaan awal"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Serah terima"
          value={requested.length}
          hint="Menunggu keputusan P3MI"
          icon={<Handshake className="h-5 w-5" />}
          tone={requested.length ? 'accent' : 'slate'}
        />
      </div>

      <Card className="mt-5">
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              tabs={[
                { id: 'jadwal', label: 'Jadwal kunjungan', count: visits.length },
                { id: 'handover', label: 'Serah terima', count: handovers.length },
              ]}
              value={tab}
              onChange={setTab}
            />
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kandidat, lokasi, status…"
              className="sm:w-72"
              aria-label="Cari jadwal atau serah terima"
            />
          </div>

          {tab === 'jadwal' ? (
            filteredVisits.length === 0 ? (
              <EmptyState
                icon={<SearchX className="h-5 w-5" />}
                title="Belum ada jadwal"
                description="Jadwalkan kunjungan setelah referral diterima P3MI."
                action={
                  <Button size="sm" variant="secondary" onClick={() => openSchedule()}>
                    Buat jadwal
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-2.5">
                {filteredVisits.map((visit) => {
                  const candidate = candidates.find((c) => c.id === visit.candidateId)
                  const isActive = visit.status === 'proposed' || visit.status === 'confirmed'
                  return (
                    <li key={visit.id} className="rounded-xl border border-line p-3.5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                            <CalendarDays className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                to={`/p3mi/kandidat/${visit.candidateId}`}
                                className="text-xs font-bold text-ink hover:text-brand hover:underline"
                              >
                                {candidate?.fullName ?? 'Kandidat'}
                              </Link>
                              <VisitBadge status={visit.status} />
                            </div>
                            <p className="mt-1 flex items-center gap-1 text-[10px] text-muted">
                              <Clock3 className="h-3 w-3" /> {formatDateTime(visit.scheduledAt)}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                              <MapPin className="h-3 w-3" /> {visit.locationLabel}
                            </p>
                            {visit.notes ? (
                              <p className="mt-1.5 text-[10px] leading-4 text-slate-600">
                                Catatan: {visit.notes}
                              </p>
                            ) : null}
                            <p className="mt-1 text-[9px] text-slate-400">
                              Dibuat {formatRelative(visit.createdAt)}
                            </p>
                          </div>
                        </div>
                        {isActive ? (
                          <div className="flex flex-wrap gap-1.5">
                            {visit.status === 'proposed' ? (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  setVisitTarget({ visit, next: 'confirmed' })
                                  setVisitNotes('')
                                  setError(null)
                                }}
                              >
                                Konfirmasi
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => {
                                  setVisitTarget({ visit, next: 'attended' })
                                  setVisitNotes('')
                                  setError(null)
                                }}
                              >
                                Hadir
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setVisitTarget({ visit, next: 'no_show' })
                                setVisitNotes('')
                                setError(null)
                              }}
                            >
                              Tidak hadir
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setVisitTarget({ visit, next: 'cancelled' })
                                setVisitNotes('')
                                setError(null)
                              }}
                            >
                              Batalkan
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )
          ) : filteredHandovers.length === 0 ? (
            <EmptyState
              icon={<Handshake className="h-5 w-5" />}
              title="Belum ada permintaan serah terima"
              description="Agen sumber dapat mengajukan serah terima setelah kandidat hadir ke kantor."
            />
          ) : (
            <ul className="space-y-2.5">
              {filteredHandovers.map((handover) => {
                const candidate = candidates.find((c) => c.id === handover.candidateId)
                const agent = state.agents.find((a) => a.id === handover.fromAgentId)
                return (
                  <li key={handover.id} className="rounded-xl border border-line p-3.5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-deep">
                          <Handshake className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/p3mi/kandidat/${handover.candidateId}`}
                              className="text-xs font-bold text-ink hover:text-brand hover:underline"
                            >
                              {candidate?.fullName ?? 'Kandidat'}
                            </Link>
                            <HandoverBadge status={handover.status} />
                          </div>
                          <p className="mt-1 text-[10px] text-muted">
                            Diajukan oleh {agent?.name ?? 'agen sumber'} ·{' '}
                            {formatRelative(handover.requestedAt)}
                          </p>
                          {handover.proofReference ? (
                            <p className="mt-1 text-[10px] font-semibold text-emerald-700">
                              Bukti serah terima: {handover.proofReference}
                            </p>
                          ) : null}
                          {handover.notes ? (
                            <p className="mt-1.5 text-[10px] leading-4 text-slate-600">
                              Catatan: {handover.notes}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {handover.status === 'requested' ? (
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => {
                              setHandoverTarget({ handover, accept: true })
                              setHandoverNotes('')
                              setError(null)
                            }}
                          >
                            Terima
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setHandoverTarget({ handover, accept: false })
                              setHandoverNotes('')
                              setError(null)
                            }}
                          >
                            Tolak
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-4">
        <InfoNote tone="info" title="Alur yang benar">
          Kunjungan dikonfirmasi P3MI → kandidat hadir → pemeriksaan awal dimulai → agen mengajukan
          serah terima → P3MI menerima dan mencatat nomor bukti. Status pipeline tetap kewenangan
          P3MI.
        </InfoNote>
      </div>

      <Dialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Jadwalkan kunjungan"
        description="Jadwal yang dibuat P3MI langsung berstatus terkonfirmasi dan memindahkan kandidat ke tahap kunjungan."
        footer={
          <>
            <Button variant="secondary" onClick={() => setScheduleOpen(false)}>
              Batal
            </Button>
            <Button loading={busy} icon={<CalendarPlus className="h-4 w-4" />} onClick={submitSchedule}>
              Simpan jadwal
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Kandidat" htmlFor="visit-candidate" required>
            <Select
              id="visit-candidate"
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
            >
              <option value="">Pilih kandidat…</option>
              {acceptedCandidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.fullName} — {candidate.candidateCode}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal & waktu" htmlFor="visit-when" required>
            <input
              id="visit-when"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="focus-ring h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink"
            />
          </Field>
          <Field label="Lokasi" htmlFor="visit-location" required>
            <input
              id="visit-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="focus-ring h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink"
            />
          </Field>
          <Field label="Catatan untuk kandidat" htmlFor="visit-notes" hint="Opsional.">
            <Textarea
              id="visit-notes"
              value={scheduleNotes}
              onChange={(e) => setScheduleNotes(e.target.value)}
              placeholder="Contoh: bawa KTP asli dan fotokopi KK."
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
        open={Boolean(visitTarget)}
        onClose={() => setVisitTarget(null)}
        title={
          visitTarget
            ? `Kunjungan: ${nextVisitOptions.find((o) => o.id === visitTarget.next)?.label}`
            : 'Perbarui kunjungan'
        }
        description={visitTarget ? candidateName(visitTarget.visit.candidateId) : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setVisitTarget(null)}>
              Batal
            </Button>
            <Button
              loading={busy}
              variant={
                visitTarget?.next === 'attended'
                  ? 'success'
                  : visitTarget?.next === 'no_show' || visitTarget?.next === 'cancelled'
                    ? 'danger'
                    : 'primary'
              }
              onClick={submitVisit}
            >
              Simpan status
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-slate-50 p-3.5">
            <p className="text-[10px] text-muted">Jadwal saat ini</p>
            <p className="mt-1 text-xs font-bold text-ink">
              {visitTarget ? formatDateTime(visitTarget.visit.scheduledAt) : '—'}
            </p>
            <p className="mt-0.5 text-[10px] text-muted">{visitTarget?.visit.locationLabel}</p>
          </div>
          <Field
            label="Catatan"
            htmlFor="visit-status-note"
            hint={
              visitTarget?.next === 'attended'
                ? 'Kehadiran akan memulai pemeriksaan awal dan mencatat alasan pada timeline.'
                : 'Opsional, tetapi sangat disarankan untuk no-show atau pembatalan.'
            }
          >
            <Textarea
              id="visit-status-note"
              value={visitNotes}
              onChange={(e) => setVisitNotes(e.target.value)}
              rows={3}
              placeholder="Catatan operasional…"
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
        open={Boolean(handoverTarget)}
        onClose={() => setHandoverTarget(null)}
        title={handoverTarget?.accept ? 'Terima serah terima' : 'Tolak serah terima'}
        description={
          handoverTarget
            ? `${candidateName(handoverTarget.handover.candidateId)} · ${
                HANDOVER_META[handoverTarget.handover.status].label
              }`
            : undefined
        }
        tone={handoverTarget?.accept ? 'default' : 'danger'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setHandoverTarget(null)}>
              Batal
            </Button>
            <Button
              loading={busy}
              variant={handoverTarget?.accept ? 'success' : 'danger'}
              onClick={submitHandover}
            >
              {handoverTarget?.accept ? 'Terima & catat bukti' : 'Tolak permintaan'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-slate-50 p-3.5">
            <p className="text-[10px] text-muted">Agen sumber</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-ink">
              <UserRound className="h-3.5 w-3.5" />
              {handoverTarget
                ? state.agents.find((a) => a.id === handoverTarget.handover.fromAgentId)?.name ??
                  'Agen'
                : '—'}
            </p>
            <p className="mt-1 text-[10px] text-muted">
              Diajukan {handoverTarget ? formatRelative(handoverTarget.handover.requestedAt) : ''}
            </p>
          </div>
          {handoverTarget?.accept ? (
            <InfoNote tone="success" title="Nomor bukti dibuat otomatis">
              Penerimaan mencatat nama Anda sebagai penerima, waktu, dan nomor bukti serah terima.
              Kandidat masuk ke pemeriksaan awal bila belum melewati tahap itu.
            </InfoNote>
          ) : (
            <InfoNote tone="warning" title="Penolakan akan diberitahukan ke agen">
              Jelaskan alasan yang dapat ditindaklanjuti, misalnya kandidat belum hadir atau data
              belum lengkap.
            </InfoNote>
          )}
          <Field label="Catatan" htmlFor="handover-notes" hint="Opsional.">
            <Textarea
              id="handover-notes"
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              rows={3}
              placeholder="Catatan serah terima…"
            />
          </Field>
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </Dialog>
    </div>
  )
}
