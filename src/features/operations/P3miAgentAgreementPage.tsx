import { useMemo, useState } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  Eye,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { isP3miRole } from '@/lib/permissions'
import { deleteAgentAgreement, saveAgentAgreement } from '@/lib/store'
import type { AgentAgreement } from '@/lib/types'
import { formatDate } from '@/lib/format'
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

export function P3miAgentAgreementPage() {
  const { state, account } = useSession()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'active' | 'ended'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAgreement, setEditingAgreement] = useState<AgentAgreement | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [detailAgreement, setDetailAgreement] = useState<AgentAgreement | null>(null)
  const [busy, setBusy] = useState(false)
  const [formData, setFormData] = useState<Partial<AgentAgreement> & { agentId: string }>({
    agentId: '',
    agreementNumber: '',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    status: 'draft',
  })

  if (!account || !isP3miRole(account.role)) return null

  const canManage = account.role === 'p3mi_admin'

  const orgAgents = state.agents.filter((a) => a.orgId === account.orgId)
  const agreements = useMemo(
    () =>
      state.agentAgreements
        .filter((a) => a.orgId === account.orgId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.agentAgreements, account.orgId],
  )

  const counts = {
    active: agreements.filter((a) => a.status === 'active').length,
    draft: agreements.filter((a) => a.status === 'draft').length,
    ended: agreements.filter((a) => a.status === 'ended').length,
  }

  const filtered = agreements.filter((agreement) => {
    if (statusFilter !== 'all' && agreement.status !== statusFilter) return false
    const agent = state.agents.find((agt) => agt.id === agreement.agentId)
    const haystack = `${agreement.agreementNumber} ${agent?.name ?? ''} ${agent?.code ?? ''}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  const getAgentName = (agentId: string) => {
    const agent = state.agents.find((a) => a.id === agentId)
    return agent ? `${agent.name} (${agent.code})` : 'Agen tidak ditemukan'
  }

  const isExpired = (validUntil: string) => new Date(validUntil) < new Date()

  const openCreate = () => {
    setEditingAgreement(null)
    setFormData({
      agentId: orgAgents[0]?.id ?? '',
      agreementNumber: '',
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: '',
      status: 'draft',
    })
    setDialogOpen(true)
  }

  const openEdit = (agreement: AgentAgreement) => {
    setEditingAgreement(agreement)
    setFormData({
      agentId: agreement.agentId,
      agreementNumber: agreement.agreementNumber,
      validFrom: agreement.validFrom,
      validUntil: agreement.validUntil ?? '',
      status: agreement.status,
    })
    setDialogOpen(true)
  }

  const confirmDelete = (id: string) => setDeletingId(id)

  const handleDelete = () => {
    if (!deletingId) return
    const result = deleteAgentAgreement(deletingId)
    if (!result.ok) {
      toast.error('Gagal menghapus perjanjian', result.error)
      setDeletingId(null)
      return
    }
    toast.success('Perjanjian dihapus', 'Data perjanjian telah dihapus.')
    setDeletingId(null)
  }

  const handleSubmit = () => {
    setBusy(true)
    try {
      const result = saveAgentAgreement({
        id: editingAgreement?.id,
        agentId: formData.agentId ?? '',
        agreementNumber: formData.agreementNumber ?? '',
        validFrom: formData.validFrom ?? '',
        validUntil: formData.validUntil || null,
        status: formData.status ?? 'draft',
      })
      if (!result.ok) {
        toast.error('Validasi gagal', result.error)
        return
      }
      toast.success(
        editingAgreement ? 'Perjanjian diperbarui' : 'Perjanjian dibuat',
        editingAgreement ? 'Perubahan telah disimpan.' : 'Perjanjian baru telah ditambahkan.',
      )
      setDialogOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const statuses = ['all', 'draft', 'active', 'ended'] as const

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Manajemen agen"
        title="Perjanjian kemitraan"
        description="Kelola perjanjian kerja sama dengan agen lokal. Setiap perjanjian mencatat nomor, masa berlaku, dan status."
        actions={<LinkButton variant="secondary" to="/p3mi/agen">Kelola data agen</LinkButton>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-5">
        <StatCard label="Total" value={agreements.length} icon={<FileText className="h-5 w-5" />} tone="brand" />
        <StatCard label="Aktif" value={counts.active} icon={<CheckCircle className="h-5 w-5" />} tone="success" />
        <StatCard label="Draft" value={counts.draft} icon={<FileText className="h-5 w-5" />} tone="warning" />
        <StatCard label="Berakhir" value={counts.ended} icon={<AlertTriangle className="h-5 w-5" />} tone="danger" />
      </div>

      <Card className="mb-5">
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nomor perjanjian, nama agen, kode agen…"
              className="lg:w-80"
            />
            <div className="flex flex-wrap gap-2">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'active' | 'ended')}
                className="w-40"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s === 'all' ? 'Semua status' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </Select>
              {canManage ? (
                <Button
                  icon={<Plus className="h-4 w-4" />}
                  onClick={openCreate}
                  data-testid="agreement-create"
                >
                  Tambah Perjanjian
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" />}
          title="Tidak ada perjanjian"
          description={agreements.length === 0 ? 'Belum ada perjanjian. Klik "Tambah Perjanjian" untuk memulai.' : 'Coba ubah filter atau kata pencarian.'}
          action={
            canManage ? (
              <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                Tambah Perjanjian
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((agreement) => {
            const agent = state.agents.find((a) => a.id === agreement.agentId)
            const expired = agreement.validUntil && isExpired(agreement.validUntil)
            const statusLabel = agreement.status === 'active' ? 'Aktif' : agreement.status === 'draft' ? 'Draft' : 'Berakhir'
            const statusTone = agreement.status === 'active' ? 'success' : agreement.status === 'draft' ? 'warning' : 'danger'
            return (
              <Card key={agreement.id}>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                      agreement.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : agreement.status === 'draft'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700',
                    )}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-ink truncate max-w-[300px]">{agreement.agreementNumber}</p>
                        <Badge tone={statusTone as 'success' | 'warning' | 'danger'}>
                          {statusLabel}
                        </Badge>
                        {expired && (
                          <Badge tone="danger" icon={<AlertTriangle className="h-3 w-3" />}>
                            Sudah kedaluwarsa
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted flex flex-wrap gap-3">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {getAgentName(agreement.agentId)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(agreement.validFrom)} - {agreement.validUntil ? formatDate(agreement.validUntil) : 'Tidak terbatas'}
                        </span>
                        <span className="flex items-center gap-1">
                          {agent?.region && <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-brand-soft text-brand" /> {agent.region}</span>}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Eye className="h-3.5 w-3.5" />}
                      onClick={() => setDetailAgreement(agreement)}
                      data-testid={`agreement-detail-${agreement.id}`}
                    >
                      Detail
                    </Button>
                    {canManage ? (
                      <>
                        <Button variant="ghost" size="sm" icon={<Edit className="h-3.5 w-3.5" />} onClick={() => openEdit(agreement)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          onClick={() => confirmDelete(agreement.id)}
                          data-testid={`agreement-delete-${agreement.id}`}
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
        open={Boolean(detailAgreement)}
        onClose={() => setDetailAgreement(null)}
        title={detailAgreement?.agreementNumber ?? 'Detail perjanjian'}
        description="Ringkasan perjanjian kemitraan agen."
        data-testid="agreement-detail-dialog"
        footer={
          <Button variant="secondary" onClick={() => setDetailAgreement(null)}>
            Tutup
          </Button>
        }
      >
        {detailAgreement ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { label: 'Agen', value: getAgentName(detailAgreement.agentId) },
              {
                label: 'Status',
                value:
                  detailAgreement.status.charAt(0).toUpperCase() + detailAgreement.status.slice(1),
              },
              { label: 'Mulai berlaku', value: formatDate(detailAgreement.validFrom) },
              {
                label: 'Berakhir',
                value: detailAgreement.validUntil
                  ? formatDate(detailAgreement.validUntil)
                  : 'Tidak terbatas',
              },
              { label: 'Dibuat', value: formatDate(detailAgreement.createdAt) },
            ].map((row) => (
              <div key={row.label} className="rounded-lg border border-line bg-slate-50 p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{row.label}</p>
                <p className="mt-0.5 text-xs font-semibold text-ink">{row.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        title="Hapus perjanjian"
        description="Tindakan ini tidak dapat dibatalkan."
        data-testid="agreement-delete-dialog"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingId(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={handleDelete}
              data-testid="agreement-delete-confirm"
            >
              Hapus permanen
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">Yakin ingin menghapus perjanjian ini secara permanen?</p>
      </Dialog>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingAgreement ? 'Edit perjanjian' : 'Buat perjanjian baru'}
        description="Isi data perjanjian kemitraan agen."
        size="lg"
        data-testid="agreement-form-dialog"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button loading={busy} onClick={handleSubmit} data-testid="agreement-submit">
              {editingAgreement ? 'Simpan perubahan' : 'Buat perjanjian'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Agen" htmlFor="agr-agent" required>
            <Select
              id="agr-agent"
              value={formData.agentId}
              onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
            >
              {orgAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.code}) - {agent.region}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nomor perjanjian" htmlFor="agr-number" required>
            <Input
              id="agr-number"
              value={formData.agreementNumber ?? ''}
              onChange={(e) => setFormData({ ...formData, agreementNumber: e.target.value })}
              placeholder="Contoh: AG-2026-045"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tanggal mulai" htmlFor="agr-valid-from" required>
            <Input
              id="agr-valid-from"
              type="date"
              value={formData.validFrom}
              onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
            />
          </Field>
          <Field label="Tanggal berakhir" htmlFor="agr-valid-until">
            <Input
              id="agr-valid-until"
              type="date"
              value={formData.validUntil ?? ''}
              onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
            />
          </Field>
          <Field label="Status" htmlFor="agr-status">
            <Select
              id="agr-status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'active' | 'ended' })}
            >
              <option value="draft">Draft</option>
              <option value="active">Aktif</option>
              <option value="ended">Berakhir</option>
            </Select>
          </Field>
        </div>

        <InfoNote tone="info" title="Catatan">
          Perjanjian dengan status 'active' akan ditampilkan kepada agen dan digunakan untuk validasi referral.
          Perjanjian yang sudah kedaluwarsa ({'validUntil < hari ini'}) akan ditandai otomatis.
        </InfoNote>
      </Dialog>
    </div>
  )
}