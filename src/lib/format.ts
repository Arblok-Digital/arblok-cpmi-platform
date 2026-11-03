const TZ = 'Asia/Jakarta'

export function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TZ,
  })
}

export function formatDateLong(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TZ,
  })
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  })
}

export function formatTime(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  })
}

export function formatRelative(iso?: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const abs = Math.abs(diff)
  const mins = Math.round(abs / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} menit ${diff >= 0 ? 'lalu' : 'lagi'}`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} jam ${diff >= 0 ? 'lalu' : 'lagi'}`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} hari ${diff >= 0 ? 'lalu' : 'lagi'}`
  return formatDate(iso)
}

export function formatCurrency(amount: number, currency = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`
  if (digits.startsWith('8')) digits = `62${digits}`
  return digits
}

export function maskPhone(phone: string): string {
  const n = normalizePhone(phone)
  if (n.length < 8) return phone
  return `+${n.slice(0, 4)} •••• ${n.slice(-4)}`
}

export function isToday(iso?: string): boolean {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  return (
    d.toLocaleDateString('id-ID', { timeZone: TZ }) ===
    now.toLocaleDateString('id-ID', { timeZone: TZ })
  )
}

export function startOfDayIso(iso: string): string {
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function addDays(days: number, from = new Date()): Date {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d
}

export function atHour(date: Date, hour: number, minute = 0): Date {
  const d = new Date(date)
  d.setHours(hour, minute, 0, 0)
  return d
}

export function toLocalInputValue(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function statusTone(tone: string): string {
  switch (tone) {
    case 'success':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'warning':
      return 'bg-amber-50 text-amber-800 border-amber-200'
    case 'danger':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'info':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

export function percent(part: number, total: number): number {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

export function diffDays(iso: string, from = new Date()): number {
  return Math.ceil((new Date(iso).getTime() - from.getTime()) / 86400000)
}
