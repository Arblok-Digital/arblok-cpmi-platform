import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { statusTone } from '@/lib/format'

export type BadgeTone = 'info' | 'warning' | 'success' | 'danger' | 'muted' | 'brand' | 'accent'

const tones: Record<BadgeTone, string> = {
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  muted: 'bg-slate-100 text-slate-600 border-slate-200',
  brand: 'bg-brand-soft text-brand border-brand/15',
  accent: 'bg-accent-soft text-accent-deep border-amber-200',
}

export function Badge({
  tone = 'muted',
  children,
  icon,
  className,
  dot,
}: {
  tone?: BadgeTone
  children: ReactNode
  icon?: ReactNode
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none',
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden /> : null}
      {icon}
      <span className="truncate">{children}</span>
    </span>
  )
}

export function ToneBadge({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none',
        statusTone(tone),
      )}
    >
      {children}
    </span>
  )
}
