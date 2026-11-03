import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  FileWarning,
  SearchX,
  Users,
  UserRound,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { visibleCandidates, visibleReferrals } from '@/lib/permissions'
import { formatRelative } from '@/lib/format'
import { PageHeader, InfoNote } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import { SearchInput } from '@/components/shared/misc'
import { CandidateStatusBadge, ReferralBadge, VisitBadge } from '@/components/shared/status'
import { Avatar, EmptyState } from '@/components/ui/misc'
import { LinkButton } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Filter = 'active' | 'action' | 'done' | 'all'

const doneStatuses = new Set(['departed', 'arrived', 'employer_handover', 'working', 'monitoring'])

export function AgentCandidateListPage() {
  const { state, account } = useSession()
  const [filter, setFilter] = useState<Filter>('active')
  const [query, setQuery] = useState('')

  const candidates = useMemo(
    () => (account ? visibleCandidates(state, account) : []),
    [state, account],
  )
  const referrals = useMemo(
    () => (account ? visibleReferrals(state, account) : []),
    [state, account],
  )

  if (!account) return null
  const isCoordinator = account.role === 'agent_coordinator'

  const withMeta = candidates.map((candidate) => {
    const referral =
      referrals.find((r) => r.candidateId === candidate.id && r.status === 'accepted') ??
      referrals.find((r) => r.candidateId === candidate.id)
    const visit = state.visits
      .filter((v) => v.candidateId === candidate.id && (v.status === 'proposed' || v.status === 'confirmed'))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]
    const handover = state.handovers.find(
      (h) => h.candidateId === candidate.id && h.status !== 'declined',
    )
    const needsAction =
      candidate.branchStatus === 'revision_required' ||
      (referral?.status === 'submitted' && candidate.status === 'lead_registered') ||
      (referral?.status === 'accepted' && !visit && !handover) ||
      Boolean(visit)
    return { candidate, referral, visit, handover, needsAction }
  })

  const counts = {
    total: candidates.length,
    active: candidates.filter((c) => !c.branchStatus || c.branchStatus === 'revision_required').length,
    action: withMeta.filter((row) => row.needsAction).length,
    done: candidates.filter((c) => doneStatuses.has(c.status)).length,
  }

  const rows = withMeta
    .filter(({ candidate }) => {
      if (filter === 'all') return true
      if (filter === 'done') return doneStatuses.has(candidate.status)
      if (filter === 'action') return rowNeedsAction(candidate, withMeta)
      return !doneStatuses.has(candidate.status)
    })
    .filter(({ candidate, referral }) => {
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return [
        candidate.fullName,
        candidate.nickname,
        candidate.candidateCode,
        candidate.phone,
        candidate.region,
        referral?.code,
        state.agents.find((a) => a.id === candidate.agentId)?.name,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q))
    })
    .sort(
      (a, b) =>
        new Date(b.candidate.lastActivityAt).getTime() -
        new Date(a.candidate.lastActivityAt).getTime(),
    )

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Buku kandidat"
        title={isCoordinator ? 'Kandidat jaringan' : 'Kandidat saya'}
        description={
          isCoordinator
            ? 'Semua kandidat dari agen di bawah koordinasi Anda. Anda dapat membantu tindak lanjut, tetapi keputusan penempatan tetap milik P3MI.'
            : 'Pantau kandidat yang Anda referensikan, lengkapi jadwal, dan lihat status yang dicatat P3MI. Anda tidak dapat mengubah status pipeline.'
        }
        actions={
          <LinkButton to="/agen/referral/baru" variant="accent" icon={<UserRound className="h-4 w-4" />}>
            Daftarkan kandidat
          </LinkButton>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total kandidat"
          value={counts.total}
          hint={isCoordinator ? 'Seluruh jaringan koordinasi' : 'Terdaftar atas nama Anda'}
          icon={<Users className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Masih berjalan"
          value={counts.active}
          hint="Belum berada di tahap akhir"
          icon={<CalendarCheck2 className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label="Perlu tindakan"
          value={counts.action}
          hint="Jadwal, dokumen, atau handover"
          icon={<FileWarning className="h-5 w-5" />}
          tone={counts.action ? 'warning' : 'success'}
        />
        <StatCard
          label="Sudah berangkat"
          value={counts.done}
          hint="Termasuk tahap bekerja & monitoring"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
      </section>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <Tabs<Filter>
            tabs={[
              { id: 'active', label: 'Berjalan', count: counts.active },
              { id: 'action', label: 'Perlu tindakan', count: counts.action },
              { id: 'done', label: 'Selesai', count: counts.done },
              { id: 'all', label: 'Semua', count: counts.total },
            ]}
            value={filter}
            onChange={setFilter}
          />
          <SearchInput
            placeholder="Cari nama, kode, wilayah…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="lg:w-72"
            aria-label="Cari kandidat"
          />
        </div>

        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<SearchX className="h-5 w-5" />}
                title="Tidak ada kandidat pada filter ini"
                description="Ubah filter atau kata pencarian. Kandidat baru dapat didaftarkan melalui tombol di kanan atas."
                action={
                  <LinkButton to="/agen/referral/baru" size="sm" variant="secondary">
                    Buat referral
                  </LinkButton>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map(({ candidate, referral, visit, handover }) => (
                <li key={candidate.id}>
                  <Link
                    to={`/agen/kandidat/${candidate.id}`}
                    className="focus-ring group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-slate-50/70 sm:px-5 lg:flex-row lg:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <Avatar name={candidate.fullName} size="md" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-ink group-hover:text-brand">
                            {candidate.fullName}
                          </span>
                          <span className="font-mono text-[9px] text-muted">{candidate.candidateCode}</span>
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {candidate.region} · {candidate.phone}
                          {isCoordinator && candidate.agentId
                            ? ` · ${state.agents.find((a) => a.id === candidate.agentId)?.name ?? 'Agen'}`
                            : ''}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <CandidateStatusBadge
                            status={candidate.status}
                            branch={candidate.branchStatus}
                          />
                          {referral ? <ReferralBadge status={referral.status} /> : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] lg:w-[360px] lg:shrink-0 lg:justify-end">
                      {visit ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-[9px] text-slate-600">
                          <VisitBadge status={visit.status} />
                          {formatRelative(visit.scheduledAt)}
                        </span>
                      ) : null}
                      {handover ? (
                        <span
                          className={cn(
                            'rounded-full px-2 py-1 text-[9px] font-bold',
                            handover.status === 'accepted'
                              ? 'bg-emerald-50 text-emerald-700'
                              : handover.status === 'declined'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-800',
                          )}
                        >
                          Handover {handover.status === 'accepted' ? 'diterima' : handover.status === 'declined' ? 'ditolak' : 'diajukan'}
                        </span>
                      ) : null}
                      <span className="text-[9px] text-muted">
                        {formatRelative(candidate.lastActivityAt)}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-brand" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-4">
        <InfoNote tone="info" title="Batas peran agen">
          Anda mencatat referral dan membantu kelengkapan administratif. Validasi dokumen, seleksi
          employer, kontrak, visa, dan status penempatan sepenuhnya menjadi kewenangan P3MI.
        </InfoNote>
      </div>
    </div>
  )
}

type CandidateRow = {
  candidate: ReturnType<typeof visibleCandidates>[number]
  needsAction: boolean
}

function rowNeedsAction(
  candidate: CandidateRow['candidate'],
  rows: CandidateRow[],
): boolean {
  return rows.find((row) => row.candidate.id === candidate.id)?.needsAction ?? false
}
