import { useCallback, useRef, useState } from 'react'
import { Upload, X, FileIcon, CheckCircle, AlertCircle, Loader2, Eye, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/format'
import { Progress } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'

export type DocumentTypeId =
  | 'ktp'
  | 'kartu_keluarga'
  | 'ijazah'
  | 'skck'
  | 'paspor'
  | 'foto'
  | 'sertifikat'

export type FileUploaderProps = {
  documentType: DocumentTypeId
  onUpload: (file: File) => Promise<{ ok: true; data: { documentId: string } } | { ok: false; error: string }>
  acceptedTypes?: string[]
  maxSizeBytes?: number
  existingDocument?: {
    id: string
    fileName: string
    version: number
    status: string
    uploadedAt: string
    sizeBytes: number
    mimeType: string
    isDummy: boolean
  } | null
  disabled?: boolean
  className?: string
}

const DOCUMENT_TYPE_LABELS: Record<DocumentTypeId, string> = {
  ktp: 'KTP / Identitas',
  kartu_keluarga: 'Kartu Keluarga',
  ijazah: 'Ijazah / Sertifikat Pendidikan',
  skck: 'SKCK',
  paspor: 'Paspor',
  foto: 'Foto Formal',
  sertifikat: 'Sertifikat Pelatihan / Keahlian',
}

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png']
const DEFAULT_MAX_SIZE = 3 * 1024 * 1024

export function FileUploader({
  documentType,
  onUpload,
  acceptedTypes = ALLOWED_MIME,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  existingDocument,
  disabled = false,
  className,
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const resetState = useCallback(() => {
    setFile(null)
    setPreviewUrl(null)
    setUploading(false)
    setProgress(0)
    setError(null)
    setSuccess(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const validateFile = (f: File): string | null => {
    if (!acceptedTypes.includes(f.type)) {
      return 'Tipe file tidak didukung. Gunakan PDF, JPG, atau PNG.'
    }
    if (f.size > maxSizeBytes) {
      return `Ukuran file maksimal ${formatBytes(maxSizeBytes)}.`
    }
    return null
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    const validationError = validateFile(selected)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    setSuccess(false)
  }

  const handleRemoveFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    resetState()
  }

  const simulateProgress = () => {
    setProgress(10)
    progressIntervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
          return 90
        }
        return p + Math.random() * 15
      })
    }, 200)
  }

  const handleUpload = async () => {
    if (!file || uploading) return

    setUploading(true)
    setError(null)
    simulateProgress()

    try {
      const result = await onUpload(file)

      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      setProgress(100)

      if (result.ok) {
        setSuccess(true)
        setTimeout(() => {
          resetState()
        }, 1500)
      } else {
        setError(result.error)
        setProgress(0)
      }
    } catch (err) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      setError('Terjadi kesalahan saat mengunggah. Silakan coba lagi.')
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const getStatusIcon = () => {
    if (existingDocument && !file) {
      const status = existingDocument.status
      if (status === 'approved') return <CheckCircle className="h-5 w-5 text-emerald-600" />
      if (status === 'revision_required') return <AlertCircle className="h-5 w-5 text-amber-500" />
      if (status === 'rejected') return <AlertCircle className="h-5 w-5 text-red-600" />
      if (status === 'pending_review') return <Loader2 className="h-5 w-5 text-sky-600 animate-spin" />
    }
    return <FileIcon className="h-5 w-5 text-muted" />
  }

  const getStatusLabel = () => {
    if (existingDocument && !file) {
      const status = existingDocument.status
      if (status === 'approved') return 'Disetujui'
      if (status === 'revision_required') return 'Perlu Revisi'
      if (status === 'rejected') return 'Ditolak'
      if (status === 'pending_review') return 'Menunggu Review'
      if (status === 'uploaded') return 'Telah Diunggah'
    }
    if (file) return 'Siap Diunggah'
    return 'Belum Diunggah'
  }

  const getStatusColor = () => {
    if (existingDocument && !file) {
      const status = existingDocument.status
      if (status === 'approved') return 'border-emerald-300 bg-emerald-50 text-emerald-700'
      if (status === 'revision_required') return 'border-amber-300 bg-amber-50 text-amber-700'
      if (status === 'rejected') return 'border-red-300 bg-red-50 text-red-700'
      if (status === 'pending_review') return 'border-sky-300 bg-sky-50 text-sky-700'
    }
    if (file) return 'border-brand/30 bg-brand-soft/70 text-brand'
    return 'border-dashed border-line bg-slate-50/60 text-muted'
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">{DOCUMENT_TYPE_LABELS[documentType]}</p>
          <p className="text-xs text-muted">
            Versi {existingDocument ? existingDocument.version + 1 : 1}
            {existingDocument && ` • ${existingDocument.fileName} • ${formatBytes(existingDocument.sizeBytes)}`}
          </p>
        </div>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', getStatusColor())}>
          {getStatusIcon()}
          {getStatusLabel()}
        </span>
      </div>

      {file && (
        <div className="rounded-xl border bg-surface p-4 space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              {file.type.startsWith('image/') && previewUrl ? (
                <img src={previewUrl} alt="Preview" className="h-full w-full object-cover rounded-lg" />
              ) : (
                <FileIcon className="h-7 w-7 text-brand" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink truncate">{file.name}</p>
              <p className="text-xs text-muted">{formatBytes(file.size)} • {file.type}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemoveFile}
              disabled={uploading}
              aria-label="Hapus file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} label={`Mengunggah... ${Math.round(progress)}%`} />
              <p className="text-xs text-muted text-center">
                Mohon tunggu, jangan tutup halaman ini.
              </p>
            </div>
          )}

          {!uploading && !success && !error && (
            <Button onClick={handleUpload} className="w-full" disabled={disabled}>
              <Upload className="mr-2 h-4 w-4" />
              Unggah Dokumen
            </Button>
          )}

          {success && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 p-3 text-emerald-700">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Dokumen berhasil diunggah</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-red-50 p-3 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}
        </div>
      )}

      {!file && error && (
        <div
          role="alert"
          className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {!file && !existingDocument && (
        <label
          className={cn(
            'relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 p-6 transition-colors',
            'border-dashed border-line bg-slate-50/60 hover:border-brand/50 hover:bg-brand-soft/30',
            disabled && 'cursor-not-allowed opacity-60'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="absolute inset-0 opacity-0"
            aria-label={`Pilih file untuk ${DOCUMENT_TYPE_LABELS[documentType]}`}
          />
          <Upload className="h-10 w-10 text-muted" />
          <div className="text-center">
            <p className="text-sm font-medium text-ink">Klik atau tarik file ke sini</p>
            <p className="text-xs text-muted">
              PDF, JPG, PNG • Maksimal {formatBytes(maxSizeBytes)}
            </p>
          </div>
        </label>
      )}

      {existingDocument && !file && (
        <div className="rounded-xl border bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <FileIcon className="h-7 w-7 text-muted" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{existingDocument.fileName}</p>
                <p className="text-xs text-muted">
                  v{existingDocument.version} • {formatBytes(existingDocument.sizeBytes)} •{' '}
                  {new Date(existingDocument.uploadedAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={existingDocument.isDummy}>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Lihat
              </Button>
              <Button variant="secondary" size="sm" disabled={existingDocument.isDummy}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Unduh
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted">
            {existingDocument.isDummy
              ? 'Mode demo: file ini adalah data sintetis. Gunakan tombol di atas untuk mengunggah file baru.'
              : 'Klik area di atas untuk mengunggah versi baru.'}
          </p>
          <label
            className={cn(
              'relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 p-4 transition-colors',
              'border-dashed border-line bg-slate-50/60 hover:border-brand/50 hover:bg-brand-soft/30',
              disabled && 'cursor-not-allowed opacity-60'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes.join(',')}
              onChange={handleFileSelect}
              disabled={disabled || uploading}
              className="absolute inset-0 opacity-0"
              aria-label={`Unggah versi baru untuk ${DOCUMENT_TYPE_LABELS[documentType]}`}
            />
            <Upload className="h-8 w-8 text-muted" />
            <div className="text-center">
              <p className="text-sm font-medium text-ink">Unggah Versi Baru</p>
              <p className="text-xs text-muted">
                PDF, JPG, PNG • Maksimal {formatBytes(maxSizeBytes)}
              </p>
            </div>
          </label>
        </div>
      )}
    </div>
  )
}