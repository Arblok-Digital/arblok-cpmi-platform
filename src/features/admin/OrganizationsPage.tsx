import { useState } from 'react'
import {
  Building2,
  CheckCircle2,
  Clock3,
  Copy,
  Database,
  HardDrive,
  Mail,
  MapPin,
  ShieldOff,
  Users,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { setOrgStatus } from '@/lib/store'
import type { Organization } from '@/lib/types'
import { formatDate, percent } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Select } from '@/components/ui/form'
import { Progress } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const orgTone = {
  active: 'success',
  onboarding: 'warning',
  suspended: 'danger',
} as const

const statusLabel = {
  active: 'Aktif',
  onboarding: 'Onboarding',
  suspended: 'Ditangguhkan',
}

export function OrganizationsPage() {
  const { state, account } = useSession()
  const toast = useToast()
  const [target, setTarget] = useState<Organization | null>(null)
  const [nextStatus, setNextStatus] = useState<Organization['status']>('active')
  const [busy, setBusy] = useState(false)

  if (!account || account.role !== 'arblok_admin') return null
  const orgs = state.organizations
  const counts = {
    active: orgs.filter((o) => o.status === 'active').length,
    onboarding: orgs.filter((o) => o.status === 'onboarding').length,
    suspended: orgs.filter((o) => o.status === 'suspended').length,
  }

  const open = (org: Organization) => {
    setTarget(org)
    setNextStatus(org.status)
  }

  const submit = () => {
    if (!target) return
    setBusy(true)
    const result = setOrgStatus(target.id, nextStatus)
    setBusy(false)
    if (!result.ok) {
      toast.error('Gagal mengubah status', result.error)
      return
    }
    toast.success('Status organisasi diperbarui', `${target.shortName} → ${statusLabel[nextStatus]}.`)
    setTarget(null)
  }

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Platform administration"
        title="Organisasi P3MI"
        description="Kelola tenant P3MI, kuota workspace, dan status kerja sama. Admin platform tidak membuka dokumen pribadi CPMI."
        meta={
          <Badge tone="brand" icon={<Building2 className="h-3 w-3" />}>
            {orgs.length} tenant
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Aktif"
          value={counts.active}
          hint="Dapat beroperasi penuh"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Onboarding"
          value={counts.onboarding}
          hint="Belum produksi"
          icon={<Clock3 className="h-5 w-5" />}
          tone={counts.onboarding ? 'warning' : 'slate'}
        />
        <StatCard
          label="Ditangguhkan"
          value={counts.suspended}
          hint="Akses operasional dibatasi"
          icon={<ShieldOff className="h-5 w-5" />}
          tone={counts.suspended ? 'danger' : 'slate'}
        />
        <StatCard
          label="Total anggota"
          value={orgs.reduce((sum, org) => sum + state.accounts.filter((a) => a.orgId === org.id).length, 0)}
          hint="Akun lintas tenant"
          icon={<Users className="h-5 w-5" />}
          tone="brand"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {orgs.map((org) => {
          const members = state.accounts.filter((a) => a.orgId === org.id)
          const candidates = state.candidates.filter((c) => c.orgId === org.id)
          const referrals = state.referrals.filter((r) => r.orgId === org.id)
          const storagePct = percent(org.quota.storageUsedMb, org.quota.storageLimitMb)
          const dbPct = percent(org.quota.dbUsedMb, org.quota.dbLimitMb)
          return (
            <Card key={org.id}>
              <CardHeader
                title={org.legalName}
                description={`${org.city}, ${org.province} · bergabung ${formatDate(org.joinedAt)}`}
                icon={<Building2 className="h-4 w-4" />}
                action={
                  <Badge tone={orgTone[org.status]} dot>
                    {statusLabel[org.status]}
                  </Badge>
                }
              />
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 py-2">
                    <p className="text-sm font-extrabold text-ink">{members.length}</p>
                    <p className="text-[8px] uppercase tracking-wider text-muted">Anggota</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 py-2">
                    <p className="text-sm font-extrabold text-ink">{referrals.length}</p>
                    <p className="text-[8px] uppercase tracking-wider text-muted">Referral</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 py-2">
                    <p className="text-sm font-extrabold text-ink">{candidates.length}</p>
                    <p className="text-[8px] uppercase tracking-wider text-muted">Kandidat</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="mb-1 flex justify-between text-[9px] text-muted">
                      <span className="inline-flex items-center gap-1">
                        <HardDrive className="h-3 w-3" /> Storage
                      </span>
                      <span>
                        {org.quota.storageUsedMb} / {org.quota.storageLimitMb} MB
                      </span>
                    </div>
                    <Progress value={storagePct} tone={storagePct > 85 ? 'danger' : 'brand'} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-[9px] text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Database className="h-3 w-3" /> Database
                      </span>
                      <span>
                        {org.quota.dbUsedMb} / {org.quota.dbLimitMb} MB
                      </span>
                    </div>
                    <Progress value={dbPct} tone={dbPct > 85 ? 'danger' : 'success'} />
                  </div>
                </div>

                <div className="grid gap-1.5 rounded-xl border border-line px-3 py-2.5 text-[10px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <Mail className="h-3 w-3" /> Kontak
                    </span>
                    <span className="truncate font-semibold text-ink">{org.contactEmail}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <MapPin className="h-3 w-3" /> Slug
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">{org.slug}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <Building2 className="h-3 w-3" /> Paket
                    </span>
                    <span className="font-semibold text-ink">{org.plan}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(org.id)
                      toast.info('ID organisasi disalin', org.id)
                    }}
                    className="inline-flex items-center gap-1 text-[9px] font-semibold text-muted hover:text-brand"
                  >
                    <Copy className="h-3 w-3" /> {org.id}
                  </button>
                  <Button size="sm" variant="secondary" onClick={() => open(org)}>
                    Ubah status
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-4">
        <InfoNote tone="warning" title="Penangguhan tidak menghapus data">
          Menangguhkan tenant membatasi akses operasional, tetapi tidak menghapus data. Prosedur
          ekspor, retensi, dan penghapusan harus mengikuti perjanjian dan UU PDP.
        </InfoNote>
      </div>

      <Dialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target ? `Ubah status ${target.shortName}` : 'Ubah status'}
        description="Perubahan status tercatat pada audit platform dan memengaruhi akses anggota tenant."
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>
              Batal
            </Button>
            <Button
              loading={busy}
              variant={nextStatus === 'suspended' ? 'danger' : 'primary'}
              onClick={submit}
            >
              Simpan status
            </Button>
          </>
        }
      >
        {target ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-slate-50 p-3.5">
              <p className="text-xs font-bold text-ink">{target.legalName}</p>
              <p className="mt-0.5 text-[10px] text-muted">
                {target.contactEmail} · {target.plan}
              </p>
            </div>
            <Field label="Status organisasi" htmlFor="org-status" required>
              <Select
                id="org-status"
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as Organization['status'])}
              >
                <option value="active">Aktif — operasi penuh</option>
                <option value="onboarding">Onboarding — belum produksi</option>
                <option value="suspended">Ditangguhkan — akses dibatasi</option>
              </Select>
            </Field>
            <div className="space-y-2">
              {(['active', 'onboarding', 'suspended'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setNextStatus(status)}
                  className={cn(
                    'focus-ring w-full rounded-xl border px-3 py-2.5 text-left transition-colors',
                    nextStatus === status
                      ? 'border-brand/30 bg-brand-soft'
                      : 'border-line hover:border-slate-300',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-ink">{statusLabel[status]}</span>
                    <Badge tone={orgTone[status]} dot>
                      {statusLabel[status]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[10px] leading-4 text-muted">
                    {status === 'active'
                      ? 'Semua fitur operasional tersedia untuk anggota tenant.'
                      : status === 'onboarding'
                        ? 'Akses terbatas untuk konfigurasi awal dan uji data sintetis.'
                        : 'Akses anggota dibatasi; data tetap tersimpan.'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
