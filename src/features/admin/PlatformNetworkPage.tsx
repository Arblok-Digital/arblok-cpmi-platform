import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  Building2,
  Clock3,
  Network,
  SearchX,
  Users,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { formatDate } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { SearchInput } from '@/components/shared/misc'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/misc'

export function PlatformNetworkPage() {
  const { state, account } = useSession()
  const [query, setQuery] = useState('')
  const [orgFilter, setOrgFilter] = useState('all')

  if (!account || account.role !== 'arblok_admin') return null
  const agents = useMemo(
    () =>
      state.agents
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [state.agents],
  )
  const filtered = agents.filter((agent) => {
    if (orgFilter !== 'all' && agent.orgId !== orgFilter) return false
    const term = query.trim().toLowerCase()
    if (!term) return true
    return `${agent.name} ${agent.code} ${agent.region}`.toLowerCase().includes(term)
  })

  const counts = {
    active: agents.filter((a) => a.status === 'active').length,
    pending: agents.filter((a) => a.status === 'pending').length,
    orgs: new Set(agents.map((a) => a.orgId)).size,
  }

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Platform administration"
        title="Jaringan agen"
        description="Pandangan agregat agen lintas tenant untuk pemantauan platform. Admin Arblok tidak mengubah data operasional P3MI dari halaman ini."
        meta={
          <Badge tone="brand" icon={<Network className="h-3 w-3" />}>
            {agents.length} agen terdaftar
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Agen aktif"
          value={counts.active}
          hint="Lintas tenant"
          icon={<BadgeCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Pending"
          value={counts.pending}
          hint="Menunggu verifikasi P3MI"
          icon={<Clock3 className="h-5 w-5" />}
          tone={counts.pending ? 'warning' : 'slate'}
        />
        <StatCard
          label="Organisasi"
          value={counts.orgs}
          hint="Tenant dengan agen"
          icon={<Building2 className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Kandidat terhubung"
          value={state.candidates.filter((c) => c.agentId).length}
          hint="Memiliki sumber agen"
          icon={<Users className="h-5 w-5" />}
          tone="accent"
        />
      </div>

      <Card className="mt-5">
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-bold text-ink">Daftar agen</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama, kode, wilayah…"
                className="sm:w-60"
                aria-label="Cari agen lintas tenant"
              />
              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                className="focus-ring h-10 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink"
                aria-label="Filter organisasi"
              >
                <option value="all">Semua organisasi</option>
                {state.organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.shortName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<SearchX className="h-5 w-5" />}
              title="Tidak ada agen"
              description="Ubah filter organisasi atau kata pencarian."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-2.5">Agen</th>
                    <th className="px-4 py-2.5">Organisasi</th>
                    <th className="px-4 py-2.5">Wilayah</th>
                    <th className="px-4 py-2.5">Kandidat</th>
                    <th className="px-4 py-2.5">Bergabung</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((agent) => {
                    const org = state.organizations.find((o) => o.id === agent.orgId)
                    const candidateCount = state.candidates.filter((c) => c.agentId === agent.id).length
                    return (
                      <tr key={agent.id} className="hover:bg-slate-50/70">
                        <td className="table-cell">
                          <p className="font-semibold text-ink">{agent.name}</p>
                          <p className="mt-0.5 text-[10px] text-muted">{agent.code}</p>
                        </td>
                        <td className="table-cell">
                          <Badge tone={org?.status === 'active' ? 'brand' : 'muted'}>{org?.shortName}</Badge>
                        </td>
                        <td className="table-cell text-slate-600">{agent.region}</td>
                        <td className="table-cell font-semibold text-slate-700">{candidateCount}</td>
                        <td className="table-cell text-[10px] text-muted">{formatDate(agent.joinedAt)}</td>
                        <td className="table-cell">
                          <Badge
                            tone={
                              agent.status === 'active'
                                ? 'success'
                                : agent.status === 'pending'
                                  ? 'warning'
                                  : 'muted'
                            }
                            dot
                          >
                            {agent.status === 'active'
                              ? 'Aktif'
                              : agent.status === 'pending'
                                ? 'Pending'
                                : 'Nonaktif'}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4">
        <InfoNote tone="info" title="Pemisahan kewenangan">
          Verifikasi dan aktivasi agen adalah kewenangan admin P3MI. Admin platform hanya memantau
          agregat dan menangani insiden lintas tenant sesuai prosedur.
        </InfoNote>
      </div>
    </div>
  )
}
