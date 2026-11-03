import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, GitBranch, SearchX, ShieldCheck, UserRound } from 'lucide-react'
import { useSession } from '@/app/session'
import { visibleCandidates } from '@/lib/permissions'
import { activeCandidates, groupCounts } from '@/lib/insights'
import { STATUS_GROUPS, STATUS_META } from '@/lib/constants'
import type { StatusGroupId } from '@/lib/constants'
import { formatRelative } from '@/lib/format'
import { PageHeader, InfoNote } from '@/components/shared/page'
import { Card, CardContent } from '@/components/ui/card'
import { SearchInput } from '@/components/shared/misc'
import { Select } from '@/components/ui/form'
import { CandidateStatusBadge } from '@/components/shared/status'
import { EmptyState } from '@/components/ui/misc'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const groupAccent: Record<StatusGroupId, string> = {
  registrasi: 'bg-slate-400',
  verifikasi: 'bg-sky-500',
  seleksi: 'bg-amber-500',
  dokumen: 'bg-violet-500',
  keberangkatan: 'bg-brand',
  purna: 'bg-emerald-500',
}

export function PipelineBoardPage() {
  const { state, account } = useSession()
  const [query, setQuery] = useState('')
  const [agentId, setAgentId] = useState('all')

  const candidates = useMemo(
    () => (account ? visibleCandidates(state, account) : []),
    [state, account],
  )

  if (!account) return null
  const agents = state.agents.filter((a) => a.orgId === account.orgId)
  const active = activeCandidates(candidates)
  const counts = groupCounts(active)
  const branches = candidates.filter(
    (c) => c.branchStatus && c.branchStatus !== 'revision_required',
  )

  const filtered = active
    .filter((c) => (agentId === 'all' ? true : c.agentId === agentId))
    .filter((c) => {
      if (!query.trim()) return true
      const q = query.toLowerCase()
      const agent = state.agents.find((a) => a.id === c.agentId)
      return [c.fullName, c.candidateCode, c.region, agent?.name]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q))
    })

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Pipeline 19 status"
        title="Pipeline penempatan"
        description="Board operasional per kelompok status. Kandidat dengan status cabang dipisahkan agar tidak menyamarkan proses yang dijeda, ditolak, atau ditutup."
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">
            <ShieldCheck className="h-3 w-3" /> {active.length} kandidat berjalan
          </span>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
          {counts.map((group) => (
            <span
              key={group.id}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[10px] font-semibold text-slate-600"
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', groupAccent[group.id])} />
              {group.label}
              <span className="font-bold text-ink">{group.value}</span>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <SearchInput
            placeholder="Cari kandidat…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:w-52"
            aria-label="Cari kandidat"
          />
          <Select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="h-10 sm:w-40"
            aria-label="Filter agen"
          >
            <option value="all">Semua agen</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
        {STATUS_GROUPS.map((group) => {
          const items = filtered
            .filter((c) => STATUS_META[c.status].group === group.id)
            .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())
          return (
            <section key={group.id} className="w-[268px] shrink-0 sm:w-[286px]" data-testid={`pipeline-column-${group.id}`}>
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span className={cn('h-2 w-2 rounded-full', groupAccent[group.id])} />
                  <h2 className="text-[11px] font-bold text-ink">{group.label}</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                  {items.length}
                </span>
              </div>
              <div className="min-h-[160px] space-y-2 rounded-2xl border border-line bg-slate-50/60 p-2">
                {items.length === 0 ? (
                  <p className="px-2 py-8 text-center text-[10px] text-muted">Tidak ada kandidat.</p>
                ) : (
                  items.map((candidate) => {
                    const agent = state.agents.find((a) => a.id === candidate.agentId)
                    return (
                      <Link
                        key={candidate.id}
                        to={`/p3mi/kandidat/${candidate.id}`}
                        className="focus-ring block rounded-xl border border-line bg-surface p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-card"
                        data-testid={`pipeline-candidate-${candidate.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-bold text-ink">{candidate.fullName}</p>
                            <p className="mt-0.5 font-mono text-[8px] text-muted">{candidate.candidateCode}</p>
                          </div>
                          <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-slate-300" />
                        </div>
                        <div className="mt-2">
                          <CandidateStatusBadge status={candidate.status} showBranch={false} />
                        </div>
                        <p className="mt-2 truncate text-[9px] text-muted">
                          {agent?.name ?? 'Tanpa agen'} · {candidate.region}
                        </p>
                        <p className="mt-0.5 text-[8px] text-slate-400">
                          aktif {formatRelative(candidate.lastActivityAt)}
                        </p>
                      </Link>
                    )
                  })
                )}
              </div>
            </section>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<SearchX className="h-5 w-5" />}
            title="Tidak ada kandidat pada filter ini"
            description="Ubah kata pencarian atau filter agen."
          />
        </div>
      ) : null}

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-bold text-ink">Status cabang</h2>
          </div>
          <Badge tone="warning">{branches.length} kandidat</Badge>
        </div>
        {branches.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-xs text-muted">
              Tidak ada kandidat dengan status ditutup, ditolak, atau dijeda.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {branches.map((candidate) => (
              <Link
                key={candidate.id}
                to={`/p3mi/kandidat/${candidate.id}`}
                className="focus-ring card card-hover flex items-start gap-3 p-3.5"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <UserRound className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold text-ink">{candidate.fullName}</p>
                  <p className="mt-0.5 font-mono text-[8px] text-muted">{candidate.candidateCode}</p>
                  <div className="mt-1.5">
                    <CandidateStatusBadge status={candidate.status} branch={candidate.branchStatus} />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[9px] leading-4 text-muted">
                    {candidate.branchReason ?? 'Status cabang tanpa catatan.'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="mt-5">
        <InfoNote tone="info" title="Update status dari board">
          Buka kartu kandidat untuk memperbarui status pipeline atau status cabang. Setiap perubahan
          meminta alasan bila bersifat mundur, dan tercatat pada audit event.
        </InfoNote>
      </div>
    </div>
  )
}
