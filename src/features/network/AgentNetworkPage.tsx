import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  Network,
  Phone,
  SearchX,
  Users,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { verifyAgent } from '@/lib/store'
import { can } from '@/lib/permissions'
import type { Agent } from '@/lib/types'
import { formatCurrency, formatDate, formatRelative } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { SearchInput } from '@/components/shared/misc'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/misc'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'

type Filter = 'active' | 'pending' | 'inactive' | 'all'

export function AgentNetworkPage() {
  const { state, account } = useSession()
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [target, setTarget] = useState<Agent | null>(null)
  const [busy, setBusy] = useState(false)

  if (!account) return null
  const canManage = can(account.role, 'manage.agents')
  const agents = useMemo(
    () =>
      state.agents
        .filter((a) => a.orgId === account.orgId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [state.agents, account.orgId],
  )

  const metrics = (agentId: string) => {
    const candidates = state.candidates.filter((c) => c.agentId === agentId)
    const referrals = state.referrals.filter((r) => r.agentId === agentId)
    const ledger = state.ledger.filter((l) => l.agentId === agentId)
    const paid = ledger.reduce((sum, l) => sum + l.paidAmount, 0)
    const accepted = referrals.filter((r) => r.status === 'accepted').length
    return { candidates, referrals, ledger, paid, accepted }
  }

  const counts = {
    active: agents.filter((a) => a.status === 'active').length,
    pending: agents.filter((a) => a.status === 'pending').length,
    inactive: agents.filter((a) => a.status === 'inactive').length,
  }

  const filtered = agents.filter((agent) => {
    if (filter !== 'all' && agent.status !== filter) return false
    const term = query.trim().toLowerCase()
    if (!term) return true
    return `${agent.name} ${agent.code} ${agent.region} ${agent.phone}`.toLowerCase().includes(term)
  })

  const changeStatus = (agent: Agent, status: 'active' | 'pending' | 'inactive') => {
    setBusy(true)
    const result = verifyAgent(agent.id, status)
    setBusy(false)
    if (!result.ok) {
      toast.error('Gagal memperbarui status', result.error)
      return
    }
    toast.success(
      'Status kemitraan diperbarui',
      `${agent.name} → ${status === 'active' ? 'aktif' : status === 'pending' ? 'pending' : 'nonaktif'}.`,
    )
    setTarget(null)
  }

  const targetMetrics = target ? metrics(target.id) : null
  const targetAgreement = target
    ? state.commissionAgreements.find((a) => a.agentId === target.id)
    : undefined

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Kemitraan"
        title="Agen & kemitraan"
        description="Kelola status agen, lihat performa referral, dan pastikan perjanjian aktif sebelum agen merekrut kandidat."
        meta={
          <Badge tone="brand" icon={<Building2 className="h-3 w-3" />}>
            {state.organizations.find((o) => o.id === account.orgId)?.shortName}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Agen aktif"
          value={counts.active}
          hint="Dapat membuat referral"
          icon={<BadgeCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Menunggu verifikasi"
          value={counts.pending}
          hint="Perlu pemeriksaan dokumen kemitraan"
          icon={<Clock3 className="h-5 w-5" />}
          tone={counts.pending ? 'warning' : 'slate'}
        />
        <StatCard
          label="Nonaktif"
          value={counts.inactive}
          hint="Tidak dapat referral baru"
          icon={<Users className="h-5 w-5" />}
          tone="slate"
        />
        <StatCard
          label="Total jaringan"
          value={agents.length}
          hint="Seluruh agen tenant"
          icon={<Network className="h-5 w-5" />}
          tone="brand"
        />
      </div>

      <Card className="mt-5">
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              tabs={[
                { id: 'all', label: 'Semua', count: agents.length },
                { id: 'active', label: 'Aktif', count: counts.active },
                { id: 'pending', label: 'Pending', count: counts.pending },
                { id: 'inactive', label: 'Nonaktif', count: counts.inactive },
              ]}
              value={filter}
              onChange={setFilter}
            />
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama, kode, wilayah…"
              className="sm:w-64"
              aria-label="Cari agen"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<SearchX className="h-5 w-5" />}
              title="Agen tidak ditemukan"
              description="Ubah filter atau kata pencarian."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[820px] border-collapse text-left text-xs">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-2.5">Agen</th>
                    <th className="px-4 py-2.5">Wilayah</th>
                    <th className="px-4 py-2.5">Kandidat</th>
                    <th className="px-4 py-2.5">Referral diterima</th>
                    <th className="px-4 py-2.5">Komisi dibayar</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((agent) => {
                    const m = metrics(agent.id)
                    const coordinator = state.agents.find((a) => a.id === agent.coordinatorId)
                    return (
                      <tr key={agent.id} className="hover:bg-slate-50/70">
                        <td className="table-cell">
                          <p className="font-semibold text-ink">{agent.name}</p>
                          <p className="mt-0.5 text-[10px] text-muted">
                            {agent.code} · {coordinator ? `di bawah ${coordinator.name}` : 'agen mandiri'}
                          </p>
                        </td>
                        <td className="table-cell text-slate-600">{agent.region}</td>
                        <td className="table-cell font-semibold text-slate-700">
                          {m.candidates.length}
                        </td>
                        <td className="table-cell">
                          <span className="font-semibold text-slate-700">{m.accepted}</span>
                          <span className="text-[10px] text-muted"> / {m.referrals.length}</span>
                        </td>
                        <td className="table-cell text-slate-600">{formatCurrency(m.paid)}</td>
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
                        <td className="table-cell text-right">
                          <Button size="sm" variant="secondary" onClick={() => setTarget(agent)}>
                            Detail
                          </Button>
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoNote tone="warning" title="Verifikasi sebelum aktivasi">
          Pastikan perjanjian kerja sama, identitas, dan rekening agen sudah diverifikasi. Agen pending
          tidak boleh diberikan akses referral baru.
        </InfoNote>
        <InfoNote tone="info" title="Atribusi terkunci setelah diterima">
          Perubahan status agen tidak memindahkan atribusi referral yang sudah diterima P3MI.
        </InfoNote>
      </div>

      <Dialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target?.name ?? 'Detail agen'}
        description={target ? `${target.code} · ${target.region}` : undefined}
        size="lg"
        footer={
          canManage && target ? (
            <>
              <Button variant="secondary" onClick={() => setTarget(null)}>
                Tutup
              </Button>
              {target.status !== 'active' ? (
                <Button
                  loading={busy}
                  variant="success"
                  onClick={() => changeStatus(target, 'active')}
                >
                  Aktifkan
                </Button>
              ) : null}
              {target.status !== 'pending' ? (
                <Button
                  loading={busy}
                  variant="secondary"
                  onClick={() => changeStatus(target, 'pending')}
                >
                  Set pending
                </Button>
              ) : null}
              {target.status !== 'inactive' ? (
                <Button
                  loading={busy}
                  variant="danger"
                  onClick={() => changeStatus(target, 'inactive')}
                >
                  Nonaktifkan
                </Button>
              ) : null}
            </>
          ) : (
            <Button variant="secondary" onClick={() => setTarget(null)}>
              Tutup
            </Button>
          )
        }
      >
        {target && targetMetrics ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-slate-50 p-2.5 text-center">
                <p className="text-base font-extrabold text-ink">{targetMetrics.candidates.length}</p>
                <p className="text-[9px] uppercase tracking-wider text-muted">Kandidat</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 text-center">
                <p className="text-base font-extrabold text-ink">{targetMetrics.accepted}</p>
                <p className="text-[9px] uppercase tracking-wider text-muted">Diterima</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 text-center">
                <p className="text-base font-extrabold text-emerald-700">
                  {formatCurrency(targetMetrics.paid)}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-muted">Dibayar</p>
              </div>
            </div>

            <dl className="divide-y divide-line rounded-xl border border-line px-3.5">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[11px] text-muted">Telepon</dt>
                <dd className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
                  <Phone className="h-3 w-3" /> {target.phone}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[11px] text-muted">Bergabung</dt>
                <dd className="text-[11px] font-semibold text-ink">{formatDate(target.joinedAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[11px] text-muted">Perjanjian</dt>
                <dd className="text-[11px] font-semibold text-ink">{target.agreementNumber}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[11px] text-muted">Berlaku sampai</dt>
                <dd className="text-[11px] font-semibold text-ink">
                  {formatDate(target.agreementValidUntil)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[11px] text-muted">Diperbarui</dt>
                <dd className="text-[11px] font-semibold text-ink">
                  {formatRelative(target.joinedAt)}
                </dd>
              </div>
            </dl>

            {targetAgreement ? (
              <div className="rounded-xl border border-line p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold text-ink">Skema komisi</p>
                  <Badge tone={targetAgreement.status === 'active' ? 'success' : 'muted'} dot>
                    {targetAgreement.status}
                  </Badge>
                </div>
                <p className="mt-1 text-[10px] leading-4 text-muted">
                  {targetAgreement.triggerDefinition}
                </p>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
                  {targetAgreement.milestones.map((m) => (
                    <div key={m.code} className="rounded-lg bg-slate-50 px-2 py-1.5">
                      <p className="text-[9px] text-muted">{m.label}</p>
                      <p className="text-[10px] font-bold text-brand">
                        {formatCurrency(m.amount, m.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <InfoNote tone="warning" title="Belum ada perjanjian komisi">
                Lengkapi perjanjian sebelum agen aktif merekrut kandidat.
              </InfoNote>
            )}

            {target.note ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-900">
                Catatan: {target.note}
              </p>
            ) : null}

            <div>
              <p className="mb-2 text-[11px] font-bold text-ink">Kandidat terbaru</p>
              {targetMetrics.candidates.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[10px] text-muted">
                  Belum ada kandidat.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {targetMetrics.candidates.slice(0, 4).map((candidate) => (
                    <li key={candidate.id}>
                      <Link
                        to={`/p3mi/kandidat/${candidate.id}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-2 hover:bg-slate-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-semibold text-ink">
                            {candidate.fullName}
                          </span>
                          <span className="text-[9px] text-muted">{candidate.candidateCode}</span>
                        </span>
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
