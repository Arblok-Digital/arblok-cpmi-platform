import type { InputHTMLAttributes, ReactNode } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        className="focus-ring h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-slate-400 hover:border-slate-300"
        {...props}
      />
    </div>
  )
}

export function ListCard({
  children,
  className,
  onClick,
  to,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  to?: string
}) {
  if (to) {
    return (
      <a
        href={to}
        className={cn(
          'focus-ring block rounded-xl border border-line bg-surface p-4 transition-colors hover:border-slate-300 hover:bg-slate-50/60',
          className,
        )}
      >
        {children}
      </a>
    )
  }
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-surface p-4',
        onClick && 'cursor-pointer transition-colors hover:border-slate-300 hover:bg-slate-50/60',
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick()
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}

export function MiniBar({
  data,
  className,
}: {
  data: { label: string; value: number; hint?: string }[]
  className?: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className={cn('space-y-3', className)}>
      {data.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
            <span className="truncate font-medium text-slate-600">{row.label}</span>
            <span className="shrink-0 font-bold text-ink">{row.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: `${Math.round((row.value / max) * 100)}%` }}
            />
          </div>
          {row.hint ? <p className="mt-1 text-[10px] text-muted">{row.hint}</p> : null}
        </div>
      ))}
    </div>
  )
}
