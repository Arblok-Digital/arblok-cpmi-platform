import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  FileWarning,
  SearchX,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { visibleCandidates } from '@/lib/permissions'
import { activeCandidates } from '@/lib/insights'
import { BRANCH_META, STATUS_GROUPS, STATUS_META } from '@/lib/constants'
import type { StatusGroupId } from '@/lib/constants'
import { formatRelative } from '@/lib/format'
import { PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent } from '@/components/ui/card'
import { SearchInput } from '@/components/shared/misc'
import { Select } from '@/components/ui/form'
import { CandidateStatusBadge, ReferralBadge } from '@/components/shared/status'
import { EmptyState } from '@/components/ui/misc'
import { Badge } from '@/components/ui/badge'

type GroupFilter = StatusGroupId | 'all'

export function P3miCandidateListPage() {
  const { state, account } = useSession()
  const [group, setGroup] = useState<GroupFilter>('all')
  const [agentId, setAgentId] = useState('all')
  const [branch, setBranch] = useState('active')
  const [query, setQuery] = useState('')

  const candidates = useMemo(
    () => (account ? visibleCandidates(state, account) : []),
    [state, account],
  )

  if (!account) return null
  const orgAgents = state.agents.filter((a) => a.orgId === account.orgId)
  const active = activeCandidates(candidates)
  const pendingDocs = state.documents.filter(
    (d) => d.orgId === account.orgId && d.status === 'pending_review',
  )
  const pendingDocsCandidates = new Set(pendingDocs.map((d) => d.candidateId))
  const revision = candidates.filter((c) => c.branchStatus === 'revision_required')
  const duplicateReferrals = state.referrals.filter(
    (r) => r.orgId === account.orgId && r.status === 'submitted' && r.duplicateWarning,
  )

  const rows = candidates
    .filter((candidate) => {
      if (branch === 'active' && candidate.branchStatus && candidate.branchStatus !== 'revision_required') {
        return false
      }
      if (branch === 'revision' && candidate.branchStatus !== 'revision_required') return false
      if (branch === 'inactive' && (!candidate.branchStatus || candidate.branchStatus === 'revision_required')) {
        return false
      }
      if (group !== 'all' && STATUS_META[candidate.status].group !== group) return false
      if (agentId !== 'all' && candidate.agentId !== agentId) return false
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return [candidate.fullName, candidate.nickname, candidate.candidateCode, candidate.phone, candidate.region]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q))
    })
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Master kandidat"
        title="Kandidat tenant"
        description="Seluruh kandidat pada workspace P3MI. Filter berdasarkan kelompok status, agen sumber, atau status cabang. Data lintas tenant tidak dapat diakses."
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">
            <ShieldCheck className="h-3 w-3" /> Tenant isolation aktif
          </span>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Kandidat aktif"
          value={active.length}
          hint={`${candidates.length} total kandidat`}
          icon={<Users className="h-5 w-5" />}
          tone="brand"
          to="/p3mi/pipeline"
        />
        <StatCard
          label="Dokumen menunggu"
          value={pendingDocs.length}
          hint={`${pendingDocsCandidates.size} kandidat terdampak`}
          icon={<FileWarning className="h-5 w-5" />}
          tone={pendingDocs.length ? 'warning' : 'success'}
          to="/p3mi/dokumen"
        />
        <StatCard
          label="Perlu revisi"
          value={revision.length}
          hint="Status cabang revision_required"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={revision.length ? 'warning' : 'success'}
        />
        <StatCard
          label="Referral duplikat"
          value={duplicateReferrals.length}
          hint="Menunggu respons P3MI"
          icon={<UserRound className="h-5 w-5" />}
          tone={duplicateReferrals.length ? 'danger' : 'success'}
          to="/p3mi/referral"
        />
      </section>

      <Card className="mt-5">
        <div className="space-y-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
            <FilterPill active={group === 'all'} onClick={() => setGroup('all')} label="Semua" count={candidates.length} />
            {STATUS_GROUPS.map((item) => (
              <FilterPill
                key={item.id}
                active={group === item.id}
                onClick={() => setGroup(item.id)}
                label={item.label}
                count={candidates.filter((c) => STATUS_META[c.status].group === item.id).length}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput
              placeholder="Cari nama, kode, telepon, wilayah…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
              aria-label="Cari kandidat"
            />
            <Select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="h-10 sm:w-48"
              aria-label="Filter agen sumber"
            >
              <option value="all">Semua agen</option>
              {orgAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </Select>
            <Select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="h-10 sm:w-44"
              aria-label="Filter status cabang"
            >
              <option value="active">Proses berjalan</option>
              <option value="revision">Perlu revisi</option>
              <option value="inactive">Ditutup / ditolak</option>
              <option value="all">Semua status cabang</option>
            </Select>
          </div>
        </div>

        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<SearchX className="h-5 w-5" />}
                title="Tidak ada kandidat pada filter ini"
                description="Ubah filter atau kata pencarian. Kandidat baru masuk melalui referral agen atau input P3MI."
              />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-2.5 sm:px-5">Kandidat</th>
                      <th className="px-3 py-2.5">Agen</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Referral</th>
                      <th className="px-3 py-2.5">Dokumen</th>
                      <th className="px-3 py-2.5">Aktivitas</th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((candidate) => {
                      const referral = state.referrals.find((r) => r.candidateId === candidate.id)
                      const agent = state.agents.find((a) => a.id === candidate.agentId)
                      const docs = state.documents.filter((d) => d.candidateId === candidate.id)
                      const pending = docs.filter((d) => d.status === 'pending_review').length
                      const revised = docs.filter((d) => d.status === 'revision_required').length
                      return (
                        <tr key={candidate.id} className="hover:bg-slate-50/70">
                          <td className="table-cell px-4 sm:px-5">
                            <Link to={`/p3mi/kandidat/${candidate.id}`} className="group block">
                              <span className="text-xs font-bold text-ink group-hover:text-brand">
                                {candidate.fullName}
                              </span>
                              <span className="mt-0.5 block font-mono text-[9px] text-muted">
                                {candidate.candidateCode} · {candidate.region}
                              </span>
                            </Link>
                          </td>
                          <td className="table-cell px-3 text-[11px] text-slate-600">
                            {agent?.name ?? '—'}
                            <span className="block text-[9px] text-muted">{agent?.code ?? ''}</span>
                          </td>
                          <td className="table-cell px-3">
                            <CandidateStatusBadge
                              status={candidate.status}
                              branch={candidate.branchStatus}
                              audience="internal"
                            />
                          </td>
                          <td className="table-cell px-3">
                            {referral ? <ReferralBadge status={referral.status} /> : <span className="text-[10px] text-muted">—</span>}
                          </td>
                          <td className="table-cell px-3">
                            {pending > 0 ? (
                              <Badge tone="info">{pending} menunggu</Badge>
                            ) : revised > 0 ? (
                              <Badge tone="warning">{revised} revisi</Badge>
                            ) : (
                              <span className="text-[10px] text-muted">{docs.length} file</span>
                            )}
                          </td>
                          <td className="table-cell px-3 text-[10px] text-muted">
                            {formatRelative(candidate.lastActivityAt)}
                          </td>
                          <td className="table-cell px-3 text-right">
                            <Link
                              to={`/p3mi/kandidat/${candidate.id}`}
                              className="focus-ring inline-flex h-8 items-center gap-1 rounded-lg border border-line px-2.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Kelola <ArrowRight className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-line md:hidden">
                {rows.map((candidate) => {
                  const agent = state.agents.find((a) => a.id === candidate.agentId)
                  return (
                    <li key={candidate.id}>
                      <Link
                        to={`/p3mi/kandidat/${candidate.id}`}
                        className="flex items-start gap-3 px-4 py-4 hover:bg-slate-50"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                          <UserRound className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-ink">{candidate.fullName}</p>
                          <p className="mt-0.5 text-[9px] text-muted">
                            {candidate.candidateCode} · {agent?.name ?? 'Tanpa agen'} ·{' '}
                            {formatRelative(candidate.lastActivityAt)}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <CandidateStatusBadge status={candidate.status} branch={candidate.branchStatus} />
                          </div>
                        </div>
                        <ArrowRight className="mt-2 h-3.5 w-3.5 shrink-0 text-slate-300" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-[10px] leading-5 text-muted">
        Status pipeline adalah catatan operasional P3MI. Aplikasi tidak menggantikan kewajiban
        pelaporan ke sistem pemerintah atau kewenangan P3MI atas proses penempatan.
        {branch !== 'active' ? (
          <span className="ml-1">
            {branch === 'inactive'
              ? `Termasuk status ${Object.values(BRANCH_META).map((b) => b.label).join(', ')}.`
              : ''}
          </span>
        ) : null}
      </p>
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'focus-ring flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-2.5 py-1.5 text-[10px] font-bold text-white'
          : 'focus-ring flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100'
      }
    >
      {label}
      <span
        className={
          active
            ? 'rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold'
            : 'rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600'
        }
      >
        {count}
      </span>
    </button>
  )
}
