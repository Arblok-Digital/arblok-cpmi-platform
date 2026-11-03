import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileWarning,
  Inbox,
  SearchX,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { isP3miRole } from '@/lib/permissions'
import { formatDate, formatRelative, percent } from '@/lib/format'
import { REFERRAL_META, STATUS_META } from '@/lib/constants'
import type { ReferralStatus } from '@/lib/types'
import { PageHeader, InfoNote } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { SearchInput } from '@/components/shared/misc'
import { ReferralBadge, ConsentBadge } from '@/components/shared/status'
import { EmptyState } from '@/components/ui/misc'
import { Select } from '@/components/ui/form'

type Filter = 'submitted' | 'accepted' | 'rejected' | 'disputed' | 'all'

export function ReferralInboxPage() {
  const { state, account } = useSession()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('submitted')
  const [query, setQuery] = useState('')
  const [agentId, setAgentId] = useState('all')

  if (!account || !isP3miRole(account.role)) return null
  const orgReferrals = state.referrals.filter((r) => r.orgId === account.orgId)
  const agents = state.agents.filter((a) => a.orgId === account.orgId)

  const rows = useMemo(() => {
    return orgReferrals
      .filter((r) => (filter === 'all' ? true : r.status === filter))
      .filter((r) => (agentId === 'all' ? true : r.agentId === agentId))
      .filter((r) => {
        if (!query.trim()) return true
        const candidate = state.candidates.find((c) => c.id === r.candidateId)
        const agent = state.agents.find((a) => a.id === r.agentId)
        const q = query.toLowerCase()
        return [candidate?.fullName, candidate?.candidateCode, r.code, agent?.name]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(q))
      })
      .sort(
        (a, b) =>
          new Date(b.submittedAt ?? b.decidedAt ?? 0).getTime() -
          new Date(a.submittedAt ?? a.decidedAt ?? 0).getTime(),
      )
  }, [orgReferrals, filter, agentId, query, state.candidates, state.agents])

  const counts = {
    submitted: orgReferrals.filter((r) => r.status === 'submitted').length,
    accepted: orgReferrals.filter((r) => r.status === 'accepted').length,
    rejected: orgReferrals.filter((r) => r.status === 'rejected').length,
    disputed: orgReferrals.filter((r) => r.status === 'disputed').length,
  }
  const decided = counts.accepted + counts.rejected + counts.disputed
  const duplicateCount = orgReferrals.filter((r) => r.duplicateWarning).length

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Referral CRM"
        title="Referral masuk"
        description="Tinjau sumber referral, consent, dan kemungkinan duplikat. Keputusan P3MI dicatat sebagai event dan tidak menghapus riwayat."
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted">
            <ShieldCheck className="h-3 w-3" /> Hanya referral tenant ini
          </span>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Menunggu respons"
          value={counts.submitted}
          hint="Perlu ditinjau P3MI"
          icon={<Inbox className="h-5 w-5" />}
          tone={counts.submitted ? 'warning' : 'success'}
        />
        <StatCard
          label="Diterima"
          value={counts.accepted}
          hint={`${percent(counts.accepted, decided)}% dari keputusan`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Peringatan duplikat"
          value={duplicateCount}
          hint="Perlu telaah manual"
          icon={<FileWarning className="h-5 w-5" />}
          tone={duplicateCount ? 'danger' : 'success'}
        />
        <StatCard
          label="Rata-rata keputusan"
          value="—"
          hint="Diukur setelah pilot berjalan"
          icon={<Clock3 className="h-5 w-5" />}
          tone="slate"
        />
      </section>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <Tabs<Filter>
            tabs={[
              { id: 'submitted', label: 'Menunggu', count: counts.submitted },
              { id: 'accepted', label: 'Diterima', count: counts.accepted },
              { id: 'rejected', label: 'Ditolak', count: counts.rejected },
              { id: 'disputed', label: 'Dispute', count: counts.disputed },
              { id: 'all', label: 'Semua', count: orgReferrals.length },
            ]}
            value={filter}
            onChange={setFilter}
            data-testid="referral-filter-tabs"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput
              placeholder="Cari nama, kode, agen…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="sm:w-56"
              aria-label="Cari referral"
            />
            <Select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="h-10 sm:w-44"
              aria-label="Filter agen"
            >
              <option value="all">Semua agen</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<SearchX className="h-5 w-5" />}
                title="Tidak ada referral pada filter ini"
                description="Ubah filter atau kata pencarian. Referral baru akan muncul di sini."
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((referral) => {
                const candidate = state.candidates.find((c) => c.id === referral.candidateId)
                const agent = state.agents.find((a) => a.id === referral.agentId)
                const vacancy = state.vacancies.find((v) => v.id === referral.vacancyId)
                const consent = state.consents.find(
                  (c) => c.candidateId === referral.candidateId && c.consentType === 'data_sharing',
                )
                return (
                  <li key={referral.id} data-testid={`referral-row-${referral.id}`}>
                    <div className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-slate-50/60 sm:px-5 lg:flex-row lg:items-center">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                          <UserRound className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Link
                              to={`/p3mi/referral/${referral.id}`}
                              className="text-xs font-bold text-ink hover:text-brand"
                            >
                              {candidate?.fullName ?? 'Kandidat'}
                            </Link>
                            {referral.duplicateWarning ? (
                              <Badge tone="danger" icon={<AlertTriangle className="h-3 w-3" />}>
                                Duplikat
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[10px] text-muted">
                            {candidate?.candidateCode} · {referral.code} ·{' '}
                            {agent?.name ?? 'Agen'} · {candidate?.region}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted">
                            {vacancy ? `${vacancy.title} — ${vacancy.country}` : 'Tanpa lowongan spesifik'} ·
                            masuk {formatRelative(referral.submittedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:w-[300px] lg:shrink-0 lg:justify-end">
                        <ConsentBadge revoked={Boolean(consent?.revokedAt)} missing={!consent} />
                        <ReferralBadge status={referral.status} />
                        {referral.status === 'submitted' ? (
                          <Link
                            to={`/p3mi/referral/${referral.id}`}
                            className="focus-ring inline-flex h-9 items-center gap-1 rounded-lg bg-brand px-3 text-[10px] font-bold text-white hover:bg-brand-mid"
                            data-testid={`referral-review-${referral.id}`}
                          >
                            Tinjau <ArrowRight className="h-3 w-3" />
                          </Link>
                        ) : (
                          <Link
                            to={`/p3mi/referral/${referral.id}`}
                            className="focus-ring inline-flex h-9 items-center gap-1 rounded-lg border border-line px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Detail <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                    {referral.status === 'rejected' && referral.rejectionReason ? (
                      <p className="mx-4 mb-3 rounded-lg bg-red-50 px-3 py-2 text-[10px] leading-4 text-red-800 sm:mx-5">
                        Alasan: {referral.rejectionReason}
                      </p>
                    ) : null}
                    {referral.status === 'accepted' ? (
                      <p className="mx-4 mb-3 flex items-center gap-1.5 text-[9px] text-emerald-700 sm:mx-5">
                        <ShieldCheck className="h-3 w-3" /> Sumber terkunci · diterima{' '}
                        {formatDate(referral.acceptedAt)}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-4">
        <InfoNote tone="info" title="Batas keputusan">
          Penerimaan referral mengunci atribusi secara operasional, tetapi tidak menciptakan
          kewenangan hukum atau menjamin pembayaran fee. Jangka waktu pengakuan dan aturan dispute
          harus tertulis dalam perjanjian.
        </InfoNote>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => navigate('/p3mi/kandidat')}
          className="text-[10px] font-bold text-brand hover:underline"
        >
          Lihat semua kandidat
        </button>
      </div>
    </div>
  )
}

export function statusLabel(status: ReferralStatus): string {
  return REFERRAL_META[status].label
}

export { STATUS_META }
