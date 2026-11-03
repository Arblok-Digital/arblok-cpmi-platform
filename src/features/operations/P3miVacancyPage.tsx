import { useMemo, useState } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Globe,
  DollarSign,
  Calendar,
  Users,
  Eye,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { isP3miRole } from '@/lib/permissions'
import { deleteVacancy, saveVacancy } from '@/lib/store'
import type { Vacancy } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { SearchInput } from '@/components/shared/misc'
import { Badge } from '@/components/ui/badge'
import { Button, LinkButton } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/form'
import { EmptyState } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const SECTORS = [
  'Kesehatan & perawatan',
  'Manufaktur',
  'Perkebunan',
  'Domestik',
  'Konstruksi',
  'Perhotelan & pariwisata',
  'Lainnya',
]

const COUNTRIES = [
  'Jepang',
  'Taiwan',
  'Malaysia',
  'Hong Kong',
  'Singapura',
  'Korea Selatan',
  'Arab Saudi',
  'Uni Emirat Arab',
  'Lainnya',
]

const VACANCY_STATUS: { id: Vacancy['status']; label: string }[] = [
  { id: 'published', label: 'Dipublikasikan' },
  { id: 'draft', label: 'Draft' },
  { id: 'closed', label: 'Ditutup' },
]

export function P3miVacancyPage() {
  const { state, account } = useSession()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<Vacancy['status'] | 'all'>('all')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [detailVacancy, setDetailVacancy] = useState<Vacancy | null>(null)
  const [busy, setBusy] = useState(false)
  const [formData, setFormData] = useState<Partial<Vacancy> & { requirements: string[] }>({
    title: '',
    jobOrderId: '',
    country: '',
    sector: '',
    requirements: [''],
    wageCurrency: 'IDR',
    wageMin: 0,
    wageMax: 0,
    wageType: 'bulanan',
    slots: 1,
    status: 'draft',
  })

  if (!account || !isP3miRole(account.role)) return null

  const canManage = account.role === 'p3mi_admin'

  const orgJobOrders = state.jobOrders.filter((j) => j.orgId === account.orgId)
  const vacancies = useMemo(
    () =>
      state.vacancies
        .filter((v) => v.orgId === account.orgId)
        .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()),
    [state.vacancies, account.orgId],
  )

  const counts = {
    published: vacancies.filter((v) => v.status === 'published').length,
    draft: vacancies.filter((v) => v.status === 'draft').length,
    closed: vacancies.filter((v) => v.status === 'closed').length,
  }

  const filtered = vacancies.filter((vacancy) => {
    if (statusFilter !== 'all' && vacancy.status !== statusFilter) return false
    if (sectorFilter !== 'all' && vacancy.sector !== sectorFilter) return false
    const jobOrder = state.jobOrders.find((j) => j.id === vacancy.jobOrderId)
    const haystack = `${vacancy.title} ${vacancy.country} ${vacancy.sector} ${jobOrder?.referenceCode ?? ''} ${vacancy.requirements.join(' ')}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  const getStatusMeta = (status: Vacancy['status']) => VACANCY_STATUS.find((s) => s.id === status)

  const getWageLabel = (v: Vacancy) => {
    if (v.wageMin === 0 && v.wageMax === 0) return 'Belum ditentukan'
    if (v.wageMin === v.wageMax) return `${formatCurrency(v.wageMin, v.wageCurrency)}/${v.wageType === 'bulanan' ? 'bln' : 'jam'}`
    return `${formatCurrency(v.wageMin, v.wageCurrency)} - ${formatCurrency(v.wageMax, v.wageCurrency)}/${v.wageType === 'bulanan' ? 'bln' : 'jam'}`
  }

  const openCreate = () => {
    setEditingVacancy(null)
    const firstJobOrder = orgJobOrders[0]
    setFormData({
      title: '',
      jobOrderId: firstJobOrder?.id ?? '',
      country: firstJobOrder?.country ?? '',
      sector: firstJobOrder?.sector ?? '',
      requirements: [''],
      wageCurrency: 'IDR',
      wageMin: 0,
      wageMax: 0,
      wageType: 'bulanan',
      slots: 1,
      status: 'draft',
    })
    setDialogOpen(true)
  }

  const openEdit = (vacancy: Vacancy) => {
    setEditingVacancy(vacancy)
    setFormData({
      title: vacancy.title,
      jobOrderId: vacancy.jobOrderId,
      country: vacancy.country,
      sector: vacancy.sector,
      requirements: [...vacancy.requirements],
      wageCurrency: vacancy.wageCurrency,
      wageMin: vacancy.wageMin,
      wageMax: vacancy.wageMax,
      wageType: vacancy.wageType,
      slots: vacancy.slots,
      status: vacancy.status,
    })
    setDialogOpen(true)
  }

  const confirmDelete = (id: string) => setDeletingId(id)

  const handleDelete = () => {
    if (!deletingId) return
    const result = deleteVacancy(deletingId)
    if (!result.ok) {
      toast.error('Gagal menghapus lowongan', result.error)
      setDeletingId(null)
      return
    }
    toast.success('Lowongan dihapus', 'Data lowongan telah dihapus.')
    setDeletingId(null)
  }

  const handleSubmit = () => {
    setBusy(true)
    try {
      const result = saveVacancy({
        id: editingVacancy?.id,
        title: formData.title ?? '',
        jobOrderId: formData.jobOrderId ?? '',
        country: formData.country ?? '',
        sector: formData.sector ?? '',
        requirements: formData.requirements,
        wageCurrency: formData.wageCurrency ?? 'IDR',
        wageMin: formData.wageMin ?? 0,
        wageMax: formData.wageMax ?? 0,
        wageType: formData.wageType ?? 'bulanan',
        slots: formData.slots ?? 1,
        status: formData.status ?? 'draft',
      })
      if (!result.ok) {
        toast.error('Validasi gagal', result.error)
        return
      }
      toast.success(
        editingVacancy ? 'Lowongan diperbarui' : 'Lowongan dibuat',
        editingVacancy ? 'Perubahan telah disimpan.' : 'Lowongan baru telah ditambahkan.',
      )
      setDialogOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const addRequirement = () => setFormData((prev) => ({ ...prev, requirements: [...prev.requirements, ''] }))
  const removeRequirement = (idx: number) =>
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== idx),
    }))
  const updateRequirement = (idx: number, value: string) =>
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements.map((r, i) => (i === idx ? value : r)),
    }))

  const statuses: (Vacancy['status'] | 'all')[] = ['all', 'published', 'draft', 'closed']

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Manajemen lowongan"
        title="Daftar lowongan"
        description="Kelola lowongan pekerjaan yang ditampilkan kepada agen dan CPMI. Setiap lowongan terikat pada job order yang diverifikasi."
        actions={<LinkButton variant="secondary" to="/p3mi/pengaturan">Pengaturan tenant</LinkButton>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-5">
        <StatCard label="Total" value={vacancies.length} icon={<Globe className="h-5 w-5" />} tone="brand" />
        <StatCard label="Dipublikasikan" value={counts.published} icon={<Eye className="h-5 w-5" />} tone="success" />
        <StatCard label="Draft" value={counts.draft} icon={<Calendar className="h-5 w-5" />} tone="warning" />
        <StatCard label="Ditutup" value={counts.closed} icon={<Trash2 className="h-5 w-5" />} tone="slate" />
      </div>

      <Card className="mb-5">
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul, negara, sektor, job order…"
              className="lg:w-80"
            />
            <div className="flex flex-wrap gap-2">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as Vacancy['status'] | 'all')}
                className="w-40"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s === 'all' ? 'Semua status' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </Select>
              <Select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="w-48"
              >
                <option value="all">Semua sektor</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              {canManage ? (
                <Button
                  icon={<Plus className="h-4 w-4" />}
                  onClick={openCreate}
                  data-testid="vacancy-create"
                >
                  Tambah Lowongan
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" />}
          title="Tidak ada lowongan"
          description={vacancies.length === 0 ? 'Belum ada lowongan. Klik "Tambah Lowongan" untuk memulai.' : 'Coba ubah filter atau kata pencarian.'}
          action={
            canManage ? (
              <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                Tambah Lowongan
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((vacancy) => {
            const jobOrder = state.jobOrders.find((j) => j.id === vacancy.jobOrderId)
            const statusMeta = getStatusMeta(vacancy.status)
            const statusTone = vacancy.status === 'published' ? 'success' : vacancy.status === 'draft' ? 'warning' : 'muted'
            return (
              <Card key={vacancy.id}>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                        vacancy.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700'
                          : vacancy.status === 'draft'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-50 text-slate-700',
                      )}
                    >
                      {vacancy.status === 'published' ? (
                        <Eye className="h-5 w-5" />
                      ) : vacancy.status === 'draft' ? (
                        <Calendar className="h-5 w-5" />
                      ) : (
                        <Trash2 className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-ink truncate max-w-[300px]">{vacancy.title}</p>
                        <Badge tone={statusTone as 'success' | 'warning' | 'muted'}>
                          {statusMeta?.label ?? vacancy.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted flex flex-wrap gap-3">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" /> {vacancy.country}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> {getWageLabel(vacancy)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {vacancy.slots} slot
                        </span>
                        {jobOrder && (
                          <span className="flex items-center gap-1 text-slate-500">
                            JO: {jobOrder.referenceCode}
                          </span>
                        )}
                      </p>
<p className="mt-1 text-[10px] text-muted">
                        Dibuat: {formatDate(vacancy.publishedAt || new Date().toISOString())} · Persyaratan: {vacancy.requirements.length} item
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Eye className="h-3.5 w-3.5" />}
                      onClick={() => setDetailVacancy(vacancy)}
                      data-testid={`vacancy-detail-${vacancy.id}`}
                    >
                      Detail
                    </Button>
                    {canManage ? (
                      <>
                        <Button variant="ghost" size="sm" icon={<Edit className="h-3.5 w-3.5" />} onClick={() => openEdit(vacancy)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          onClick={() => confirmDelete(vacancy.id)}
                          data-testid={`vacancy-delete-${vacancy.id}`}
                        >
                          Hapus
                        </Button>
                      </>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog
        open={Boolean(detailVacancy)}
        onClose={() => setDetailVacancy(null)}
        title={detailVacancy?.title ?? 'Detail lowongan'}
        description="Ringkasan lowongan yang terlihat oleh agen dan CPMI."
        data-testid="vacancy-detail-dialog"
        footer={
          <Button variant="secondary" onClick={() => setDetailVacancy(null)}>
            Tutup
          </Button>
        }
      >
        {detailVacancy ? (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { label: 'Status', value: getStatusMeta(detailVacancy.status)?.label ?? detailVacancy.status },
                { label: 'Negara tujuan', value: detailVacancy.country },
                { label: 'Sektor', value: detailVacancy.sector },
                {
                  label: 'Job order',
                  value:
                    state.jobOrders.find((j) => j.id === detailVacancy.jobOrderId)?.referenceCode ??
                    'Tidak ditemukan',
                },
                { label: 'Upah', value: getWageLabel(detailVacancy) },
                { label: 'Slot', value: `${detailVacancy.slots} orang` },
                { label: 'Dibuat', value: formatDate(detailVacancy.publishedAt) },
              ].map((row) => (
                <div key={row.label} className="rounded-lg border border-line bg-slate-50 p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{row.label}</p>
                  <p className="mt-0.5 text-xs font-semibold text-ink">{row.value}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">Persyaratan</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700">
                {detailVacancy.requirements.map((req, idx) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        title="Hapus lowongan"
        description="Tindakan ini tidak dapat dibatalkan. Lowongan yang sudah memiliki referensi agen/CPMI sebaiknya ditutup (status closed), bukan dihapus."
        data-testid="vacancy-delete-dialog"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingId(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={handleDelete}
              data-testid="vacancy-delete-confirm"
            >
              Hapus permanen
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">Yakin ingin menghapus lowongan ini secara permanen?</p>
      </Dialog>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingVacancy ? 'Edit lowongan' : 'Buat lowongan baru'}
        description="Isi data lowongan. Lowongan dengan status 'published' akan terlihat oleh agen dan CPMI."
        size="lg"
        data-testid="vacancy-form-dialog"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button loading={busy} onClick={handleSubmit} data-testid="vacancy-submit">
              {editingVacancy ? 'Simpan perubahan' : 'Buat lowongan'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Judul lowongan" htmlFor="vac-title" required>
            <Input
              id="vac-title"
              value={formData.title ?? ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Contoh: Perawat Lansia (Caregiver) - Jepang"
            />
          </Field>
          <Field label="Job Order" htmlFor="vac-jo" required>
            <Select
              id="vac-jo"
              value={formData.jobOrderId ?? ''}
              onChange={(e) => {
                const nextId = e.target.value
                const jo = orgJobOrders.find((j) => j.id === nextId)
                setFormData((prev) => ({
                  ...prev,
                  jobOrderId: nextId,
                  country: jo?.country ?? prev.country,
                  sector: jo?.sector ?? prev.sector,
                }))
              }}
            >
              <option value="" disabled>
                Pilih job order…
              </option>
              {orgJobOrders.map((jo) => (
                <option key={jo.id} value={jo.id}>
                  {jo.referenceCode} — {jo.country} — {jo.sector} ({jo.status})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Negara tujuan" htmlFor="vac-country" required>
            <Select
              id="vac-country"
              value={formData.country ?? ''}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            >
              <option value="" disabled>
                Pilih negara…
              </option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sektor" htmlFor="vac-sector" required>
            <Select
              id="vac-sector"
              value={formData.sector ?? ''}
              onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
            >
              <option value="" disabled>
                Pilih sektor…
              </option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Persyaratan" required>
          <div className="space-y-2">
            {formData.requirements.map((req, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={req}
                  onChange={(e) => updateRequirement(idx, e.target.value)}
                  placeholder={`Persyaratan ${idx + 1}`}
                  className="flex-1"
                />
                {formData.requirements.length > 1 ? (
                  <Button variant="danger" size="icon" onClick={() => removeRequirement(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            <Button variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addRequirement}>
              Tambah persyaratan
            </Button>
            <p className="text-[10px] text-muted">Minimal 1 persyaratan. Kosongkan untuk menghapus.</p>
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mata uang gaji" htmlFor="vac-currency">
            <Select
              id="vac-currency"
              value={formData.wageCurrency ?? 'IDR'}
              onChange={(e) => setFormData({ ...formData, wageCurrency: e.target.value })}
            >
              <option value="IDR">IDR (Rupiah)</option>
              <option value="JPY">JPY (Yen Jepang)</option>
              <option value="TWD">TWD (Dollar Taiwan)</option>
              <option value="MYR">MYR (Ringgit Malaysia)</option>
              <option value="HKD">HKD (Dollar Hong Kong)</option>
              <option value="SGD">SGD (Dollar Singapura)</option>
              <option value="KRW">KRW (Won Korea)</option>
              <option value="SAR">SAR (Riyal Arab Saudi)</option>
              <option value="AED">AED (Dirham UAE)</option>
            </Select>
          </Field>
          <Field label="Tipe gaji" htmlFor="vac-wage-type">
            <Select
              id="vac-wage-type"
              value={formData.wageType ?? 'bulanan'}
              onChange={(e) => setFormData({ ...formData, wageType: e.target.value as 'bulanan' | 'per jam' })}
            >
              <option value="bulanan">Bulanan</option>
              <option value="per jam">Per jam</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Gaji minimum" htmlFor="vac-wage-min">
            <Input
              id="vac-wage-min"
              type="number"
              min="0"
              step="1000"
              value={formData.wageMin ?? 0}
              onChange={(e) => setFormData({ ...formData, wageMin: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Gaji maksimum" htmlFor="vac-wage-max">
            <Input
              id="vac-wage-max"
              type="number"
              min="0"
              step="1000"
              value={formData.wageMax ?? 0}
              onChange={(e) => setFormData({ ...formData, wageMax: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Jumlah slot" htmlFor="vac-slots">
            <Input
              id="vac-slots"
              type="number"
              min="1"
              max="100"
              value={formData.slots ?? 1}
              onChange={(e) => setFormData({ ...formData, slots: Number(e.target.value) || 1 })}
            />
          </Field>
        </div>

        <Field label="Status" htmlFor="vac-status">
          <Select
            id="vac-status"
            value={formData.status ?? 'draft'}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as Vacancy['status'] })}
          >
            <option value="draft">Draft</option>
            <option value="published">Dipublikasikan</option>
            <option value="closed">Ditutup</option>
          </Select>
        </Field>

        <InfoNote tone="info" title="Catatan">
          Lowongan draft hanya terlihat oleh admin P3MI. Setelah dipublikasikan, agen dan CPMI dapat melihatnya.
          Lowongan yang sudah memiliki kandidat/referral sebaiknya ditutup (closed), bukan dihapus, untuk menjaga integritas data.
        </InfoNote>
      </Dialog>
    </div>
  )
}
