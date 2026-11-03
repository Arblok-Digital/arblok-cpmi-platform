import { useMemo, useState } from 'react'
import {
  BarChart3,
  Building2,
  Download,
  FileCheck2,
  HandCoins,
  MessageSquareWarning,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { activeCandidates, groupCounts } from '@/lib/insights'
import { visibleCandidates, visibleComplaints, visibleLedger, visibleReferrals } from '@/lib/permissions'
import { COMPLAINT_CATEGORY, DOC_TYPES, STATUS_META } from '@/lib/constants'
import { formatCurrency, percent } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/misc'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'

type Tab = 'pipeline' | 'agen' | 'komisi' | 'layanan'

export function ReportsPage() {
  const { state, account } = useSession()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('pipeline')

  if (!account) return null
  const candidates = visibleCandidates(state, account)
  const referrals = visibleReferrals(state, account)
  const ledger = visibleLedger(state, account)
  const complaints = visibleComplaints(state, account)
  const active = activeCandidates(candidates)
  const groups = groupCounts(active)

  const accepted = referrals.filter((r) => r.status === 'accepted').length
  const rejected = referrals.filter((r) => r.status === 'rejected').length
  const submitted = referrals.filter((r) => r.status === 'submitted').length
  const conversion = percent(accepted, Math.max(1, accepted + rejected))

  const agentRows = useMemo(() => {
    return state.agents
      .filter((a) => a.orgId === account.orgId)
      .map((agent) => {
        const agentCandidates = candidates.filter((c) => c.agentId === agent.id)
        const agentReferrals = referrals.filter((r) => r.agentId === agent.id)
        const agentLedger = ledger.filter((l) => l.agentId === agent.id)
        return {
          agent,
          candidates: agentCandidates.length,
          referrals: agentReferrals.length,
          accepted: agentReferrals.filter((r) => r.status === 'accepted').length,
          earned: agentLedger.reduce((sum, l) => sum + l.amount, 0),
          paid: agentLedger.reduce((sum, l) => sum + l.paidAmount, 0),
        }
      })
      .sort((a, b) => b.accepted - a.accepted || b.candidates - a.candidates)
  }, [state.agents, account.orgId, candidates, referrals, ledger])

  const totalEarned = ledger.reduce((sum, l) => sum + l.amount, 0)
  const totalPaid = ledger.reduce((sum, l) => sum + l.paidAmount, 0)
  const outstanding = ledger
    .filter((l) => ['earned', 'approved', 'due', 'partially_paid'].includes(l.status))
    .reduce((sum, l) => sum + (l.amount - l.paidAmount), 0)

  const docs = state.documents.filter((d) => d.orgId === account.orgId)
  const docApproved = docs.filter((d) => d.status === 'approved').length
  const docPending = docs.filter((d) => d.status === 'pending_review').length

  const complaintCats = Object.keys(COMPLAINT_CATEGORY).map((cat) => ({
    cat,
    label: COMPLAINT_CATEGORY[cat],
    count: complaints.filter((c) => c.category === cat).length,
  }))
  const openComplaints = complaints.filter((c) => c.status === 'open' || c.status === 'in_progress')

  const exportPipeline = () => {
    const rows = [
      ['Kode', 'Nama', 'Status', 'Cabang', 'Agen', 'Wilayah', 'Aktivitas terakhir'],
      ...candidates.map((c) => [
        c.candidateCode,
        c.fullName,
        STATUS_META[c.status].label,
        c.branchStatus ?? '',
        state.agents.find((a) => a.id === c.agentId)?.name ?? '',
        c.region,
        c.lastActivityAt,
      ]),
    ]
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'arblok-laporan-pipeline.csv'
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Laporan diekspor', `${candidates.length} kandidat diunduh sebagai CSV.`)
  }

  const groupMax = Math.max(1, ...groups.map((g) => g.value))

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Analitik operasional"
        title="Laporan"
        description="Ringkasan pipeline, performa agen, fee, dan layanan. Angka berasal dari data sintetis demo."
        meta={<Badge tone="warning">Snapshot demo</Badge>}
        actions={
          <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportPipeline}>
            Ekspor kandidat
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Kandidat aktif"
          value={active.length}
          hint={`${candidates.length} total terdaftar`}
          icon={<Users className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Konversi referral"
          value={`${conversion}%`}
          hint={`${accepted} diterima · ${rejected} ditolak`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="success"
          progress={conversion}
        />
        <StatCard
          label="Fee outstanding"
          value={formatCurrency(outstanding)}
          hint={`${formatCurrency(totalPaid)} sudah dibayar`}
          icon={<HandCoins className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label="Pengaduan terbuka"
          value={openComplaints.length}
          hint={`${complaints.length} total riwayat`}
          icon={<MessageSquareWarning className="h-5 w-5" />}
          tone={openComplaints.length ? 'warning' : 'success'}
        />
      </div>

      <Card className="mt-5">
        <CardContent className="space-y-3">
          <Tabs
            tabs={[
              { id: 'pipeline', label: 'Pipeline' },
              { id: 'agen', label: 'Agen' },
              { id: 'komisi', label: 'Komisi' },
              { id: 'layanan', label: 'Layanan' },
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === 'pipeline' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-[11px] font-bold text-ink">Sebaran tahap aktif</p>
                <div className="space-y-3">
                  {groups.map((group) => (
                    <div key={group.id}>
                      <div className="mb-1 flex items-center justify-between text-[10px]">
                        <span className="text-slate-600">{group.label}</span>
                        <span className="font-bold text-ink">{group.value}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${Math.round((group.value / groupMax) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-line bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-ink">Kualitas konversi</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-muted">
                    {submitted} referral masih menunggu respons. Angka konversi hanya menghitung
                    keputusan final (diterima vs ditolak).
                  </p>
                </div>
              </div>
              <div>
                <p className="mb-3 text-[11px] font-bold text-ink">Dokumen</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-line p-3">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted">
                      <FileCheck2 className="h-3 w-3" /> Disetujui
                    </div>
                    <p className="mt-1 text-lg font-extrabold text-emerald-700">{docApproved}</p>
                  </div>
                  <div className="rounded-xl border border-line p-3">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted">
                      <FileCheck2 className="h-3 w-3" /> Menunggu
                    </div>
                    <p className="mt-1 text-lg font-extrabold text-amber-700">{docPending}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {DOC_TYPES.filter((d) => d.required).map((type) => {
                    const typeDocs = docs.filter((d) => d.documentType === type.id)
                    const approved = typeDocs.filter((d) => d.status === 'approved').length
                    return (
                      <div key={type.id} className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-600">{type.label}</span>
                        <Badge tone={approved ? 'success' : 'warning'}>
                          {approved} / {typeDocs.length}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : tab === 'agen' ? (
            <div className="space-y-2.5">
              {agentRows.map((row, index) => (
                <div key={row.agent.id} className="rounded-xl border border-line p-3.5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-[10px] font-extrabold text-brand">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-ink">{row.agent.name}</p>
                        <p className="text-[10px] text-muted">
                          {row.agent.code} · {row.agent.region}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center sm:w-80">
                      <div>
                        <p className="text-xs font-extrabold text-ink">{row.candidates}</p>
                        <p className="text-[8px] uppercase tracking-wider text-muted">Kandidat</p>
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-ink">{row.referrals}</p>
                        <p className="text-[8px] uppercase tracking-wider text-muted">Referral</p>
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-emerald-700">{row.accepted}</p>
                        <p className="text-[8px] uppercase tracking-wider text-muted">Diterima</p>
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-brand">{formatCurrency(row.earned)}</p>
                        <p className="text-[8px] uppercase tracking-wider text-muted">Hak tagih</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Progress
                      value={percent(row.paid, Math.max(1, row.earned))}
                      tone="success"
                      label="Komisi dibayar"
                    />
                    <p className="mt-1 text-[9px] text-muted">
                      {formatCurrency(row.paid)} dari {formatCurrency(row.earned)} dibayar
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : tab === 'komisi' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-ink">Ringkasan fee</p>
                {[
                  { label: 'Total hak tagih', value: formatCurrency(totalEarned) },
                  { label: 'Sudah dibayar', value: formatCurrency(totalPaid) },
                  { label: 'Outstanding', value: formatCurrency(outstanding) },
                  { label: 'Rasio pembayaran', value: `${percent(totalPaid, Math.max(1, totalEarned))}%` },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5"
                  >
                    <span className="text-[10px] text-muted">{row.label}</span>
                    <span className="text-[11px] font-bold text-ink">{row.value}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-2 text-[11px] font-bold text-ink">Per status hak tagih</p>
                <div className="space-y-2">
                  {['earned', 'approved', 'partially_paid', 'paid'].map((status) => {
                    const rows = ledger.filter((l) => l.status === status)
                    return (
                      <div key={status} className="flex items-center justify-between gap-2">
                        <span className="text-[10px] capitalize text-slate-600">
                          {status.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted">{rows.length} entri</span>
                          <span className="text-[10px] font-bold text-ink">
                            {formatCurrency(rows.reduce((s, l) => s + l.amount, 0))}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-[11px] font-bold text-ink">Kategori pengaduan</p>
                <div className="space-y-2">
                  {complaintCats.map((row) => (
                    <div key={row.cat} className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-600">{row.label}</span>
                      <span className="text-[10px] font-bold text-ink">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-bold text-ink">Status penanganan</p>
                <div className="space-y-2">
                  {['open', 'in_progress', 'resolved', 'closed'].map((status) => (
                    <div key={status} className="flex items-center justify-between gap-2">
                      <span className="text-[10px] capitalize text-slate-600">
                        {status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-bold text-ink">
                        {complaints.filter((c) => c.status === status).length}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl border border-line bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-ink">SLA usulan</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-muted">
                    Respons awal 1×24 jam kerja, tindak lanjut 5 hari kerja. Angka pada demo belum
                    mengukur waktu respons sebenarnya.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoNote tone="warning" title="Definisi metrik">
          Satu kandidat dapat memiliki beberapa entri fee dari milestone berbeda. Konversi referral
          tidak sama dengan tingkat keberangkatan.
        </InfoNote>
        <InfoNote tone="info" title="Ekspor berisi data sintetis">
          CSV hanya berisi data demo perangkat ini. Jangan menganggapnya sebagai laporan resmi atau
          menggunakannya untuk keputusan penempatan nyata.
        </InfoNote>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[10px] text-muted">
        <Building2 className="h-3 w-3" />
        Tenant: {state.organizations.find((o) => o.id === account.orgId)?.legalName ?? '—'}
        <span className="text-slate-300">·</span>
        <BarChart3 className="h-3 w-3" /> Data diperbarui otomatis dari store demo
      </div>
    </div>
  )
}
