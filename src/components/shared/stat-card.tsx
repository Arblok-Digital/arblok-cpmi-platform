import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/misc'

const tones = {
  brand: { icon: 'bg-brand-soft text-brand', ring: 'text-brand', bar: 'brand' as const },
  accent: { icon: 'bg-accent-soft text-accent-deep', ring: 'text-accent-deep', bar: 'accent' as const },
  success: { icon: 'bg-emerald-50 text-emerald-700', ring: 'text-emerald-700', bar: 'success' as const },
  warning: { icon: 'bg-amber-50 text-amber-700', ring: 'text-amber-700', bar: 'warning' as const },
  danger: { icon: 'bg-red-50 text-red-700', ring: 'text-red-700', bar: 'danger' as const },
  slate: { icon: 'bg-slate-100 text-slate-600', ring: 'text-slate-600', bar: 'brand' as const },
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
  to,
  progress,
  trend,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: ReactNode
  tone?: keyof typeof tones
  to?: string
  progress?: number
  trend?: string
  className?: string
}) {
  const style = tones[tone]
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', style.icon)}>
          {icon}
        </div>
        {trend ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600">
            <TrendingUp className="h-3 w-3" /> {trend}
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">{value}</p>
      {typeof progress === 'number' ? <Progress value={progress} className="mt-3" tone={style.bar} /> : null}
      {hint ? <p className="mt-2 text-[11px] leading-4 text-muted">{hint}</p> : null}
      {to ? (
        <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-brand">
          Lihat detail <ArrowRight className="h-3 w-3" />
        </span>
      ) : null}
    </>
  )

  if (to) {
    return (
      <Link
        to={to}
        className={cn('card card-hover focus-ring block p-4 sm:p-5', className)}
      >
        {body}
      </Link>
    )
  }
  return <div className={cn('card p-4 sm:p-5', className)}>{body}</div>
}
