import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Network,
  SearchX,
  Users,
  Wallet,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { networkAgentIds, visibleCandidates, visibleLedger, visibleReferrals } from '@/lib/permissions'
import { formatCurrency, formatDate, formatRelative } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { SearchInput } from '@/components/shared/misc'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/button'
import { Avatar, EmptyState, Progress } from '@/components/ui/misc'

export function CoordinatorNetworkPage() {
  const { state, account } = useSession()
  const [query, setQuery] = useState('')

  if (!account) return null
  const ownAgent = state.agents.find((a) => a.id === account.agentId)
  const ids = networkAgentIds(state, account)
  const network = state.agents.filter((a) => ids.includes(a.id))
  const candidates = visibleCandidates(state, account)
  const referrals = visibleReferrals(state, account)
  const ledger = visibleLedger(state, account)

  const metrics = network.map((agent) => {
    const agentCandidates = candidates.filter((c) => c.agentId === agent.id)
    const agentReferrals = referrals.filter((r) => r.agentId === agent.id)
    const accepted = agentReferrals.filter((r) => r.status === 'accepted').length
    const agentLedger = ledger.filter((l) => l.agentId === agent.id)
    const paid = agentLedger.reduce((sum, l) => sum + l.paidAmount, 0)
    const outstanding = agentLedger
      .filter((l) => ['earned', 'approved', 'due', 'partially_paid'].includes(l.status))
      .reduce((sum, l) => sum + (l.amount - l.paidAmount), 0)
    return { agent, candidateCount: agentCandidates.length, referrals: agentReferrals.length, accepted, paid, outstanding, lastActivity: agentCandidates[0]?.lastActivityAt }
  })

  const totals = {
    candidates: candidates.length,
    accepted: referrals.filter((r) => r.status === 'accepted').length,
    paid: ledger.reduce((sum, l) => sum + l.paidAmount, 0),
    outstanding: metrics.reduce((sum, m) => sum + m.outstanding, 0),
  }

  const filtered = metrics.filter(({ agent }) => {
    const term = query.trim().toLowerCase()
    if (!term) return true
    return `${agent.name} ${agent.code} ${agent.region}`.toLowerCase().includes(term)
  })

  const maxCandidates = Math.max(1, ...metrics.map((m) => m.candidateCount))

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Koordinasi"
        title="Jaringan saya"
        description="Pantau agen di bawah koordinasi Anda. Anda membantu kelancaran referral, tetapi keputusan pipeline dan komisi tetap di P3MI."
        meta={
          <>
            <Badge tone="brand" icon={<Network className="h-3 w-3" />}>
              {network.length} agen terhubung
            </Badge>
            {ownAgent ? <Badge tone="muted">{ownAgent.code}</Badge> : null}
          </>
        }
        actions={
          <LinkButton
            to="/agen/kandidat"
            variant="secondary"
            icon={<Users className="h-4 w-4" />}
          >
            Kandidat jaringan
          </LinkButton>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Agen jaringan"
          value={network.length}
          hint={`${network.filter((a) => a.status === 'active').length} aktif`}
          icon={<Network className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Kandidat"
          value={totals.candidates}
          hint={`${totals.accepted} referral diterima P3MI`}
          icon={<Users className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label="Komisi dibayar"
          value={formatCurrency(totals.paid)}
          hint="Agregat jaringan"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(totals.outstanding)}
          hint="Menunggu pembayaran P3MI"
          icon={<Wallet className="h-5 w-5" />}
          tone="warning"
        />
      </div>

      {ownAgent ? (
        <Card className="mt-5 overflow-hidden">
          <CardContent className="flex flex-col gap-3 bg-radial-brand text-white sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Avatar name={account.name} size="lg" className="ring-2 ring-white/20" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">
                  Koordinator
                </p>
                <p className="mt-0.5 text-sm font-bold">{ownAgent.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-white/60">
                  <span>{ownAgent.code}</span>
                  <span className="text-white/30">·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {ownAgent.region}
                  </span>
                  <span className="text-white/30">·</span>
                  <span>bergabung {formatDate(ownAgent.joinedAt)}</span>
                </p>
              </div>
            </div>
            <Badge tone={ownAgent.status === 'active' ? 'success' : 'warning'}>
              {ownAgent.status === 'active' ? 'Kemitraan aktif' : 'Perlu verifikasi'}
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-5">
        <CardHeader
          title="Agen dalam jaringan"
          description="Kinerja dihitung dari kandidat dan referral yang tercatat pada tenant pilot."
          icon={<Network className="h-4 w-4" />}
          action={
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari agen…"
              className="w-44 sm:w-56"
              aria-label="Cari agen jaringan"
            />
          }
        />
        <CardContent className="space-y-2.5">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<SearchX className="h-5 w-5" />}
              title="Belum ada agen"
              description="Agen yang ditautkan koordinator akan muncul di sini."
            />
          ) : (
            filtered.map(({ agent, candidateCount, referrals: refCount, accepted, paid, outstanding, lastActivity }) => (
              <div key={agent.id} className="rounded-xl border border-line p-3.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar name={agent.name} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold text-ink">{agent.name}</p>
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
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {agent.code} · {agent.region} · perjanjian s.d. {formatDate(agent.agreementValidUntil)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        Aktivitas terakhir {lastActivity ? formatRelative(lastActivity) : 'belum ada'}
                      </p>
                      <div className="mt-2 max-w-xs">
                        <div className="mb-1 flex justify-between text-[9px] text-muted">
                          <span>Kandidat</span>
                          <span>{candidateCount}</span>
                        </div>
                        <Progress
                          value={Math.round((candidateCount / maxCandidates) * 100)}
                          tone={agent.status === 'active' ? 'brand' : 'warning'}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid shrink-0 grid-cols-3 gap-2 text-center sm:w-56">
                    <div className="rounded-lg bg-slate-50 py-1.5">
                      <p className="text-xs font-extrabold text-ink">{refCount}</p>
                      <p className="text-[8px] uppercase tracking-wider text-muted">Referral</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 py-1.5">
                      <p className="text-xs font-extrabold text-emerald-700">{accepted}</p>
                      <p className="text-[8px] uppercase tracking-wider text-muted">Diterima</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 py-1.5">
                      <p className="text-xs font-extrabold text-amber-700">{formatCurrency(outstanding)}</p>
                      <p className="text-[8px] uppercase tracking-wider text-muted">Outstanding</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                  <p className="text-[9px] text-muted">
                    {formatCurrency(paid)} komisi sudah dibayar
                  </p>
                  <Link
                    to="/agen/kandidat"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-brand hover:underline"
                  >
                    Lihat kandidat <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoNote tone="info" title="Peran koordinator">
          Koordinator dapat membantu agen menyiapkan referral dan memantau kandidat. Koordinator
          tidak dapat mengubah status P3MI, menyetujui dokumen, atau mencatat pembayaran.
        </InfoNote>
        <InfoNote tone="warning" title="Atribusi referral">
          Kandidat tetap teratribusi kepada agen yang pertama mencatat referral yang diterima. Jangan
          membuat referral duplikat untuk memindahkan atribusi.
        </InfoNote>
      </div>
    </div>
  )
}
