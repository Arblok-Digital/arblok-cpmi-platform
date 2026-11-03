import { useMemo, useState } from 'react'
import {
  Activity,
  Building2,
  Download,
  Eye,
  FileWarning,
  LockKeyhole,
  SearchX,
  ShieldCheck,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { formatDateTime, formatRelative } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { SearchInput } from '@/components/shared/misc'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/misc'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'

type Tab = 'audit' | 'access'

function downloadCsv(name: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export function AuditPage() {
  const { state, account } = useSession()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('audit')
  const [query, setQuery] = useState('')
  const [orgFilter, setOrgFilter] = useState('all')

  if (!account || account.role !== 'arblok_admin') return null

  const audit = useMemo(
    () =>
      state.auditEvents
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.auditEvents],
  )
  const access = useMemo(
    () =>
      state.accessEvents
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.accessEvents],
  )

  const matchTerm = (text: string) => text.toLowerCase().includes(query.trim().toLowerCase())
  const filteredAudit = audit.filter((event) => {
    if (orgFilter !== 'all' && event.orgId !== orgFilter) return false
    return (
      !query.trim() ||
      matchTerm(
        `${event.action} ${event.actorName} ${event.entityType} ${event.entityLabel} ${event.entityId}`,
      )
    )
  })
  const filteredAccess = access.filter((event) => {
    if (orgFilter !== 'all' && event.orgId !== orgFilter) return false
    return (
      !query.trim() ||
      matchTerm(`${event.actorName} ${event.action} ${event.reason} ${event.candidateId}`)
    )
  })

  const sensitive = audit.filter((e) =>
    /(document|consent|commission|payment|referral\.(accepted|rejected|disputed))/.test(e.action),
  )

  const exportAudit = () => {
    downloadCsv('arblok-audit.csv', [
      ['Waktu', 'Organisasi', 'Aktor', 'Aksi', 'Entitas', 'Label', 'Metadata'],
      ...filteredAudit.map((e) => [
        e.createdAt,
        state.organizations.find((o) => o.id === e.orgId)?.shortName ?? e.orgId,
        e.actorName,
        e.action,
        e.entityType,
        e.entityLabel,
        e.metadata ? JSON.stringify(e.metadata) : '',
      ]),
    ])
    toast.success('Audit diekspor', `${filteredAudit.length} baris diunduh sebagai CSV.`)
  }

  const exportAccess = () => {
    downloadCsv('arblok-akses-dokumen.csv', [
      ['Waktu', 'Organisasi', 'Aktor', 'Aksi', 'Kandidat', 'Dokumen', 'Alasan'],
      ...filteredAccess.map((e) => [
        e.createdAt,
        state.organizations.find((o) => o.id === e.orgId)?.shortName ?? e.orgId,
        e.actorName,
        e.action,
        e.candidateId,
        e.documentId,
        e.reason,
      ]),
    ])
    toast.success('Log akses diekspor', `${filteredAccess.length} baris diunduh sebagai CSV.`)
  }

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Keamanan platform"
        title="Audit & keamanan"
        description="Jejak aktivitas lintas tenant dan log akses dokumen pribadi. Log akses tidak dapat diedit dari UI demo."
        meta={
          <Badge tone="success" icon={<ShieldCheck className="h-3 w-3" />}>
            Audit trail aktif
          </Badge>
        }
        actions={
          <Button
            variant="secondary"
            icon={<Download className="h-4 w-4" />}
            onClick={tab === 'audit' ? exportAudit : exportAccess}
          >
            Ekspor CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Event audit"
          value={audit.length}
          hint="Seluruh tenant"
          icon={<Activity className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Aksi sensitif"
          value={sensitive.length}
          hint="Dokumen, consent, fee, referral"
          icon={<FileWarning className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Akses dokumen"
          value={access.length}
          hint="Dengan alasan tercatat"
          icon={<LockKeyhole className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label="Tenant terpantau"
          value={state.organizations.length}
          hint="RLS-ready"
          icon={<Building2 className="h-5 w-5" />}
          tone="success"
        />
      </div>

      <Card className="mt-5">
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              tabs={[
                { id: 'audit', label: 'Audit aktivitas', count: audit.length },
                { id: 'access', label: 'Akses dokumen', count: access.length },
              ]}
              value={tab}
              onChange={setTab}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === 'audit' ? 'Cari aktor, aksi, entitas…' : 'Cari aktor, alasan…'}
                className="sm:w-64"
                aria-label="Cari log"
              />
              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                className="focus-ring h-10 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink"
                aria-label="Filter organisasi"
              >
                <option value="all">Semua tenant</option>
                {state.organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.shortName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {tab === 'audit' ? (
            filteredAudit.length === 0 ? (
              <EmptyState
                icon={<SearchX className="h-5 w-5" />}
                title="Tidak ada event"
                description="Ubah filter atau kata pencarian."
              />
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {filteredAudit.slice(0, 80).map((event) => (
                  <li key={event.id} className="px-3.5 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-ink">
                          {event.action.replace(/\./g, ' · ')}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {event.actorName} · {event.entityType} · {event.entityLabel}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-muted">{formatDateTime(event.createdAt)}</p>
                        <p className="text-[9px] text-slate-400">
                          {state.organizations.find((o) => o.id === event.orgId)?.shortName ?? event.orgId}
                        </p>
                      </div>
                    </div>
                    {event.metadata ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {Object.entries(event.metadata).map(([key, value]) => (
                          <span
                            key={key}
                            className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600"
                          >
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )
          ) : filteredAccess.length === 0 ? (
            <EmptyState
              icon={<Eye className="h-5 w-5" />}
              title="Belum ada akses dokumen"
              description="Setiap pratinjau atau unduhan dokumen akan tercatat di sini beserta alasannya."
            />
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {filteredAccess.slice(0, 80).map((event) => {
                const candidate = state.candidates.find((c) => c.id === event.candidateId)
                const doc = state.documents.find((d) => d.id === event.documentId)
                return (
                  <li key={event.id} className="px-3.5 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-ink">
                          {event.actorName}{' '}
                          <span className="font-medium text-muted">
                            {event.action === 'download' ? 'mengunduh' : 'melihat'}
                          </span>{' '}
                          dokumen
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {candidate?.fullName ?? event.candidateId} · {doc?.documentType ?? event.documentId}
                        </p>
                        <p className="mt-1 rounded-lg bg-slate-50 px-2 py-1.5 text-[10px] leading-4 text-slate-600">
                          Alasan: {event.reason}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge tone={event.action === 'download' ? 'warning' : 'info'}>
                          {event.action === 'download' ? 'Unduh' : 'Lihat'}
                        </Badge>
                        <p className="mt-1 text-[9px] text-muted">{formatRelative(event.createdAt)}</p>
                        <p className="text-[9px] text-slate-400">
                          {state.organizations.find((o) => o.id === event.orgId)?.shortName ?? event.orgId}
                        </p>
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
        <InfoNote tone="warning" title="Retensi dan investigasi">
          Log audit pada demo tersimpan di perangkat ini. Pada produksi, log harus append-only,
          disimpan terpisah dari data operasional, dan dipertahankan sesuai kebijakan retensi serta
          kebutuhan investigasi.
        </InfoNote>
      </div>
    </div>
  )
}
