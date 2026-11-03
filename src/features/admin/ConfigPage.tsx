import { useState } from 'react'
import {
  BellRing,
  Database,
  FileCheck2,
  GitBranch,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  UserCog,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { DOC_TYPES, ROLE_LABELS, STATUS_ORDER } from '@/lib/constants'
import { can } from '@/lib/permissions'
import type { Permission } from '@/lib/permissions'
import type { Role } from '@/lib/types'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const roles: Role[] = ['arblok_admin', 'p3mi_admin', 'p3mi_reviewer', 'agent_coordinator', 'agent', 'cpmi']
const permissions: { id: Permission; label: string; sensitive?: boolean }[] = [
  { id: 'view.platform', label: 'Lihat platform' },
  { id: 'manage.tenants', label: 'Kelola tenant' },
  { id: 'manage.org', label: 'Kelola organisasi' },
  { id: 'manage.agents', label: 'Kelola agen' },
  { id: 'view.allReferrals', label: 'Lihat semua referral' },
  { id: 'create.referral', label: 'Buat referral' },
  { id: 'respond.referral', label: 'Respons referral', sensitive: true },
  { id: 'review.documents', label: 'Putuskan dokumen', sensitive: true },
  { id: 'update.pipeline', label: 'Ubah pipeline', sensitive: true },
  { id: 'manage.fees', label: 'Lihat/kelola fee', sensitive: true },
  { id: 'record.payment', label: 'Catat pembayaran', sensitive: true },
  { id: 'manage.complaints', label: 'Tindak lanjuti pengaduan' },
  { id: 'create.complaint', label: 'Buat pengaduan' },
  { id: 'view.audit', label: 'Lihat audit' },
  { id: 'access.documents', label: 'Akses dokumen', sensitive: true },
]

const initialFlags = [
  { id: 'consent-gate', label: 'Wajib persetujuan sebelum upload', description: 'Blokir unggahan bila consent aktif tidak ada.', enabled: true },
  { id: 'duplicate-warning', label: 'Peringatan duplikat referral', description: 'Deteksi nomor telepon yang sama dalam tenant.', enabled: true },
  { id: 'reason-gate', label: 'Alasan wajib untuk akses dokumen', description: 'Catat alasan pada setiap pratinjau/unduhan.', enabled: true },
  { id: 'agent-pipeline-readonly', label: 'Agen hanya baca pipeline', description: 'Hanya P3MI yang dapat mengubah status.', enabled: true },
  { id: 'pwa-offline', label: 'Shell PWA offline', description: 'Cache aset dan halaman login saat offline.', enabled: true },
  { id: 'synthetic-banner', label: 'Banner data sintetis', description: 'Tampilkan peringatan demo di topbar.', enabled: true },
  { id: 'payment-proof-upload', label: 'Unggah bukti transfer', description: 'Belum aktif pada pilot tanpa storage privat.', enabled: false },
]

export function ConfigPage() {
  const { state, account } = useSession()
  const toast = useToast()
  const [flags, setFlags] = useState(initialFlags)

  if (!account || account.role !== 'arblok_admin') return null

  const toggle = (id: string) => {
    setFlags((current) =>
      current.map((flag) => (flag.id === id ? { ...flag, enabled: !flag.enabled } : flag)),
    )
    toast.info('Preferensi demo diperbarui', 'Perubahan tidak dipersistenkan pada konfigurasi server.')
  }

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Platform administration"
        title="Konfigurasi"
        description="Kontrol kebijakan pilot, matriks peran, dan kesiapan integrasi. Pada demo, toggle hanya berlaku di sesi ini."
        meta={
          <>
            <Badge tone="warning">Konfigurasi lokal — demo</Badge>
            <Badge tone="brand" icon={<ShieldCheck className="h-3 w-3" />}>
              Default aman
            </Badge>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Kebijakan operasional"
              description="Nilai default mengikuti batas aman pilot."
              icon={<SlidersHorizontal className="h-4 w-4" />}
            />
            <CardContent className="space-y-2">
              {flags.map((flag) => (
                <button
                  key={flag.id}
                  type="button"
                  onClick={() => toggle(flag.id)}
                  className={cn(
                    'focus-ring flex w-full items-start justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
                    flag.enabled ? 'border-brand/20 bg-brand-soft/50' : 'border-line hover:border-slate-300',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold text-ink">{flag.label}</span>
                    <span className="mt-0.5 block text-[10px] leading-4 text-muted">
                      {flag.description}
                    </span>
                  </span>
                  <span className={flag.enabled ? 'text-brand' : 'text-slate-400'}>
                    {flag.enabled ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Matriks peran & izin"
              description="Ringkasan implementasi permissions.ts. Izin sensitif ditandai."
              icon={<UserCog className="h-4 w-4" />}
            />
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[720px] border-collapse text-left text-[10px]">
                  <thead className="table-head">
                    <tr>
                      <th className="px-3 py-2">Izin</th>
                      {roles.map((role) => (
                        <th key={role} className="px-2 py-2 text-center">
                          {ROLE_LABELS[role]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((permission) => (
                      <tr key={permission.id}>
                        <td className="table-cell px-3">
                          <span className="font-semibold text-slate-700">{permission.label}</span>
                          {permission.sensitive ? (
                            <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[8px] font-bold text-amber-800">
                              sensitif
                            </span>
                          ) : null}
                        </td>
                        {roles.map((role) => (
                          <td key={role} className="table-cell px-2 text-center">
                            {can(role, permission.id) ? (
                              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-700">
                                ✓
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Batas teknis"
              description="Nilai pilot saat ini."
              icon={<Database className="h-4 w-4" />}
            />
            <CardContent className="space-y-2.5 text-[10px]">
              {[
                ['Storage per organisasi', `${state.organizations[0]?.quota.storageLimitMb ?? 1024} MB`],
                ['Database per organisasi', `${state.organizations[0]?.quota.dbLimitMb ?? 500} MB`],
                ['Ukuran file dokumen', '3 MB'],
                ['Format dokumen', 'PDF, JPG, PNG'],
                ['Pipeline status', `${STATUS_ORDER.length} tahap + 5 status cabang`],
                ['Dokumen wajib', `${DOC_TYPES.filter((d) => d.required).length} jenis`],
                ['Retensi audit (usulan)', '≥ 5 tahun'],
                ['Retensi dokumen (usulan)', 'Sesuai SOP + UU PDP'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 border-b border-line pb-2 last:border-0 last:pb-0">
                  <span className="text-muted">{label}</span>
                  <span className="text-right font-semibold text-ink">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Kesiapan integrasi"
              description="Belum terhubung pada demo."
              icon={<KeyRound className="h-4 w-4" />}
            />
            <CardContent className="space-y-2">
              {[
                { label: 'Supabase Auth + RLS', detail: 'Skema & kebijakan tersedia', ready: true },
                { label: 'Storage privat dokumen', detail: 'Bucket policy draft', ready: false },
                { label: 'WhatsApp notifikasi', detail: 'Butuh penyedia & consent', ready: false },
                { label: 'BP2MI / SISKOP2MI', detail: 'Di luar cakupan pilot', ready: false },
                { label: 'PWA install prompt', detail: 'Aktif di build produksi', ready: true },
              ].map((row) => (
                <div key={row.label} className="flex items-start gap-2">
                  <span
                    className={
                      row.ready
                        ? 'mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-700'
                        : 'mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[9px] text-slate-400'
                    }
                  >
                    {row.ready ? '✓' : '·'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-700">{row.label}</p>
                    <p className="text-[9px] text-muted">{row.detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Kanal notifikasi"
              description="Preferensi default tenant."
              icon={<BellRing className="h-4 w-4" />}
            />
            <CardContent className="space-y-2 text-[10px]">
              {[
                ['Dalam aplikasi', 'Aktif'],
                ['Email transaksional', 'Belum aktif'],
                ['WhatsApp', 'Belum aktif'],
                ['Push PWA', 'Belum aktif'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-muted">{label}</span>
                  <Badge tone={value === 'Aktif' ? 'success' : 'muted'}>{value}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoNote tone="warning" title="Konfigurasi ini bukan pengganti telaah">
          Perubahan kebijakan produksi harus melalui persetujuan pemilik data, tinjauan privasi, dan
          pengujian. Toggle demo tidak mengubah server atau basis data nyata.
        </InfoNote>
        <InfoNote tone="info" title="Prinsip default aman" icon={<LockKeyhole className="h-4 w-4" />}>
          Bila integrasi gagal, akses dokumen dan pembayaran harus gagal tertutup. Jangan menonaktifkan
          alasan akses atau audit untuk kenyamanan operasional.
        </InfoNote>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone="brand" icon={<GitBranch className="h-3 w-3" />}>
          {STATUS_ORDER.length} status pipeline
        </Badge>
        <Badge tone="info" icon={<FileCheck2 className="h-3 w-3" />}>
          {DOC_TYPES.length} jenis dokumen
        </Badge>
        <Badge tone="success" icon={<ShieldCheck className="h-3 w-3" />}>
          {roles.length} peran
        </Badge>
      </div>
    </div>
  )
}
