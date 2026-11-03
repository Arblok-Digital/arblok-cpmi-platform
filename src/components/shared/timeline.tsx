import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type TimelineItem = {
  id: string
  title: ReactNode
  description?: ReactNode
  timestamp?: string
  actor?: string
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'muted'
  icon?: ReactNode
  footer?: ReactNode
}

const dotTone = {
  brand: 'bg-brand text-white ring-brand/10',
  success: 'bg-emerald-600 text-white ring-emerald-100',
  warning: 'bg-amber-500 text-white ring-amber-100',
  danger: 'bg-red-600 text-white ring-red-100',
  muted: 'bg-slate-200 text-slate-600 ring-slate-100',
}

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn('relative', className)}>
      {items.map((item, index) => (
        <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
          {index < items.length - 1 ? (
            <span className="absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-px bg-line" aria-hidden />
          ) : null}
          <span
            className={cn(
              'relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4',
              dotTone[item.tone ?? 'brand'],
            )}
          >
            {item.icon ?? <span className="h-1.5 w-1.5 rounded-full bg-current" />}
          </span>
          <div className="min-w-0 flex-1 pb-0.5">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <p className="text-xs font-bold leading-5 text-ink">{item.title}</p>
              {item.timestamp ? (
                <time className="shrink-0 text-[10px] font-medium text-muted">{item.timestamp}</time>
              ) : null}
            </div>
            {item.description ? (
              <div className="mt-0.5 text-[11px] leading-5 text-slate-600">{item.description}</div>
            ) : null}
            {item.actor ? <p className="mt-1 text-[10px] text-muted">oleh {item.actor}</p> : null}
            {item.footer ? <div className="mt-2">{item.footer}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
