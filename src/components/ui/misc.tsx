import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { initials } from '@/lib/format'

const palettes = [
  'bg-brand text-white',
  'bg-emerald-700 text-white',
  'bg-amber-600 text-white',
  'bg-sky-700 text-white',
  'bg-slate-700 text-white',
  'bg-rose-700 text-white',
]

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}) {
  const idx = name.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) % palettes.length
  const sizes = {
    xs: 'h-6 w-6 text-[9px]',
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-12 w-12 text-sm',
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold tracking-wide',
        palettes[idx],
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

export function Progress({
  value,
  className,
  tone = 'brand',
  label,
}: {
  value: number
  className?: string
  tone?: 'brand' | 'accent' | 'success' | 'warning' | 'danger'
  label?: string
}) {
  const tones = {
    brand: 'bg-brand',
    accent: 'bg-accent',
    success: 'bg-emerald-600',
    warning: 'bg-amber-500',
    danger: 'bg-red-600',
  }
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}
      role="progressbar"
      aria-valuenow={Math.min(100, Math.max(0, value))}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Progres'}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-slate-50/60 px-6 text-center',
        compact ? 'py-8' : 'py-12',
      )}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-muted shadow-sm">
        {icon}
      </div>
      <p className="text-sm font-bold text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs leading-5 text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-line', className)} />
}
