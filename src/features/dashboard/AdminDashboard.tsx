import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowUpRight,
  Building2,
  Database,
  HardDrive,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { formatDate, formatRelative, percent } from '@/lib/format'
import { PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/misc'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/button'

const orgTone = {
  active: 'success',
  onboarding: 'warning',
  suspended: 'danger',
} as const

export function AdminDashboard() {
  const { state, account } = useSession()
  if (!account) return null

  const orgs = state.organizations
  const activeOrgs = orgs.filter((o) => o.status === 'active').length
  const totalStorage = orgs.reduce((s, o) => s + o.quota.storageUsedMb, 0)
  const totalStorageLimit = orgs.reduce((s, o) => s + o.quota.storageLimitMb, 0)
  const totalDb = orgs.reduce((s, o) => s + o.quota.dbUsedMb, 0)
  const totalDbLimit = orgs.reduce((s, o) => s + o.quota.dbLimitMb, 0)
  const access = [...state.accessEvents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const audit = [...state.auditEvents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const onboarding = orgs.find((o) => o.status === 'onboarding')

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Platform administration"
        title="Ringkasan platform"
        description="Metrik agregat lintas tenant. Admin Arblok tidak membuka isi dokumen pribadi CPMI sebagai rutinitas; akses bantuan teknis harus memiliki alasan dan tercatat."
        actions={
          <LinkButton to="/platform/organisasi" variant="secondary" icon={<Building2 className="h-4 w-4" />}>
            Kelola organisasi
          </LinkButton>
        }
        meta={
          <>
            <Badge tone="warning" icon={<TriangleAlert className="h-3 w-3" />}>
              Mode demo — data sintetis
            </Badge>
            <Badge tone="success" icon={<ShieldCheck className="h-3 w-3" />}>
              RLS-ready
            </Badge>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Organisasi"
          value={orgs.length}
          hint={`${activeOrgs} aktif · ${orgs.length - activeOrgs} onboarding`}
          icon={<Building2 className="h-5 w-5" />}
          tone="brand"
          to="/platform/organisasi"
        />
        <StatCard
          label="Total kandidat"
          value={state.candidates.length}
          hint="Agregat lintas tenant"
          icon={<Users className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label="Storage terpakai"
          value={`${totalStorage} MB`}
          hint={`${percent(totalStorage, totalStorageLimit)}% dari ${totalStorageLimit} MB free tier`}
          icon={<HardDrive className="h-5 w-5" />}
          tone="warning"
          progress={percent(totalStorage, totalStorageLimit)}
        />
        <StatCard
          label="Database"
          value={`${totalDb} MB`}
          hint={`${percent(totalDb, totalDbLimit)}% dari ${totalDbLimit} MB free tier`}
          icon={<Database className="h-5 w-5" />}
          tone="success"
          progress={percent(totalDb, totalDbLimit)}
        />
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Organisasi P3MI"
              description="Status kerja sama dan kuota workspace."
              icon={<Building2 className="h-4 w-4" />}
              action={
                <Link to="/platform/organisasi" className="text-[10px] font-bold text-brand hover:underline">
                  Semua organisasi
                </Link>
              }
            />
            <CardContent className="space-y-2.5 pt-2">
              {orgs.map((org) => {
                const members = state.accounts.filter((a) => a.orgId === org.id).length
                const orgCandidates = state.candidates.filter((c) => c.orgId === org.id).length
                const orgReferrals = state.referrals.filter((r) => r.orgId === org.id).length
                return (
                  <div key={org.id} className="rounded-xl border border-line p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink">{org.legalName}</p>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {org.city}, {org.province} · bergabung {formatDate(org.joinedAt)}
                        </p>
                      </div>
                      <Badge tone={orgTone[org.status]} dot>
                        {org.status === 'active'
                          ? 'Aktif'
                          : org.status === 'onboarding'
                            ? 'Onboarding'
                            : 'Ditangguhkan'}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-slate-50 py-1.5">
                        <p className="text-xs font-extrabold text-ink">{members}</p>
                        <p className="text-[8px] uppercase tracking-wider text-muted">Anggota</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 py-1.5">
                        <p className="text-xs font-extrabold text-ink">{orgReferrals}</p>
                        <p className="text-[8px] uppercase tracking-wider text-muted">Referral</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 py-1.5">
                        <p className="text-xs font-extrabold text-ink">{orgCandidates}</p>
                        <p className="text-[8px] uppercase tracking-wider text-muted">Kandidat</p>
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <div className="mb-1 flex justify-between text-[9px] text-muted">
                        <span>Storage</span>
                        <span>
                          {org.quota.storageUsedMb} / {org.quota.storageLimitMb} MB
                        </span>
                      </div>
                      <Progress
                        value={percent(org.quota.storageUsedMb, org.quota.storageLimitMb)}
                        tone="brand"
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Audit aktivitas terbaru"
              description="Aksi kritis lintas tenant untuk pemantauan platform."
              icon={<Activity className="h-4 w-4" />}
              action={
                <Link to="/platform/audit" className="text-[10px] font-bold text-brand hover:underline">
                  Audit lengkap
                </Link>
              }
            />
            <CardContent className="pt-1">
              <ul className="divide-y divide-line">
                {audit.slice(0, 7).map((event) => (
                  <li key={event.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <Activity className="h-3 w-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-semibold text-slate-700">
                        {event.action.replace(/\./g, ' · ')}
                      </p>
                      <p className="truncate text-[9px] text-muted">
                        {event.actorName} · {event.entityLabel} · {formatRelative(event.createdAt)}
                      </p>
                    </div>
                    <ArrowUpRight className="h-3 w-3 shrink-0 text-slate-300" />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Kesiapan pilot"
              description="Gerbang sebelum data asli digunakan."
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <CardContent className="space-y-2.5 pt-2">
              {[
                { label: 'Frontend & PWA', done: true, detail: 'React + Vite + Tailwind' },
                { label: 'Skema & RLS draft', done: true, detail: 'Migrasi Supabase tersedia' },
                { label: 'Data sintetis', done: true, detail: 'Demo berjalan tanpa backend' },
                { label: 'Telaah privasi/UU PDP', done: false, detail: 'Wajib sebelum data asli' },
                { label: 'Perjanjian P3MI & agen', done: false, detail: 'Gerbang legal bisnis' },
                { label: 'Backup & restore drill', done: false, detail: 'Ekspor manual free tier' },
              ].map((row) => (
                <div key={row.label} className="flex items-start gap-2">
                  <span
                    className={
                      row.done
                        ? 'mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-700'
                        : 'mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[9px] text-slate-400'
                    }
                  >
                    {row.done ? '✓' : '·'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-700">{row.label}</p>
                    <p className="text-[9px] text-muted">{row.detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {onboarding ? (
            <Card>
              <CardHeader
                title="Onboarding berjalan"
                description={onboarding.legalName}
                icon={<Building2 className="h-4 w-4" />}
              />
              <CardContent className="pt-2">
                <div className="space-y-2 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Kontak</span>
                    <span className="font-semibold text-ink">{onboarding.contactEmail}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Anggota</span>
                    <span className="font-semibold text-ink">{onboarding.quota.members} akun</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Storage</span>
                    <span className="font-semibold text-ink">{onboarding.quota.storageUsedMb} MB</span>
                  </div>
                </div>
                <Link
                  to="/platform/organisasi"
                  className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-brand hover:underline"
                >
                  Lanjutkan konfigurasi <ArrowUpRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Akses dokumen"
              description="Catatan akses file pribadi."
              icon={<LockKeyhole className="h-4 w-4" />}
            />
            <CardContent className="space-y-2 pt-2">
              {access.slice(0, 4).map((event) => (
                <div key={event.id} className="rounded-lg border border-line px-2.5 py-2">
                  <p className="text-[10px] font-semibold text-slate-700">
                    {event.actorName} · {event.action}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[9px] leading-4 text-muted">{event.reason}</p>
                  <p className="mt-0.5 text-[8px] text-slate-400">{formatRelative(event.createdAt)}</p>
                </div>
              ))}
              <p className="pt-1 text-[9px] leading-4 text-muted">
                Admin Arblok tidak dapat membuka dokumen CPMI melalui UI platform. Akses teknis
                darurat memerlukan alasan, persetujuan, dan batas waktu.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
