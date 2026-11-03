import { cn } from '@/lib/utils'

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { id: T; label: string; count?: number }[]
  value: T
  onChange: (id: T) => void
  className?: string
}) {
  return (
    <div className={cn('no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'focus-ring flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
            value === tab.id
              ? 'bg-brand text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-ink',
          )}
        >
          {tab.label}
          {typeof tab.count === 'number' ? (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                value === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600',
              )}
            >
              {tab.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
  className?: string
}) {
  return (
    <div className={cn('inline-flex rounded-xl border border-line bg-slate-50 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
            value === o.id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
