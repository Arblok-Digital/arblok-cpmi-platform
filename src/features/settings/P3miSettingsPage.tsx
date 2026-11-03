import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Building2,
  Database,
  Download,
  Mail,
  MapPin,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { resetDemo } from '@/lib/store'
import { ROLE_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const notificationDefaults = [
  { id: 'referral', label: 'Referral baru', description: 'Notifikasi saat agen mengirim referral.', enabled: true },
  { id: 'document', label: 'Dokumen menunggu', description: 'Antrean verifikasi dokumen.', enabled: true },
  { id: 'visit', label: 'Jadwal & serah terima', description: 'Perubahan jadwal dan permintaan handover.', enabled: true },
  { id: 'fee', label: 'Fee & pembayaran', description: 'Milestone komisi dan pembayaran.', enabled: true },
  { id: 'complaint', label: 'Pengaduan', description: 'Pengaduan baru atau urgensi tinggi.', enabled: true },
  { id: 'digest', label: 'Ringkasan harian', description: 'Email ringkasan operasional (belum aktif).', enabled: false },
]

export function P3miSettingsPage() {
  const { state, account } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const [prefs, setPrefs] = useState(notificationDefaults)
  const [resetOpen, setResetOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  if (!account) return null
  const org = state.organizations.find((o) => o.id === account.orgId)
  const members = state.accounts.filter((a) => a.orgId === account.orgId)
  const isAdmin = account.role === 'p3mi_admin'

  const exportOrg = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      synthetic: true,
      organization: org ?? null,
      accounts: members.map(({ email, name, role, title, status }) => ({ email, name, role, title, status })),
      candidates: state.candidates.filter((c) => c.orgId === account.orgId),
      referrals: state.referrals.filter((r) => r.orgId === account.orgId),
      ledger: state.ledger.filter((l) => l.orgId === account.orgId),
      complaints: state.complaints.filter((c) => c.orgId === account.orgId),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'arblok-cpmi-tenant-export.json'
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Ekspor dibuat', 'Berkas JSON berisi data sintetis tenant ini.')
  }

  const doReset = () => {
    resetDemo()
    setResetOpen(false)
    toast.info('Demo direset', 'Seluruh perubahan lokal dihapus. Silakan masuk kembali.')
    navigate('/login', { replace: true })
  }

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Workspace"
        title="Pengaturan"
        description="Profil tenant, preferensi notifikasi, dan kontrol data demo. Perubahan preferensi tidak dipersistenkan ke server."
        meta={<Badge tone="warning">Konfigurasi lokal — demo</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Profil organisasi"
              description="Data tenant pilot."
              icon={<Building2 className="h-4 w-4" />}
            />
            <CardContent className="space-y-2.5 text-[11px]">
              {[
                ['Nama legal', org?.legalName ?? '—'],
                ['Nama singkat', org?.shortName ?? '—'],
                ['Kota / provinsi', `${org?.city ?? '—'}, ${org?.province ?? '—'}`],
                ['Status', org?.status ?? '—'],
                ['Paket', org?.plan ?? '—'],
                ['Bergabung', formatDate(org?.joinedAt)],
                ['Kontak', org?.contactEmail ?? '—'],
                ['Slug', org?.slug ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 border-b border-line pb-2 last:border-0 last:pb-0">
                  <span className="text-muted">{label}</span>
                  <span className="text-right font-semibold text-ink">{value}</span>
                </div>
              ))}
              <InfoNote tone="info">
                Perubahan profil organisasi pada produksi harus melalui admin platform dan tercatat
                pada audit. Form edit belum diaktifkan pada demo.
              </InfoNote>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Preferensi notifikasi"
              description="Kanal dalam aplikasi aktif; email/WhatsApp belum terhubung."
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
                    'focus-ring flex w-full items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left',
                    pref.enabled ? 'border-brand/20 bg-brand-soft/50' : 'border-line',
                  )}
                >
                  <span>
                    <span className="block text-[11px] font-bold text-ink">{pref.label}</span>
                    <span className="mt-0.5 block text-[10px] leading-4 text-muted">
                      {pref.description}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 h-4 w-7 rounded-full p-0.5 transition-colors',
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

          <Card>
            <CardHeader
              title="Anggota workspace"
              description="Akun yang terhubung ke tenant ini."
              icon={<Mail className="h-4 w-4" />}
            />
            <CardContent className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-ink">{member.name}</p>
                    <p className="truncate text-[9px] text-muted">{member.email}</p>
                  </div>
                  <Badge tone={member.status === 'active' ? 'success' : 'muted'}>
                    {ROLE_LABELS[member.role]}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Kepatuhan pilot"
              description="Gerbang sebelum data asli."
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <CardContent className="space-y-2.5">
              {[
                { label: 'Data sintetis', ok: true, detail: 'Tidak ada PII nyata' },
                { label: 'Consent tercatat', ok: true, detail: 'Per kandidat & tujuan' },
                { label: 'Audit akses dokumen', ok: true, detail: 'Alasan wajib' },
                { label: 'Telaah UU PDP', ok: false, detail: 'Wajib sebelum produksi' },
                { label: 'Perjanjian P3MI–agen', ok: true, detail: 'Dua agen aktif' },
                { label: 'Backup & restore', ok: false, detail: 'Belum diuji' },
              ].map((row) => (
                <div key={row.label} className="flex items-start gap-2">
                  <span
                    className={
                      row.ok
                        ? 'mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-700'
                        : 'mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[9px] text-slate-400'
                    }
                  >
                    {row.ok ? '✓' : '·'}
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-700">{row.label}</p>
                    <p className="text-[9px] text-muted">{row.detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Kontrol data demo"
              description="Data tersimpan di localStorage perangkat ini."
              icon={<Database className="h-4 w-4" />}
            />
            <CardContent className="space-y-2">
              <Button
                variant="secondary"
                className="w-full"
                icon={<Download className="h-4 w-4" />}
                onClick={exportOrg}
              >
                Ekspor data tenant (JSON)
              </Button>
              <Button
                variant="ghost"
                className="w-full text-red-700 hover:bg-red-50"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => {
                  setConfirmText('')
                  setResetOpen(true)
                }}
                disabled={!isAdmin}
              >
                Reset seluruh demo
              </Button>
              {!isAdmin ? (
                <p className="text-[9px] leading-4 text-muted">
                  Reset hanya tersedia untuk admin P3MI.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Kontak & dukungan"
              description="Pilot Tasikmalaya."
              icon={<MapPin className="h-4 w-4" />}
            />
            <CardContent className="space-y-1.5 text-[10px] text-slate-600">
              <p className="font-semibold text-ink">ARBLOK Digital</p>
              <p>Dukungan platform: support@arblok.id (contoh)</p>
              <p>Jam kerja: Senin–Jumat, 08.00–16.00 WIB</p>
              <p className="text-[9px] text-muted">
                Gunakan kanal ini untuk masalah teknis, bukan untuk mengirim data pribadi CPMI.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4">
        <InfoNote tone="warning" title="Jangan gunakan data asli pada demo">
          Reset menghapus perubahan lokal dan memuat ulang data sintetis. Pastikan tidak ada data
          nyata yang dimasukkan sebelum menjalankan demo.
        </InfoNote>
      </div>

      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset seluruh demo?"
        description="Semua perubahan lokal akan dihapus dan data sintetis awal dimuat kembali. Tindakan ini tidak dapat dibatalkan."
        tone="danger"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              disabled={confirmText !== 'RESET'}
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={doReset}
            >
              Reset demo
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            <p className="text-[10px] leading-4 text-red-900">
              Anda akan keluar dari sesi. Data yang belum diekspor akan hilang.
            </p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-slate-700">
              Ketik <span className="font-mono font-bold">RESET</span> untuk konfirmasi
            </span>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="focus-ring h-10 w-full rounded-xl border border-line px-3 text-sm"
              placeholder="RESET"
            />
          </label>
        </div>
      </Dialog>
    </div>
  )
}
