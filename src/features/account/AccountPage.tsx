import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarDays,
  FileSignature,
  LifeBuoy,
  LogOut,
  MapPin,
  Network,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { logout } from '@/lib/store'
import { ROLE_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { Badge } from '@/components/ui/badge'
import { Button, LinkButton } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export function AccountPage() {
  const { state, account } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const [prefs, setPrefs] = useState([
    { id: 'referral-status', label: 'Status referral', enabled: true },
    { id: 'visit-reminder', label: 'Pengingat kunjungan', enabled: true },
    { id: 'document-revision', label: 'Dokumen perlu revisi', enabled: true },
    { id: 'commission', label: 'Komisi & pembayaran', enabled: true },
    { id: 'digest', label: 'Ringkasan mingguan', enabled: false },
  ])

  if (!account) return null
  const agent = state.agents.find((a) => a.id === account.agentId)
  const coordinator = state.agents.find((a) => a.coordinatorId === account.agentId)
  const network = state.agents.filter((a) => a.coordinatorId === account.agentId)
  const agreement = state.commissionAgreements.find((a) => a.agentId === account.agentId)
  const org = state.organizations.find((o) => o.id === account.orgId)

  const doLogout = () => {
    logout()
    toast.info('Anda telah keluar')
    navigate('/login', { replace: true })
  }

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Profil"
        title="Akun saya"
        description="Data kemitraan, kontak, dan preferensi notifikasi. Perubahan profil pada pilot dilakukan oleh admin P3MI."
        meta={<Badge tone="brand">{ROLE_LABELS[account.role]}</Badge>}
        actions={
          <Button variant="secondary" icon={<LogOut className="h-4 w-4" />} onClick={doLogout}>
            Keluar
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar name={account.name} size="lg" className="h-14 w-14 text-base" />
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold text-ink">{account.name}</p>
                <p className="mt-0.5 text-[11px] text-muted">{account.title}</p>
                <p className="mt-0.5 text-[10px] text-muted">
                  {account.email} · {account.phone}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="success" dot>
                    Akun aktif
                  </Badge>
                  {agent ? <Badge tone="brand">{agent.code}</Badge> : null}
                  {org ? <Badge tone="muted">{org.shortName}</Badge> : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {agent ? (
            <Card>
              <CardHeader
                title="Data kemitraan"
                description="Dikelola admin P3MI."
                icon={<FileSignature className="h-4 w-4" />}
              />
              <CardContent className="space-y-2.5 text-[11px]">
                {[
                  ['Kode agen', agent.code],
                  ['Wilayah', agent.region],
                  ['Telepon', agent.phone],
                  ['Status kemitraan', agent.status],
                  ['Bergabung', formatDate(agent.joinedAt)],
                  ['Nomor perjanjian', agent.agreementNumber],
                  ['Perjanjian berlaku', formatDate(agent.agreementValidUntil)],
                  ['Koordinator', coordinator?.name ?? 'Tidak ada'],
                  ['Agen dikoordinasikan', network.length ? `${network.length} agen` : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-3 border-b border-line pb-2 last:border-0 last:pb-0">
                    <span className="text-muted">{label}</span>
                    <span className="text-right font-semibold capitalize text-ink">{value}</span>
                  </div>
                ))}
                {agent.note ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] leading-4 text-amber-900">
                    Catatan admin: {agent.note}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {agreement ? (
            <Card>
              <CardHeader
                title="Skema komisi"
                description={`${agreement.agreementNumber} · ${agreement.status}`}
                icon={<ShieldCheck className="h-4 w-4" />}
              />
              <CardContent className="space-y-2">
                <p className="text-[10px] leading-4 text-muted">{agreement.triggerDefinition}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {agreement.milestones.map((milestone) => (
                    <div key={milestone.code} className="rounded-lg border border-line bg-slate-50 px-2.5 py-2">
                      <p className="text-[9px] uppercase tracking-wider text-muted">{milestone.code}</p>
                      <p className="mt-0.5 text-[10px] font-semibold text-ink">{milestone.label}</p>
                      <p className="text-[10px] font-bold text-brand">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: milestone.currency,
                          maximumFractionDigits: 0,
                        }).format(milestone.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Preferensi notifikasi"
              description="Hanya berlaku pada perangkat demo ini."
              icon={<Bell className="h-4 w-4" />}
            />
            <CardContent className="space-y-2">
              {prefs.map((pref) => (
                <button
                  key={pref.id}
                  type="button"
                  onClick={() =>
                    setPrefs((current) =>
                      current.map((p) => (p.id === pref.id ? { ...p, enabled: !p.enabled } : p)),
                    )
                  }
                  className={cn(
                    'focus-ring flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left',
                    pref.enabled ? 'border-brand/20 bg-brand-soft/40' : 'border-line',
                  )}
                >
                  <span className="text-[11px] font-semibold text-ink">{pref.label}</span>
                  <span
                    className={cn(
                      'h-4 w-7 rounded-full p-0.5 transition-colors',
                      pref.enabled ? 'bg-brand' : 'bg-slate-300',
                    )}
                  >
                    <span
                      className={cn(
                        'block h-3 w-3 rounded-full bg-white transition-transform',
                        pref.enabled && 'translate-x-3',
                      )}
                    />
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Akses cepat" icon={<UserRound className="h-4 w-4" />} />
            <CardContent className="space-y-1.5">
              <LinkButton to="/agen/kandidat" variant="secondary" className="w-full justify-start" icon={<UserRound className="h-4 w-4" />}>
                Kandidat saya
              </LinkButton>
              <LinkButton to="/agen/komisi" variant="secondary" className="w-full justify-start" icon={<FileSignature className="h-4 w-4" />}>
                Komisi saya
              </LinkButton>
              {account.role === 'agent_coordinator' ? (
                <LinkButton to="/agen/jaringan" variant="secondary" className="w-full justify-start" icon={<Network className="h-4 w-4" />}>
                  Jaringan saya
                </LinkButton>
              ) : null}
              <LinkButton to="/agen/bantuan" variant="secondary" className="w-full justify-start" icon={<LifeBuoy className="h-4 w-4" />}>
                Bantuan & pengaduan
              </LinkButton>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Keamanan akun" icon={<ShieldCheck className="h-4 w-4" />} />
            <CardContent className="space-y-2 text-[10px] leading-4 text-slate-600">
              <p>
                Kata sandi demo: <span className="font-mono font-bold text-ink">demo1234</span>.
                Jangan gunakan kata sandi ini pada produksi.
              </p>
              <p>
                Sesi disimpan lokal untuk demo. Pada produksi, autentikasi menggunakan Supabase Auth
                dengan MFA untuk admin.
              </p>
              <p>
                Perangkat bersama: selalu keluar setelah selesai. Jangan menyimpan data CPMI di
                catatan ponsel pribadi.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Kontak P3MI" icon={<Phone className="h-4 w-4" />} />
            <CardContent className="space-y-1 text-[10px] text-slate-600">
              <p className="font-semibold text-ink">{org?.shortName ?? 'P3MI pilot'}</p>
              <p className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {org?.city ?? 'Tasikmalaya'}, {org?.province ?? 'Jawa Barat'}
              </p>
              <p className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Senin–Jumat, 08.00–16.00 WIB
              </p>
              <p>{org?.contactEmail ?? '—'}</p>
            </CardContent>
          </Card>

          <InfoNote tone="warning" title="Kepatuhan agen">
            Jangan menjanjikan lowongan, visa, atau nominal komisi. Catat referral dengan persetujuan
            kandidat dan gunakan kanal bantuan untuk kendala.
          </InfoNote>
        </div>
      </div>
    </div>
  )
}
